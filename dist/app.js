'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const ICONS = {
    chat:'M21 11.5a8.4 8.4 0 0 1-9 8.4 10 10 0 0 1-3.8-.7L3 21l1.8-4.8a8.2 8.2 0 0 1-1.3-4.7 8.5 8.5 0 0 1 17 0Z M8 11.5h.01 M12 11.5h.01 M16 11.5h.01',
    users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    sliders:'M4 5h16 M4 12h16 M4 19h16 M8 2v6 M16 9v6 M9 16v6',
    download:'M12 3v12 M7 10l5 5 5-5 M4 16v5h16v-5',
    upload:'M12 16V4 M7 9l5-5 5 5 M4 16v5h16v-5',
    folder:'M3 7V4h6l2 3h10v14H3Z M8 14h8 M12 10v8',
    list:'M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01',
    edit:'m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5',
    plus:'M12 5v14 M5 12h14', x:'m6 6 12 12 M6 18 18 6',
    trash:'M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    image:'M3 3h18v18H3Z M3 16l5-5 5 5 4-4 4 4 M8 7h.01',
    check:'m5 12 4 4L19 6', lock:'M5 10h14v11H5Z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    pointer:'m4 3 6 18 3-7 7-3Z M13 14l6 6',
    info:'M12 11v6 M12 7h.01 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    up:'m6 15 6-6 6 6', down:'m6 9 6 6 6-6',
    clock:'M12 7v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    camera:'M3 7h4l2-3h6l2 3h4v14H3Z M16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
  };
  function icon(name) {return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.chat}"/></svg>`;}
  function icons(root = document) {root.querySelectorAll('[data-icon]').forEach(el => {if (!el.querySelector('svg')) el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon));});}
  function escape(s) {return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const STORAGE = 'wechat-chat-studio-v1';
  const defaultSettings = {...StatusBar.normalize({}),time:'12:02',chatDate:ConversationTime.today(),chatTime:'12:02',chatTimeFormat:'date',chatTimeCustom:'',battery:87,showStatus:true,showBottom:true,group:false,bg:'#ededed',selfColor:'#95ec69',otherColor:'#ffffff',fontSize:16,bubblePadding:12,frame:'phone'};
  const initial = () => ({version:1,title:'小林',selfId:'me',people:[{id:'lin',name:'小林',avatar:null,theme:0},{id:'me',name:'我',avatar:null,theme:1}],settings:{...defaultSettings},messages:[
    {id:uid(),type:'time',content:'今天 12:02',timestamp:defaultSettings.chatDate+'T12:02',timeFormat:'relative',sender:'lin'},
    {id:uid(),type:'text',content:'周末有空吗？一起去看展吧 🌿',sender:'lin'},
    {id:uid(),type:'text',content:'好呀！是你上次说的那个展吗？',sender:'me'},
    {id:uid(),type:'text',content:'对！听说现场特别好看，\n我已经开始期待了。',sender:'lin'},
    {id:uid(),type:'voice',content:'',duration:8,sender:'lin'},
    {id:uid(),type:'text',content:'那就说定啦，周六下午见 😊',sender:'me'}
  ]});
  const TYPES = ['text','chain','image','voice','time','system','transfer','redpacket'];
  const dataImage = value => typeof value === 'string' && value.length <= 14000000 && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : null;
  function validate(value) {
    if (!value || value.version !== 1 || !Array.isArray(value.people) || !Array.isArray(value.messages) || !value.people.length || value.people.length > 400 || value.messages.length > 500) throw new Error('草稿格式无效：需要 1–400 个人物，最多 500 条消息。');
    const people = value.people.map((p, i) => ({id:String(p.id || `person-${i}`).slice(0,80),name:String(p.name || '未命名').slice(0,64),avatar:dataImage(p.avatar),avatarId:AvatarPool.valid(p.avatarId)?p.avatarId:null,theme:Math.abs(Number(p.theme)||i)%4}));
    if (new Set(people.map(p=>p.id)).size !== people.length) throw new Error('草稿中存在重复人物。');
    const ids = new Set(people.map(p=>p.id));
    const settings = {...defaultSettings}; const src = value.settings || {};Object.assign(settings,StatusBar.normalize(src));
    for (const key of ['showStatus','showBottom','group']) if (typeof src[key] === 'boolean') settings[key] = src[key];
    for (const key of ['bg','selfColor','otherColor']) if (/^#[a-f\d]{6}$/i.test(src[key])) settings[key] = src[key];
    settings.time = String(src.time || '12:02').slice(0,12);
    settings.chatDate = ConversationTime.day(src.chatDate)?src.chatDate:defaultSettings.chatDate;
    settings.chatTime = ConversationTime.validTime(src.chatTime)?src.chatTime:'12:02';
    settings.chatTimeFormat = ConversationTime.formats.includes(src.chatTimeFormat)?src.chatTimeFormat:'date';
    settings.chatTimeCustom = String(src.chatTimeCustom||'').slice(0,120);
    settings.battery = Math.max(0, Math.min(100, Number(src.battery) || 0));
    settings.fontSize = Math.max(14, Math.min(20, Number(src.fontSize) || 16));
    settings.bubblePadding = Number.isFinite(Number(src.bubblePadding)) ? Math.max(8,Math.min(18,Number(src.bubblePadding))) : 12;
    settings.frame = src.frame === 'long' ? 'long' : 'phone';
    return {version:1,title:String(value.title || '微信').slice(0,64),selfId:ids.has(value.selfId) ? value.selfId : people[people.length-1].id,people,settings,messages:value.messages.map(m=>({id:uid(),type:TYPES.includes(m.type)?m.type:'text',sender:ids.has(m.sender)?m.sender:people[0].id,content:String(m.content || '').slice(0,10000),timestamp:ConversationTime.validStamp(m.timestamp)?m.timestamp:undefined,timeFormat:ConversationTime.formats.includes(m.timeFormat)?m.timeFormat:undefined,image:dataImage(m.image),duration:Math.max(1,Math.min(60,Number(m.duration)||8)),amount:Math.max(.01,Math.min(999999,Number(m.amount)||88))}))};
  }
  let state;
  try {state = validate(JSON.parse(localStorage.getItem(STORAGE)));} catch {state = initial();}
  let selectedId = state.messages.find(m=>m.type==='text'||m.type==='chain')?.id || null;
  let saveTimer, toastTimer, renderTicket=0;
  let mutationVersion = 0;
  let avatarMigrationNotice='';
  try{state.people=AvatarPool.prepare(state.people);}catch(e){avatarMigrationNotice=e.message;}
  function toast(message) {$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
  function save() {clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(state));$('save-status').innerHTML='<i></i> 已保存到本机';}catch{$('save-status').textContent='存储空间不足，请保存草稿';}},300);}
  function changed({list=true,form=false,people=false}={}) {mutationVersion++;save();if(list)renderList();if(form)fillComposer();if(people)renderPeople();fillConversationTime();renderPreview();}
  function person(id) {return state.people.find(p=>p.id===id) || state.people[0];}
  function selected() {return state.messages.find(m=>m.id===selectedId);}
  function avatarURL(p) {
    if(p.avatar)return p.avatar;
    if(AvatarPool.valid(p.avatarId))return AvatarPool.url(p.avatarId);
    const svg='<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150"><rect width="150" height="150" fill="#e8ece2"/><text x="75" y="82" text-anchor="middle" font-family="sans-serif" font-size="21" fill="#7c8a71">未分配</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  function renderList() {
    const container=$('message-list');const previousScroll=container.scrollTop;
    container.innerHTML=state.messages.map((m,i)=>{const p=person(m.sender);const notice=m.type==='time'||m.type==='system';const label=ChainMessage.isChain(m)?'[接龙] '+ChainMessage.body(m.content):{image:'[图片]',voice:`[语音] ${m.duration || 8} 秒`,transfer:`[转账] ¥${Number(m.amount||88).toFixed(2)}`,redpacket:`[红包] ${m.content || '恭喜发财，大吉大利'}`}[m.type] || m.content || '点击输入消息';return `<div class="message-item ${notice?'message-time ':''}${m.id===selectedId?'selected':''}" data-message="${m.id}" tabindex="0" role="button" aria-label="编辑第 ${i+1} 条消息"><span class="mini-avatar">${notice?icon(m.type==='time'?'clock':'info'):`<img class="mini-avatar" src="${avatarURL(p)}" alt="">`}</span><div class="message-detail"><div class="message-meta"><strong>${escape(notice?(m.type==='time'?'时间分隔':'系统提示'):p.name)}</strong>${!notice?`<small>${m.sender===state.selfId?'右侧':'左侧'}</small>`:''}</div><div class="message-excerpt">${escape(label)}</div></div><div class="message-order"><button class="icon-button" data-move="-1" aria-label="上移第 ${i+1} 条消息" ${i===0?'disabled':''}>${icon('up')}</button><button class="icon-button" data-move="1" aria-label="下移第 ${i+1} 条消息" ${i===state.messages.length-1?'disabled':''}>${icon('down')}</button></div></div>`;}).join('');
    container.scrollTop=previousScroll;
    $('message-count').textContent=`共 ${state.messages.length} 条消息`;
    $('compose-box').hidden=!selected();
    if (!state.messages.length) container.innerHTML='<div class="soft-note">还没有消息，点击下方按钮开始第一段对话。</div>';
  }
  function selectMessage(id) {selectedId=id;renderList();fillComposer();}
  function senderOptions() {$('sender').innerHTML=state.people.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}${p.id===state.selfId?'（右侧）':''}</option>`).join('');}
  function fillComposer() {
    const m=selected();$('compose-box').hidden=!m;if(!m)return;
    $('compose-title').textContent=`编辑第 ${state.messages.indexOf(m)+1} 条消息`;
    senderOptions();$('sender').value=m.sender;$('message-type').value=m.type;$('message-content').value=m.content || '';$('voice-duration').value=m.duration || 8;$('transfer-amount').value=m.amount || 88;
    const textTypes=['text','chain','system','redpacket','transfer'];
    $('text-field').hidden=!textTypes.includes(m.type);$('image-field').hidden=m.type!=='image';$('duration-field').hidden=m.type!=='voice';$('amount-field').hidden=m.type!=='transfer';$('sender').disabled=['time','system'].includes(m.type);
    $('message-time-fields').hidden=m.type!=='time';if(m.type==='time')fillTimeFields('message',ConversationTime.model(m,state.settings));
    $('content-label').textContent=({time:'时间文字',system:'提示内容',redpacket:'红包祝福语',transfer:'转账备注'})[m.type] || '消息内容';
    $('image-name').textContent=m.image?'已选择图片，可点击上方替换':'还未选择图片';
    updateChainEditor();
  }
  function fillChainBuilder(){const m=selected();if(!m)return;const fields=ChainMessage.fields(m.content);$('chain-description').value=fields.description;$('chain-names').value=fields.names;}
  function updateChainEditor(){const m=selected();const chain=m&&ChainMessage.isChain(m);$('chain-tools').hidden=!chain;$('message-content').rows=chain?8:3;if(chain){$('message-type').value='chain';$('content-label').textContent='接龙内容';fillChainBuilder();}}
  function addChain(){if(state.messages.length>=500)return toast('最多可添加 500 条消息');const m={id:uid(),type:'chain',sender:state.people.find(p=>p.id!==state.selfId)?.id||state.selfId,content:ChainMessage.example};state.messages.push(m);selectedId=m.id;changed({form:true});$('message-list').scrollTop=$('message-list').scrollHeight;$('message-content').focus();}
  function generateChain(){const m=selected();if(!m)return;try{const content=ChainMessage.generate($('chain-description').value,$('chain-names').value);m.type='chain';m.content=content;changed({form:true});toast('接龙名单已生成');}catch(e){toast(e.message);}}
  function fillTimeFields(prefix,model){
    $(prefix+'-date').value=model.date;$(prefix+'-time').value=model.time;$(prefix+'-time-format').value=model.style;$(prefix+'-time-custom').value=model.custom||'';
    $(prefix+'-time-custom-field').hidden=model.style!=='custom';$(prefix+'-date').disabled=model.style==='custom';$(prefix+'-time').disabled=model.style==='custom';
  }
  function readTimeFields(prefix){return {date:$(prefix+'-date').value,time:$(prefix+'-time').value,style:$(prefix+'-time-format').value,custom:$(prefix+'-time-custom').value};}
  function rememberTime(model){state.settings.chatDate=model.date;state.settings.chatTime=model.time;state.settings.chatTimeFormat=model.style;state.settings.chatTimeCustom=model.custom||'';}
  function fillConversationTime(){const first=state.messages.find(m=>m.type==='time');const model=ConversationTime.model(first,state.settings);fillTimeFields('chat',model);$('chat-time-preview').textContent='显示：'+(first?.content||ConversationTime.format(model.date,model.time,model.style,model.custom));}
  function changeConversationTime(event){
    try{const model=readTimeFields('chat');if(event?.target.id==='chat-time-format'&&model.style==='custom'&&!model.custom.trim()){fillTimeFields('chat',model);$('chat-time-preview').textContent='请填写时间显示文字';$('chat-time-custom').focus();return;}const value=ConversationTime.make(model);let first=state.messages.find(m=>m.type==='time');if(!first){if(state.messages.length>=500)throw new Error('最多支持 500 条消息，请先移除一条消息。');first={id:uid(),type:'time',sender:state.people[0].id};state.messages.unshift(first);}Object.assign(first,value);rememberTime(model);changed({form:selectedId===first.id});}catch(e){toast(e.message);fillConversationTime();}
  }
  function changeMessageTime(){const m=selected();if(m?.type!=='time')return;try{const model=readTimeFields('message');Object.assign(m,ConversationTime.make(model));if(state.messages.find(item=>item.type==='time')?.id===m.id)rememberTime(model);changed({form:true});}catch(e){toast(e.message);fillComposer();}}
  function insertTime(){
    if(state.messages.length>=500)return toast('最多支持 500 条消息');
    try{const model=readTimeFields('chat');const m={id:uid(),type:'time',sender:state.people[0].id,...ConversationTime.make(model)};const at=state.messages.findIndex(item=>item.id===selectedId);state.messages.splice(at<0?state.messages.length:at,0,m);selectedId=m.id;rememberTime(model);changed({form:true});$('message-list').querySelector(`[data-message="${m.id}"]`)?.scrollIntoView({block:'nearest'});toast('已插入时间分隔，可在下方单独修改');}catch(e){toast(e.message);}
  }
  function renderPeople() {
    $('people-list').innerHTML=state.people.map(p=>`<div class="person-card" data-person="${escape(p.id)}"><div class="person-header"><label class="person-avatar" title="上传头像"><img loading="lazy" src="${avatarURL(p)}" alt="${escape(p.name)}的头像"><span class="avatar-badge">${icon('camera')}</span><input type="file" accept="image/*" data-avatar hidden></label><label class="person-name"><span class="sr-only">人物昵称</span><input data-name value="${escape(p.name)}" maxlength="64" aria-label="${escape(p.name)}的昵称"></label><button class="icon-button" data-remove-person aria-label="删除${escape(p.name)}" ${state.people.length<=1?'disabled':''}>${icon('trash')}</button></div><div class="person-side"><label><input type="radio" name="self-person" data-self ${p.id===state.selfId?'checked':''}> 我 · 显示在右侧</label><span class="person-avatar-actions"><span class="person-avatar-number">${p.avatar?'自定义':p.avatarId?'#'+String(p.avatarId).padStart(4,'0'):'未分配'}</span><button class="text-button" data-choose-avatar>从图库选</button><button class="text-button muted" data-reset-avatar>换一张</button></span></div></div>`).join('');
    updateAvatarStatus();
    senderOptions();if(selected())$('sender').value=selected().sender;
  }
  function updateAvatarStatus(){const used=AvatarPool.used().size;$('avatar-pool-status').textContent=`已使用 ${used} / 400 张 · 还有 ${400-used} 张未用`;$('people-count').textContent=`本群 ${state.people.length} / 400 人`;$('add-person').disabled=state.people.length>=400;}
  let avatarPage=0,avatarTarget=null;
  function renderAvatarLibrary(){
    const used=AvatarPool.used(),onlyUnused=$('avatar-only-unused').checked;const target=state.people.find(p=>p.id===avatarTarget)||state.people[0];avatarTarget=target.id;
    $('avatar-person').innerHTML=state.people.map(p=>`<option value="${escape(p.id)}">${escape(p.name)}</option>`).join('');$('avatar-person').value=avatarTarget;
    const ids=Array.from({length:400},(_,i)=>i+1).filter(id=>!onlyUnused||!used.has(id));const pages=Math.max(1,Math.ceil(ids.length/40));avatarPage=Math.min(avatarPage,pages-1);
    $('avatar-library-grid').innerHTML=ids.slice(avatarPage*40,(avatarPage+1)*40).map(id=>{const current=target.avatarId===id&&!target.avatar;return `<button class="avatar-tile ${used.has(id)?'is-used':''} ${current?'is-current':''}" data-pool-avatar="${id}" ${used.has(id)&&!current?'disabled':''} aria-label="头像 ${id}${current?'，当前头像':used.has(id)?'，已使用':''}"><img loading="lazy" src="${AvatarPool.url(id)}" alt=""><span>${String(id).padStart(4,'0')}${current?' · 当前':used.has(id)?' · 已用':''}</span></button>`;}).join('')||'<p class="helper">400 张头像已全部使用，不会自动循环分配。</p>';
    $('avatar-page-info').textContent=`${avatarPage+1} / ${pages} 页`;$('avatar-prev').disabled=avatarPage===0;$('avatar-next').disabled=avatarPage>=pages-1;$('avatar-library-status').textContent=`400 张 · ${used.size} 张已用 · ${400-used.size} 张未用`;
  }
  function openAvatarLibrary(id){avatarTarget=id||state.people[0].id;avatarPage=0;$('avatar-only-unused').checked=false;renderAvatarLibrary();$('avatar-dialog').showModal();}
  function bulkPeople(){
    const names=[...new Set($('bulk-people-names').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean))];if(!names.length)return toast('请先输入人物昵称');if(names.some(n=>n.length>64))return toast('每个昵称最多 64 个字符');
    const existing=new Set(state.people.map(p=>p.name));const additions=names.filter(n=>!existing.has(n)).map(name=>({id:uid(),name,avatar:null,avatarId:null}));if(state.people.length+additions.length>400)return toast('每个群聊最多 400 个人物');
    try{state.people=AvatarPool.prepare([...state.people,...additions]);if(state.people.length>2)state.settings.group=true;fillSettings();changed({people:true,form:true});$('bulk-people-dialog').close();$('bulk-people-names').value='';toast(`已添加 ${additions.length} 人，均已分配不同头像`);}catch(e){toast(e.message);}
  }
  const settingIds={'status-platform':'statusPlatform','wifi-enabled':'wifiEnabled','wifi-strength':'wifiStrength','network-type':'networkType','signal-strength':'signal','secondary-signal':'secondarySignal','dual-sim':'dualSim','battery-percent':'showBatteryPercent','status-time':'time',battery:'battery','show-status':'showStatus','show-bottom':'showBottom','group-mode':'group','bg-color':'bg','self-color':'selfColor','other-color':'otherColor','font-size':'fontSize','bubble-padding':'bubblePadding','frame-mode':'frame'};
  function fillSettings() {for(const[id,key]of Object.entries(settingIds)){const el=$(id);if(el.type==='checkbox')el.checked=state.settings[key];else el.value=state.settings[key];} $('battery-value').textContent=state.settings.battery+'%';$('font-value').textContent=state.settings.fontSize+' px';$('padding-value').textContent=state.settings.bubblePadding+' px';$('title').value=state.title;fillStatusControls();fillConversationTime();}
  function updateStatusControls(){const android=state.settings.statusPlatform==='android';$('status-notification-options').classList.toggle('is-disabled',!android);$('status-notification-options').querySelectorAll('input').forEach(el=>el.disabled=!android);$('status-notification-hint').textContent=android?'图标按勾选顺序显示在时间右侧。':'iOS 样式只显示系统状态；切回安卓可恢复应用通知。';$('wifi-strength').disabled=!state.settings.wifiEnabled;$('network-type').disabled=state.settings.wifiEnabled;$('secondary-signal').disabled=!state.settings.dualSim;}
  function fillStatusControls(){$('status-notification-options').innerHTML=StatusBar.applications.map(app=>`<label><input type="checkbox" data-notification-app="${app.id}" ${state.settings.notificationApps.includes(app.id)?'checked':''}>${StatusBar.notification(app.id)}${app.name}</label>`).join('');updateStatusControls();}
  function showTab(name) {document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));for(const n of ['messages','people','settings'])$('panel-'+n).hidden=n!==name;}
  function confirmAction(title,description,action) {$('confirm-title').textContent=title;$('confirm-text').textContent=description;$('confirm-dialog').showModal();$('confirm-ok').onclick=()=>{$('confirm-dialog').close();action();};}
  function addMessage() {if(state.messages.length>=500)return toast('最多可添加 500 条消息');const m={id:uid(),type:'text',sender:state.selfId,content:''};state.messages.push(m);selectedId=m.id;changed({form:true});$('message-list').scrollTop=$('message-list').scrollHeight;$('message-content').focus();}
  const images = new Map();
  function loadImage(src) {if(!src)return Promise.resolve(null);if(images.has(src))return images.get(src);const p=new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;});images.set(src,p);return p;}
  function drawImageCover(ctx,img,x,y,w,h,r=5) {if(!img)return;ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();const ratio=Math.max(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*ratio)/2,y+(h-img.height*ratio)/2,img.width*ratio,img.height*ratio);ctx.restore();}
  function fitPreview() {
    const preview=$('chat-preview');const root=preview.firstElementChild;if(!root)return;
    const shell=preview.parentElement;const scale=shell.clientWidth/1125;
    preview.style.setProperty('--chat-preview-scale',scale);
    shell.style.height=`${Number(root.dataset.nativeHeight)*scale}px`;
  }
  async function renderPreview() {
    const ticket=++renderTicket;const snapshot=structuredClone(state);
    try{const root=ChatRenderer.create(snapshot,avatarURL);await ChatRenderer.ready(root);if(ticket!==renderTicket)return;
      $('chat-preview').replaceChildren(root);const plan=ChatRenderer.measure(root,snapshot.settings);fitPreview();
      $('overflow-note').hidden=snapshot.settings.frame==='long'||plan.needed<=2436;
      $('preview-dimensions').textContent=`${375*Number($('export-scale').value)} × ${Math.round(plan.height*Number($('export-scale').value)/3)} px`;
    }catch(e){toast(e.message);}
  }
  async function readUpload(file,avatar=false) {if(!file)return null;if(!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw new Error('请选择 JPG、PNG、WebP 或 GIF 图片。');if(file.size>10*1024*1024)throw new Error('图片需小于 10 MB。');const src=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('读取图片失败'));reader.readAsDataURL(file);});const img=await loadImage(src);if(!img)throw new Error('图片无法解码，请换一张试试。');const c=document.createElement('canvas');if(avatar){c.width=c.height=512;drawImageCover(c.getContext('2d'),img,0,0,512,512,0);}else{const ratio=Math.min(1,2560/Math.max(img.width,img.height));c.width=Math.max(1,Math.round(img.width*ratio));c.height=Math.max(1,Math.round(img.height*ratio));c.getContext('2d').drawImage(img,0,0,c.width,c.height);}return c.toDataURL('image/png');}
  function download(blob,name) {const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
  async function exportImage(snapshot=structuredClone(state),scale=Number($('export-scale').value),capturedVersion=mutationVersion,allowCrop=false) {
    const buttons=[$('export-image'),$('export-top')];if(buttons[0].disabled)return;
    if(snapshot.messages.some(m=>!['time','system'].includes(m.type)&&!snapshot.people.find(p=>p.id===m.sender)?.avatar&&!AvatarPool.valid(snapshot.people.find(p=>p.id===m.sender)?.avatarId)))return toast('请先为未分配头像的人物选择头像。');
    if(snapshot.messages.some(m=>m.type==='image'&&!m.image))return toast('请先为图片消息选择图片。');
    let capture;buttons.forEach(b=>b.disabled=true);$('export-image').textContent='正在生成…';
    try{capture=await ChatRenderer.forExport(snapshot,avatarURL);
      if(!allowCrop&&snapshot.settings.frame==='phone'&&capture.plan.needed>2436){confirmAction('导出当前手机画面？','对话超出了手机画面。你可以选择导出当前画面，或取消后切换为完整长图。',()=>exportImage(snapshot,scale,capturedVersion,true));return;}
      const blob=await ChatRenderer.toBlob(capture.node,scale);download(blob,`${safeName(snapshot.title)}-聊天.png`);
      toast(capturedVersion===mutationVersion?'图片已导出':'图片已导出（以点击导出时的内容为准）');
    }catch(e){toast(e.message||'导出失败，请重试');}finally{capture?.dispose();buttons.forEach(b=>b.disabled=false);$('export-image').innerHTML=icon('download')+'导出 PNG';}
  }
  function safeName(name) {return (name||'微信').replace(/[\\/:*?"<>|]/g,'-').slice(0,40);}
  function exportProject() {download(new Blob([JSON.stringify({...state,avatarUsage:[...AvatarPool.used()]},null,2)],{type:'application/json'}),safeName(state.title)+'-对话草稿.json');toast('草稿已保存，可随时重新导入');}
  function applyBatch() {const text=$('batch-text').value;if(!text.trim())return toast('先输入一些对话内容');const next=structuredClone(state);if($('batch-replace').checked)next.messages=[];let last=null;let added=0;
    for(const line of text.split(/\r?\n/)){if(!line.trim()){if(last&&ChainMessage.isChain(last))last.content+='\n';continue;}let m;const time=line.match(/^\s*[\[【](.+)[\]】]\s*$/);const named=line.match(/^\s*([^:：]{1,64})[:：]\s*(.*)$/);if(time){m={id:uid(),type:'time',content:time[1],sender:next.people[0].id};const parsed=ConversationTime.fromText(time[1],next.settings.chatDate,next.settings.chatTime);if(parsed.style!=='custom'){m.timestamp=parsed.date+'T'+parsed.time;m.timeFormat=parsed.style;}}else if(named){const name=named[1].trim();let p=['我','自己','me'].includes(name.toLowerCase())?next.people.find(p=>p.id===next.selfId):next.people.find(p=>p.name===name);if(!p){if(next.people.length>=400)return toast('人物数量超过 400，请减少人物');p={id:uid(),name,avatar:null,theme:next.people.length%4};next.people.push(p);}m={id:uid(),type:'text',content:named[2],sender:p.id};}else if(last&&last.type==='text'){last.content+='\n'+line;continue;}else m={id:uid(),type:'text',content:line,sender:next.people[0].id};next.messages.push(m);last=m;added++;}
    next.messages.forEach(m=>{if(m.type==='text'&&ChainMessage.isChain(m))m.type='chain';});
    if(next.messages.length>500)return toast('最多支持 500 条消息');if(next.messages.some(m=>m.content?.length>10000))return toast('单条消息最多 10000 个字符');try{next.people=AvatarPool.prepare(next.people);}catch(e){return toast(e.message);}if(next.people.length>state.people.length&&next.people.length>2)next.settings.group=true;state=next;fillSettings();selectedId=last?.id||null;changed({form:true,people:true});$('batch-dialog').close();$('batch-text').value='';toast(`已添加 ${added} 条消息`);
  }
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
  for(const id of ['chat-date','chat-time','chat-time-format','chat-time-custom'])$(id).addEventListener('change',changeConversationTime);
  for(const id of ['message-date','message-time','message-time-format','message-time-custom'])$(id).addEventListener('change',changeMessageTime);
  $('insert-time').onclick=insertTime;
  $('title').addEventListener('input',e=>{state.title=e.target.value;changed({list:false});});
  $('add-message').onclick=addMessage;$('add-chain').onclick=addChain;$('generate-chain').onclick=generateChain;
  $('chain-builder').addEventListener('toggle',()=>{if($('chain-builder').open)fillChainBuilder();});
  $('message-list').addEventListener('click',e=>{const row=e.target.closest('[data-message]');if(!row)return;const move=e.target.closest('[data-move]');if(move){const index=state.messages.findIndex(m=>m.id===row.dataset.message);const target=index+Number(move.dataset.move);if(target<0||target>=state.messages.length)return;[state.messages[index],state.messages[target]]=[state.messages[target],state.messages[index]];changed({form:true});}else selectMessage(row.dataset.message);});
  $('message-list').addEventListener('keydown',e=>{if(e.target===e.target.closest('[data-message]')&&['Enter',' '].includes(e.key)){e.preventDefault();selectMessage(e.target.dataset.message);}});
  $('close-compose').onclick=()=>{selectedId=null;renderList();};
  $('message-content').addEventListener('input',e=>{const m=selected();if(!m)return;if(e.target.value.length>10000){e.target.value=e.target.value.slice(0,10000);toast('单条消息最多 10000 个字符');}m.content=e.target.value;if(m.type==='text'&&ChainMessage.isChain(m))m.type='chain';updateChainEditor();changed();});
  $('sender').onchange=e=>{if(!selected())return;selected().sender=e.target.value;changed();};
  $('message-type').onchange=e=>{
    const m=selected();if(!m)return;const type=e.target.value;const wasChain=ChainMessage.isChain(m);
    if(type==='chain'){const content=m.content?ChainMessage.normalize(m.content):ChainMessage.example;if(content.length>10000){e.target.value=m.type;return toast('单条接龙最多 10000 个字符');}m.content=content;}
    else if(type==='text'&&wasChain)m.content=ChainMessage.body(m.content);
    m.type=type;if(type==='time')Object.assign(m,ConversationTime.make(ConversationTime.model(null,state.settings)));else{delete m.timestamp;delete m.timeFormat;}
    m.duration ||=8;m.amount ||=88;changed({form:true});
  };
  $('voice-duration').oninput=e=>{if(!selected())return;selected().duration=Math.max(1,Math.min(60,Number(e.target.value)||1));changed();};
  $('transfer-amount').oninput=e=>{if(!selected())return;selected().amount=Math.max(.01,Math.min(999999,Number(e.target.value)||.01));changed();};
  $('message-image').onchange=async e=>{const id=selectedId;const file=e.target.files[0];e.target.value='';try{const image=await readUpload(file);const m=state.messages.find(m=>m.id===id);if(image&&m){m.image=image;changed({form:true});}}catch(err){toast(err.message);}};
  $('delete-message').onclick=()=>{const index=state.messages.findIndex(m=>m.id===selectedId);if(index<0)return;state.messages.splice(index,1);selectedId=state.messages[Math.min(index,state.messages.length-1)]?.id||null;changed({form:true});};
  $('clear-messages').onclick=()=>confirmAction('清空全部对话？','人物和画面设置会保留。建议先保存草稿。',()=>{state.messages=[];selectedId=null;changed({form:true});});
  $('add-person').onclick=()=>{if(state.people.length>=400)return toast('最多添加 400 个人物');try{state.people=AvatarPool.prepare([...state.people,{id:uid(),name:`人物 ${state.people.length+1}`,avatar:null,avatarId:null}]);changed({people:true});}catch(e){toast(e.message);}};
  $('people-list').addEventListener('input',e=>{const row=e.target.closest('[data-person]');if(!row)return;const p=person(row.dataset.person);if(e.target.matches('[data-name]')){p.name=e.target.value;senderOptions();if(selected())$('sender').value=selected().sender;changed();}});
  $('people-list').addEventListener('change',async e=>{const row=e.target.closest('[data-person]');if(!row)return;const p=person(row.dataset.person);if(e.target.matches('[data-self]')){state.selfId=p.id;changed({people:true,form:true});}if(e.target.matches('[data-avatar]')){const file=e.target.files[0];try{const avatar=await readUpload(file,true);if(avatar&&state.people.some(item=>item.id===p.id)){p.avatar=avatar;changed({people:true});}}catch(err){toast(err.message);}}});
  $('people-list').addEventListener('click',e=>{const row=e.target.closest('[data-person]');if(!row)return;const p=person(row.dataset.person);if(e.target.closest('[data-choose-avatar]'))openAvatarLibrary(p.id);if(e.target.closest('[data-reset-avatar]')){try{state.people=AvatarPool.prepare(state.people.map(item=>item.id===p.id?{...item,avatar:null,avatarId:null}:item));changed({people:true});}catch(err){toast(err.message);}}if(e.target.closest('[data-remove-person]')&&state.people.length>1){const remove=()=>{state.people=state.people.filter(item=>item.id!==p.id);const fallback=state.people[0].id;state.messages.forEach(m=>{if(m.sender===p.id)m.sender=fallback;});if(state.selfId===p.id)state.selfId=fallback;changed({people:true,form:true});};if(state.messages.some(m=>m.sender===p.id))confirmAction(`删除人物「${p.name}」？`,'这个人物的已有消息将归给列表中剩下的第一个人物。',remove);else remove();}});
  for(const[id,key]of Object.entries(settingIds))$(id).addEventListener('input',e=>{state.settings[key]=e.target.type==='checkbox'?e.target.checked:['battery','fontSize','bubblePadding','wifiStrength','signal','secondarySignal'].includes(key)?Number(e.target.value):e.target.value;$('battery-value').textContent=state.settings.battery+'%';$('font-value').textContent=state.settings.fontSize+' px';$('padding-value').textContent=state.settings.bubblePadding+' px';updateStatusControls();changed({list:false});});
  $('status-notification-options').onchange=e=>{const id=e.target.dataset.notificationApp;if(!id)return;const apps=state.settings.notificationApps;if(e.target.checked&&apps.length>=4){e.target.checked=false;return toast('最多显示 4 个应用通知图标');}state.settings.notificationApps=e.target.checked?[...apps,id]:apps.filter(app=>app!==id);changed({list:false});};
  $('reset-style').onclick=()=>{state.settings={...defaultSettings};fillSettings();changed({list:false});};
  $('use-long').onclick=()=>{state.settings.frame='long';fillSettings();changed({list:false});toast('已切换完整长图，全部消息都会导出');};
  $('chat-preview').onclick=e=>{const row=e.target.closest('[data-chat-message]');if(row){showTab('messages');selectMessage(row.dataset.chatMessage);document.querySelector(`[data-message="${row.dataset.chatMessage}"]`)?.scrollIntoView({block:'nearest',behavior:'smooth'});}};
  $('export-scale').onchange=()=>renderPreview();$('export-image').onclick=()=>exportImage();$('export-top').onclick=()=>exportImage();$('download-project').onclick=exportProject;
  $('load-project').onclick=()=>$('project-file').click();
  $('project-file').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>30*1024*1024)return toast('草稿文件需小于 30 MB');try{const raw=JSON.parse(await file.text());const imported=validate(raw);const importedUsage=Array.isArray(raw.avatarUsage)?[...new Set(raw.avatarUsage.filter(AvatarPool.valid))]:[];confirmAction('载入这份草稿？','当前对话将被替换。你可以先取消并保存当前草稿。',()=>{try{AvatarPool.remember(importedUsage);imported.people=AvatarPool.prepare(imported.people);state=imported;selectedId=state.messages[0]?.id||null;fillSettings();changed({form:true,people:true});toast('草稿已载入');}catch(err){toast(err.message);}});}catch(err){toast(err.message||'无法读取草稿');}};
  $('batch-open').onclick=()=>$('batch-dialog').showModal();$('batch-close').onclick=()=>$('batch-dialog').close();$('batch-apply').onclick=applyBatch;$('confirm-cancel').onclick=()=>$('confirm-dialog').close();
  document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();exportProject();}});
  window.addEventListener('beforeunload',()=>{clearTimeout(saveTimer);try{localStorage.setItem(STORAGE,JSON.stringify(state));}catch{}});
  $('open-avatar-library').onclick=()=>openAvatarLibrary();$('avatar-close').onclick=()=>$('avatar-dialog').close();
  $('avatar-person').onchange=e=>{avatarTarget=e.target.value;renderAvatarLibrary();};$('avatar-only-unused').onchange=()=>{avatarPage=0;renderAvatarLibrary();};
  $('avatar-prev').onclick=()=>{avatarPage--;renderAvatarLibrary();};$('avatar-next').onclick=()=>{avatarPage++;renderAvatarLibrary();};
  $('avatar-library-grid').onclick=e=>{const tile=e.target.closest('[data-pool-avatar]');if(!tile||tile.disabled)return;try{state.people=AvatarPool.assign(state.people,avatarTarget,Number(tile.dataset.poolAvatar));changed({people:true});renderAvatarLibrary();toast('头像已分配');}catch(err){toast(err.message);}};
  $('refresh-avatars').onclick=()=>{try{state.people=AvatarPool.prepare(state.people,{fresh:true});changed({people:true});toast('已换成一批未用头像，自定义头像已保留');}catch(err){toast(err.message);}};
  $('reset-avatar-usage').onclick=()=>confirmAction('重置头像已用记录？','当前群聊头像会保留。重置后，其他头像可再次分配，可能与之前生成的群聊重复。',()=>{try{AvatarPool.reset(state.people);updateAvatarStatus();renderAvatarLibrary();toast('已重置，当前群聊头像仍被保留');}catch(err){toast(err.message);}});
  $('bulk-people-open').onclick=()=>$('bulk-people-dialog').showModal();$('bulk-people-close').onclick=()=>$('bulk-people-dialog').close();$('bulk-people-apply').onclick=bulkPeople;
  new ResizeObserver(fitPreview).observe($('chat-preview').parentElement);
  icons();fillSettings();renderList();fillComposer();renderPeople();document.fonts.ready.then(renderPreview);save();if(avatarMigrationNotice)toast(avatarMigrationNotice);
})();
