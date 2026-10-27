"""Collect 400 square photo avatars with provenance and perceptual deduplication.

Sources: Lorem Picsum's documented image catalog, photographed for Unsplash.
Run manually with network access; the production tool serves only local assets.
"""
import concurrent.futures
import hashlib
import io
import json
import math
from pathlib import Path
import random
import time
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageStat
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'dist' / 'avatars'
OUT.mkdir(parents=True, exist_ok=True)
HEADERS = {'User-Agent': 'ChatStudioAvatarCollection/1.0 (image asset preparation)'}


def request(url):
    for attempt in range(3):
        try:
            response = requests.get(url, headers=HEADERS, timeout=25)
            response.raise_for_status()
            return response
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(attempt + 1)


def catalog(page):
    return request(f'https://picsum.photos/v2/list?page={page}&limit=100').json()


def phash(image):
    pixels = np.asarray(image.convert('L').resize((32, 32)), dtype=float)
    x = np.arange(32)
    matrix = np.cos(np.pi * (2*x[None, :] + 1) * x[:, None] / 64)
    low = (matrix @ pixels @ matrix.T)[:8, :8].flatten()[1:]
    bits = low > np.median(low)
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)
    return value


def fetch(item):
    try:
        response = request(f"https://picsum.photos/id/{item['id']}/512/512.jpg")
        image = Image.open(io.BytesIO(response.content)).convert('RGB')
        if image.size != (512, 512) or ImageStat.Stat(image.convert('L')).stddev[0] < 16:
            return None
        fingerprint = phash(image)
        encoded = io.BytesIO()
        image.save(encoded, 'JPEG', quality=91, optimize=True)
        return item, image, encoded.getvalue(), fingerprint
    except Exception as error:
        print(f"skip source {item['id']}: {type(error).__name__}", flush=True)
        return None


def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        catalog_pages = list(executor.map(catalog, range(1, 12)))
    entries = {item['id']: item for page in catalog_pages for item in page}
    items = list(entries.values())
    random.Random(20261027).shuffle(items)
    records, hashes, pixel_hashes, rejected = [], [], set(), 0
    # Work in bounded batches instead of downloading the entire source catalog.
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
        for offset in range(0, len(items), 40):
            for result in executor.map(fetch, items[offset:offset+40]):
                if result is None:
                    continue
                item, image, encoded, fingerprint = result
                pixel_hash = hashlib.sha256(image.tobytes()).hexdigest()
                if pixel_hash in pixel_hashes or any((fingerprint ^ h).bit_count() < 8 for h in hashes):
                    rejected += 1
                    continue
                index = len(records) + 1
                name = f'avatar-{index:04d}.jpg'
                (OUT / name).write_bytes(encoded)
                records.append({'id': index, 'file': name, 'author': item['author'], 'source': item['url'], 'catalogId': item['id'], 'license': 'https://unsplash.com/license', 'sha256': hashlib.sha256(encoded).hexdigest(), 'pixelSha256': pixel_hash, 'pHash': f'{fingerprint:016x}', 'width': 512, 'height': 512})
                hashes.append(fingerprint)
                pixel_hashes.add(pixel_hash)
                if index % 40 == 0:
                    print(f'collected {index}/400; similar images excluded: {rejected}', flush=True)
                if index == 400:
                    break
            if len(records) == 400:
                break
    if len(records) != 400:
        raise RuntimeError(f'Only {len(records)} unique avatars collected')
    manifest = {'version': 1, 'count': 400, 'source': 'https://picsum.photos/', 'license': 'https://unsplash.com/license', 'perceptualHashMinimumDistance': min((a ^ b).bit_count() for i, a in enumerate(hashes) for b in hashes[i+1:]), 'similarImagesExcluded': rejected, 'avatars': records}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    license_text = '''400 个混合照片头像 / Mixed photo avatars

照片来自 Lorem Picsum 的公开目录，摄影作品来源为 Unsplash。
每张照片的摄影师、原图地址和校验值见 manifest.json。

Unsplash License: https://unsplash.com/license
Lorem Picsum: https://picsum.photos/

Unsplash permits downloading, copying, modifying, distributing and using these
images, including commercial use, subject to the Unsplash License. Do not sell
the unmodified images or compile them to replicate a competing stock service.
Photography credits are retained in manifest.json. No photographer endorses
this tool. Pictures are used as generic visual placeholders.
'''
    (OUT / 'CREDITS.txt').write_text(license_text)
    # A standalone visual index is useful when the pack is used outside the app.
    tiles = ''.join(f'<figure><img loading="lazy" src="{r["file"]}" alt="头像 {r["id"]}"><figcaption>{r["id"]:04d}</figcaption></figure>' for r in records)
    (OUT / 'index.html').write_text('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>400 个混合照片头像</title><style>body{font:14px sans-serif;background:#f7f8f5;color:#34452d;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:12px}figure{margin:0;text-align:center}img{width:100%;aspect-ratio:1;border-radius:12px}figcaption{padding:5px}a{color:inherit}</style><h1>400 个不同头像</h1><p>512 × 512 · 人像、动物、风景、城市与生活照片 · <a href="CREDITS.txt">图片来源及使用说明</a></p><main>'+tiles+'</main>')
    archive = ROOT / 'dist' / 'wechat-avatars-400.zip'
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as package:
        for file in sorted(OUT.iterdir()):
            package.write(file, 'wechat-avatars-400/'+file.name)
    contact = Image.new('RGB', (1400, 1600), '#f7f8f5')
    draw = ImageDraw.Draw(contact)
    for i, record in enumerate(records):
        x, y = (i % 20)*70, (i // 20)*80
        contact.paste(Image.open(OUT/record['file']).resize((64, 64)), (x+3, y))
        draw.text((x+21, y+65), str(i+1).zfill(3), fill='#34452d')
    qa = ROOT / 'qa' / 'results'
    qa.mkdir(parents=True, exist_ok=True)
    contact.save(qa/'avatars-contact-sheet.jpg', quality=93)
    print(json.dumps({'count': len(records), 'minimumPerceptualDistance': manifest['perceptualHashMinimumDistance'], 'similarImagesExcluded': rejected, 'archiveBytes': archive.stat().st_size}), flush=True)


if __name__ == '__main__':
    main()
