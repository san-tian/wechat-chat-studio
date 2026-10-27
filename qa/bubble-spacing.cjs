const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1200}});await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8765');await page.waitForSelector('.chat-text');
    const results=await page.evaluate(async()=>{
      const avatar=document.querySelector('.chat-face').src;
      const texts=['你好','这是一条中文测试消息','好呀！是你上次说的那个展吗？','对！听说现场特别好看，\n我已经开始期待了。','周末有空吗？一起去看展吧 🌿','A long English message, with numbers 1234567890 and punctuation.','测试  文字左右留空','123456789012345678901234567890'];
      const results=[];
      for(const size of [14,16,20])for(const padding of [8,12,18])for(const self of [false,true])for(const text of texts) {
        const settings={fontSize:size,bubblePadding:padding,frame:'phone',showStatus:false,showBottom:false,bg:'#ededed',selfColor:'#95ec69',otherColor:'#fff'};
        const snapshot={title:'留白校准',people:[{id:'p',name:'测试'}],selfId:self?'p':'other',settings,messages:[{id:'m',sender:'p',type:'text',content:text}]};
        const capture=await ChatRenderer.forExport(snapshot,()=>avatar);const bubble=capture.node.querySelector('.chat-text-bubble');
        const metrics=()=>{const box=bubble.getBoundingClientRect(),scale=capture.node.getBoundingClientRect().width/1125;const style=getComputedStyle(bubble);let left=Infinity,right=-Infinity;const node=bubble.querySelector('.chat-text').firstChild;const range=document.createRange();
          for(const part of new Intl.Segmenter('zh',{granularity:'grapheme'}).segment(node.textContent))if(!/^\s+$/u.test(part.segment)){range.setStart(node,part.index);range.setEnd(node,part.index+part.segment.length);for(const r of range.getClientRects()){left=Math.min(left,r.left);right=Math.max(right,r.right);}}
          return{width:box.width/scale,left:(left-box.left)/scale,right:(box.right-right)/scale,lines:Math.round((box.height/scale-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom))/parseFloat(style.lineHeight))};};
        const after=metrics();bubble.style.width='';const before=metrics();ChatRenderer.measure(capture.node,settings);
        capture.node.parentElement.style.transform='scale(.266666667)';ChatRenderer.measure(capture.node,settings);const scaled=metrics();
        results.push({size,padding,self,text,before,after,scaled});capture.dispose();
      }
      return results;
    });
    for(const row of results){assert.equal(row.after.lines,row.before.lines,JSON.stringify(row));assert.ok(Math.abs(row.after.left-row.padding*3)<1.1,JSON.stringify(row));assert.ok(Math.abs(row.after.right-row.padding*3)<1.1,JSON.stringify(row));assert.ok(Math.abs(row.scaled.width-row.after.width)<1.1,JSON.stringify(row));}
    const out=path.resolve(__dirname,'results');await fs.mkdir(out,{recursive:true});await fs.writeFile(path.join(out,'bubble-spacing.json'),JSON.stringify(results,null,2));
    console.log(JSON.stringify({fixtures:results.length,passed:true,example:results.find(r=>r.size===16&&r.padding===12&&!r.self&&r.text.startsWith('好呀'))},null,2));
    await page.locator('[data-tab="settings"]').click();await page.locator('#bubble-padding').fill('10');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.chat-text-bubble')).paddingLeft==='30px');await page.waitForTimeout(400);await page.reload();await page.waitForSelector('.chat-text');await page.locator('[data-tab="settings"]').click();assert.equal(await page.locator('#bubble-padding').inputValue(),'10');assert.equal(await page.locator('.chat-text-bubble').first().evaluate(e=>getComputedStyle(e).paddingRight),'30px');console.log('Padding control updates preview and persists after reload');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
