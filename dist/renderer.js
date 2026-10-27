'use strict';
// Keep text in native HTML line boxes. The visible preview and export mount use
// the same 1125 px layout; only the final SVG rasterization changes resolution.
window.ChatRenderer = (() => {
  const WIDTH=1125, PHONE_HEIGHT=2436;
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg=(path,cls='',viewBox='0 0 24 24')=>`<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" aria-hidden="true"><path d="${path}"/></svg>`;
  const voice=svg('M7 10a3 3 0 0 1 0 4 M10 7a7 7 0 0 1 0 10 M13 4a11 11 0 0 1 0 16','','5 2 16 20');
  function titleParts(snapshot){
    const title=String(snapshot.title||'微信');const count=snapshot.settings.group?snapshot.people.length:0;
    if(!count)return {name:title,count:0};
    // Older drafts sometimes already include a member count in the title.
    const suffix=/\s*[（(](\d{1,3})[）)]\s*$/.exec(title);
    const name=suffix&&Number(suffix[1])<=400?title.slice(0,suffix.index):title;
    return {name,count};
  }
  function create(snapshot,avatarURL) {
    const s=snapshot.settings;
    const root=document.createElement('div');root.className='chat-screen';root.lang='zh-CN';
    root.style.setProperty('--chat-bg',s.bg);root.style.setProperty('--other-bubble',s.otherColor);root.style.setProperty('--self-bubble',s.selfColor);root.style.setProperty('--chat-font-size',`${s.fontSize*3}px`);root.style.setProperty('--chat-text-inset',`${(s.bubblePadding??12)*3}px`);
    const status=s.showStatus?StatusBar.render(s):'';
    const title=titleParts(snapshot);
    const header=`<div class="chat-top">${status}<div class="chat-nav"><div class="chat-nav-left">${svg('m10 3-8 9 8 9','','0 0 12 24')}</div><div class="chat-nav-center"><span class="chat-nav-label">${escape(title.name)}</span>${title.count?`<span class="chat-member-count">(${title.count})</span>`:''}</div><div class="chat-nav-right"><i></i><i></i><i></i></div></div></div>`;
    const rows=snapshot.messages.map(m=>{
      if(['time','system'].includes(m.type))return `<div class="chat-notice" data-chat-message="${escape(m.id)}"><span>${escape(m.content||' ')}</span></div>`;
      const p=snapshot.people.find(p=>p.id===m.sender)||snapshot.people[0];const self=p.id===snapshot.selfId;
      let content='';const arrow='<i class="chat-arrow"></i>';
      if(ChainMessage.isChain(m)){const body=ChainMessage.body(m.content);content=`<div class="chat-bubble chat-text-bubble chat-chain-bubble">${arrow}<span class="chat-text"><span class="chat-chain-heading">#接龙</span>${body?'\n':''}<span class="chat-chain-body">${escape(body)}</span></span></div>`;}
      else if(m.type==='text')content=`<div class="chat-bubble chat-text-bubble">${arrow}<span class="chat-text">${escape(m.content||' ')}</span></div>`;
      else if(m.type==='image')content=`<div class="chat-bubble chat-image-bubble">${m.image?`<img src="${m.image}" alt="聊天图片">`:'<div class="chat-image-placeholder">点击上传图片</div>'}</div>`;
      else if(m.type==='voice'){const duration=`<span class="voice-duration">${m.duration||8}″</span>`;content=`<div class="chat-bubble chat-voice" style="width:${180+Math.min((m.duration||8)*30,400)}px">${arrow}${self?duration+voice:voice+duration}</div>`;}
      else {const transfer=m.type==='transfer';const symbol=transfer?svg('M3 7h18l-5-4 M21 17H3l5 4'):svg('M4 3h16v18H4Z M4 7l8 6 8-6 M12 11v5');const title=transfer?`¥${Number(m.amount||88).toFixed(2)}`:m.content||'恭喜发财，大吉大利';const subtitle=transfer?m.content||'转账给你':'';content=`<div class="chat-bubble chat-money">${arrow}<div class="chat-money-main"><div class="chat-money-symbol">${symbol}</div><div class="chat-money-info"><span>${escape(title)}</span>${subtitle?`<small>${escape(subtitle)}</small>`:''}</div></div><div class="chat-money-bottom">${transfer?'微信转账':'微信红包'}</div></div>`;}
      return `<div class="chat-row ${self?'is-self':''}" data-chat-message="${escape(m.id)}"><img class="chat-face" src="${avatarURL(p)}" alt="${escape(p.name)}的头像"><div class="chat-message-body">${s.group&&!self?`<div class="chat-nickname">${escape(p.name)}</div>`:''}${content}</div></div>`;
    }).join('');
    const bottom=s.showBottom?`<div class="chat-bottom"><div class="chat-bottom-controls"><span class="chat-bottom-icon">${svg('M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20 M9 8v8 M13 8a5 5 0 0 1 0 8')}</span><span class="chat-input-box"></span><span class="chat-bottom-icon">${svg('M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20 M8 9h.01 M16 9h.01 M7 14a5 5 0 0 0 10 0')}</span><span class="chat-bottom-icon">${svg('M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20 M7 12h10 M12 7v10')}</span></div><div class="chat-home"><i></i></div></div>`:'';
    root.innerHTML=header+`<div class="chat-body"><div class="chat-content">${rows}</div></div>`+bottom;
    return root;
  }
  async function ready(root) {
    await document.fonts.ready;
    await Promise.all([...root.querySelectorAll('img')].map(async img=>{try{await img.decode();}catch{throw new Error('图片读取失败，请重新选择图片。');}}));
  }
  // A max-width bubble can leave a whole unused character cell at the right
  // after the browser moves punctuation or an emoji onto the next line. Measure
  // the actual HTML line fragments and remove only that unused outer space.
  function fitTextBubbles(root) {
    const scale=root.getBoundingClientRect().width/WIDTH;
    if(!scale)return;
    for(const text of root.querySelectorAll('.chat-text')) {
      const bubble=text.parentElement;bubble.style.width='';
      const style=getComputedStyle(bubble),lineHeight=parseFloat(style.lineHeight),paddingTop=parseFloat(style.paddingTop),paddingRight=parseFloat(style.paddingRight);
      const metrics=()=>{
        const box=bubble.getBoundingClientRect();let right=box.left;const lines=new Set();
        const walker=document.createTreeWalker(text,NodeFilter.SHOW_TEXT);const range=document.createRange();let node;
        while((node=walker.nextNode()))for(const match of node.textContent.matchAll(/\S+/gu)) {
          range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);
          for(const rect of range.getClientRects())if(rect.width>0){right=Math.max(right,rect.right);lines.add(Math.round(((rect.top-box.top)/scale-paddingTop)/lineHeight));}
        }
        return {width:box.width/scale,used:(right-box.left)/scale+paddingRight,lineCount:lines.size};
      };
      const before=metrics();if(!before.lineCount)continue;
      const target=Math.min(before.width,Math.ceil(before.used-.01));
      if(before.width-target<.25)continue;
      bubble.style.width=target+'px';
      if(metrics().lineCount>before.lineCount){
        // Font fallback and glyph overhang must never introduce an extra line.
        let low=target,high=before.width;
        for(let i=0;i<10&&high-low>.25;i++){const middle=(low+high)/2;bubble.style.width=middle+'px';if(metrics().lineCount>before.lineCount)low=middle;else high=middle;}
        bubble.style.width=Math.min(before.width,Math.ceil(high))+'px';
      }
    }
  }
  function measure(root,settings) {
    fitTextBubbles(root);
    const needed=root.querySelector('.chat-top').offsetHeight+root.querySelector('.chat-content').offsetHeight+(root.querySelector('.chat-bottom')?.offsetHeight||0);
    const height=settings.frame==='long'?Math.max(PHONE_HEIGHT,Math.ceil(needed)):PHONE_HEIGHT;
    root.style.height=height+'px';root.dataset.nativeHeight=height;
    return {height,needed,width:WIDTH};
  }
  async function forExport(snapshot,avatarURL) {
    const host=document.createElement('div');host.className='chat-export-host';host.setAttribute('aria-hidden','true');
    const node=create(snapshot,avatarURL);host.append(node);document.body.append(host);
    try{await ready(node);const plan=measure(node,snapshot.settings);return{node,plan,dispose:()=>host.remove()};}catch(error){host.remove();throw error;}
  }
  async function toBlob(node,scale) {
    const width=Math.round(WIDTH*scale/3),height=Math.round(Number(node.dataset.nativeHeight)*scale/3);
    if(height>32000||width*height>80000000)throw new Error('图片过长，请选择 1125 px 或更低的导出尺寸。');
    const canvas=await htmlToImage.toCanvas(node,{width:WIDTH,height:Number(node.dataset.nativeHeight),canvasWidth:width,canvasHeight:height,pixelRatio:1,skipAutoScale:true,skipFonts:true,fontEmbedCSS:'',backgroundColor:getComputedStyle(node).backgroundColor,style:{transform:'none',transformOrigin:'0 0'},onImageErrorHandler:()=>{throw new Error('图片读取失败，请重新上传后导出。');}});
    if(canvas.width!==width||canvas.height!==height)throw new Error('浏览器未能生成完整尺寸，请选择较低的导出尺寸。');
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));canvas.width=canvas.height=0;
    if(!blob)throw new Error('生成失败，请降低导出尺寸后重试。');return blob;
  }
  return {create,ready,measure,forExport,toBlob};
})();
