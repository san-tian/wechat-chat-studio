// Run with PLAYWRIGHT_MODULE=/path/to/playwright CHROME_PATH=/path/to/chrome node qa/browser-check.cjs
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const base=process.env.PREVIEW_URL || 'http://127.0.0.1:8765';
const out=path.resolve(__dirname,'results');
const checks=[];
async function download(page,selector,name){const event=page.waitForEvent('download');await page.locator(selector).click();const file=await event;const target=path.join(out,name);await file.saveAs(target);return fs.readFile(target);}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const pngSize=b=>({width:b.readUInt32BE(16),height:b.readUInt32BE(20)});
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1200}});
    const page=await context.newPage();const errors=[];const requests=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
    await page.goto(base);await page.waitForFunction(()=>document.querySelector('.chat-screen')?.dataset.nativeHeight === '2436');
    assert.equal(await page.locator('[data-message]').count(),6);checks.push('Native HTML preview uses 1125 × 2436 layout');
    await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true});
    const png=await download(page,'#export-image','sample-chat.png');assert.deepEqual(pngSize(png),{width:2250,height:4872});
    const nativeContext=await browser.newContext({viewport:{width:1125,height:2436},deviceScaleFactor:2});const native=await nativeContext.newPage();
    const rootHTML=await page.locator('.chat-screen').evaluate(el=>el.outerHTML);
    await native.route(base+'/native-fixture',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><link rel="stylesheet" href="${base}/chat.css"><style>body{margin:0}</style><body>${rootHTML}</body></html>`}));
    await native.goto(base+'/native-fixture');await native.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));});
    const screenshot=await native.screenshot({path:path.join(out,'native-dom-2x.png')});
    const difference=await native.evaluate(async ({exported,reference})=>{const buffers=await Promise.all([exported,reference].map(async encoded=>{const img=new Image();img.src='data:image/png;base64,'+encoded;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);return x.getImageData(0,0,c.width,c.height).data;}));let total=0,changed=0;for(let i=0;i<buffers[0].length;i++){const d=Math.abs(buffers[0][i]-buffers[1][i]);total+=d;if(d)changed++;}return {mean:total/buffers[0].length,changedFraction:changed/buffers[0].length};},{exported:png.toString('base64'),reference:screenshot.toString('base64')});
    assert.ok(difference.mean<1,JSON.stringify(difference));await nativeContext.close();checks.push('2250 px PNG matches native DOM screenshot at 2x device resolution');
    const font=await page.locator('.chat-text').first().evaluate(el=>{const s=getComputedStyle(el);const b=getComputedStyle(el.parentElement);return {style:s.fontStyle,weight:s.fontWeight,size:s.fontSize,lineHeight:s.lineHeight,padding:b.padding,transform:s.transform};});
    assert.deepEqual(font,{style:'normal',weight:'400',size:'48px',lineHeight:'67.2px',padding:'28px 36px',transform:'none'});checks.push('Normal font style, original line-height and symmetric 12 px text insets');
    const fractional=await page.evaluate(async()=>{const avatar=document.querySelector('.chat-face').src;const snapshot={title:'非整数比例长图',selfId:'a',people:[{id:'a',name:'我'}],messages:[{id:'fractional',sender:'a',type:'text',content:'中'.repeat(380)}],settings:{frame:'long',fontSize:17,showStatus:true,showBottom:true,time:'12:02',battery:87,bg:'#ededed',selfColor:'#95ec69',otherColor:'#ffffff'}};const capture=await ChatRenderer.forExport(snapshot,()=>avatar);try{const blob=await ChatRenderer.toBlob(capture.node,1);const image=await createImageBitmap(blob);const result={native:capture.plan.height,width:image.width,height:image.height};image.close();return result;}finally{capture.dispose();}});assert.notEqual(fractional.native%3,0);assert.equal(fractional.width,375);assert.equal(fractional.height,Math.round(fractional.native/3));checks.push('Lightweight long export rounds fractional pixel dimensions correctly');
    await page.locator('#export-scale').selectOption('3');const original=await download(page,'#export-image','original-size.png');assert.deepEqual(pngSize(original),{width:1125,height:2436});checks.push('Original reference-size PNG export');
    await page.locator('#export-scale').selectOption('6');
    await page.locator('#title').fill('周末计划');await page.locator('#message-content').fill('中文换行测试\n第二行 👨‍👩‍👧‍👦 ✅');await pause(200);
    assert.match(await page.locator('.message-item.selected').innerText(),/第二行/);checks.push('Live text editing, line breaks and emoji');
    const before=await page.locator('.message-item.selected').getAttribute('data-message');await page.locator('.message-item.selected [data-move="1"]').click();assert.equal(await page.locator('[data-message]').nth(2).getAttribute('data-message'),before);checks.push('Message reordering');
    const buffer=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=160;const x=c.getContext('2d');x.fillStyle='#69a9a0';x.fillRect(0,0,320,160);x.fillStyle='#fff';x.font='30px sans-serif';x.fillText('UPLOAD TEST',30,90);return c.toDataURL('image/png').split(',')[1];}),'base64');
    await page.locator('[data-tab="people"]').click();await page.locator('[data-avatar]').first().setInputFiles({name:'avatar.png',mimeType:'image/png',buffer});await page.waitForFunction(()=>document.querySelector('.person-avatar img').src.startsWith('data:image/png'));
    await page.locator('[data-name]').first().fill('小林同学');await page.locator('#add-person').click();assert.equal(await page.locator('[data-person]').count(),3);checks.push('Avatar upload, nickname edit, adding participants');
    await page.locator('[data-tab="messages"]').click();await page.locator('#add-message').click();await page.locator('#message-type').selectOption('image');await page.locator('#message-image').setInputFiles({name:'landscape.png',mimeType:'image/png',buffer});await page.waitForFunction(()=>document.querySelector('#image-name').textContent.includes('已选择'));
    checks.push('Image upload rendered in conversation');
    await page.locator('#add-message').click();await page.locator('#message-type').selectOption('transfer');await page.locator('#transfer-amount').fill('128.50');await page.locator('#message-content').fill('看展门票');
    assert.match(await page.locator('.message-item.selected').innerText(),/128.50/);
    await page.locator('#add-message').click();await page.locator('#message-type').selectOption('redpacket');await page.locator('#message-content').fill('周末快乐');checks.push('Transfer and red packet visual styles');
    await page.locator('#delete-message').click();assert.equal(await page.locator('[data-message]').count(),8);checks.push('Delete message');
    await page.locator('#batch-open').click();const batch='[今天 14:00]\n'+Array.from({length:24},(_,i)=>`${i%2?'我':'小林同学'}：第 ${i+1} 条长图消息，检查完整导出。`).join('\n');await page.locator('#batch-text').fill(batch);await page.locator('#batch-apply').click();assert.equal(await page.locator('[data-message]').count(),33);await page.waitForFunction(()=>!document.querySelector('#overflow-note').hidden);checks.push('Batch input and visible overflow warning');
    await page.locator('#use-long').click();await page.waitForFunction(()=>Number(document.querySelector('.chat-screen').dataset.nativeHeight)>2436);await pause(200);
    const long=await download(page,'#export-image','long-chat.png');const longSize=pngSize(long);assert.equal(longSize.width,2250);assert.ok(longSize.height>2436);assert.equal(longSize.height,await page.locator('.chat-screen').evaluate(c=>Number(c.dataset.nativeHeight)*2));checks.push('Full long PNG includes all 33 messages');
    await page.locator('#export-scale').selectOption('2');const two=await download(page,'#export-image','long-chat-2x.png');assert.equal(pngSize(two).width,750);checks.push('2x resolution export');
    const draft=JSON.parse((await download(page,'#download-project','project.json')).toString());assert.equal(draft.messages.length,33);assert.ok(draft.people[0].avatar.startsWith('data:image/png'));assert.equal(draft.messages[draft.messages.length-1].content,'第 24 条长图消息，检查完整导出。');checks.push('JSON draft preserves avatars and final message');
    await pause(450);await page.reload();await page.waitForFunction(()=>!!document.querySelector('.chat-screen')?.dataset.nativeHeight);assert.equal(await page.locator('#title').inputValue(),'周末计划');assert.equal(await page.locator('[data-message]').count(),33);checks.push('Browser persistence after reload');
    const imported={...draft,title:'导入成功 <script>',messages:[{id:'bad-id',type:'text',sender:draft.selfId,content:'<script>alert(1)</script> & 你好'}]};await page.locator('#project-file').setInputFiles({name:'draft.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(imported))});await page.locator('#confirm-ok').click();assert.equal(await page.locator('[data-message]').count(),1);assert.match(await page.locator('.message-excerpt').textContent(),/<script>/);assert.equal(await page.locator('.message-list script').count(),0);checks.push('Draft import and safe literal text rendering');
    await page.locator('[data-tab="settings"]').click();await page.locator('#group-mode').check();await page.locator('#show-status').uncheck();await page.locator('#show-bottom').uncheck();await page.locator('#font-size').fill('19');await page.locator('#bg-color').fill('#dcecff');checks.push('Group mode, visibility, font and background controls');
    const mobileContext=await browser.newContext({viewport:{width:390,height:844}});const mobile=await mobileContext.newPage();await mobile.goto(base);await mobile.waitForFunction(()=>document.querySelector('.chat-screen')?.dataset.nativeHeight === '2436');assert.equal(await mobile.evaluate(()=>innerWidth),390);assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:path.join(out,'mobile.png'),fullPage:true});await mobile.setViewportSize({width:320,height:740});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobileContext.close();checks.push('390 px and 320 px mobile layouts without horizontal overflow');
    assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:')));checks.push('No page errors or external content requests');
    const result={passed:checks.length,checks,defaultExport:pngSize(png),longExport:longSize,consoleErrors:errors,nativeScreenshotDifference:difference};await fs.writeFile(path.join(out,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await context.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
