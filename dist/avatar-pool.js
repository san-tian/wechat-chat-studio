'use strict';
// A stable, locally hosted photo library. Keep the usage ledger separate from
// the current conversation so deleting a person does not recycle their avatar.
window.AvatarPool = (() => {
  const SIZE=400, KEY='wechat-chat-studio-avatar-usage-v1';
  const valid=id=>Number.isInteger(id)&&id>=1&&id<=SIZE;
  function read(){try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return new Set(Array.isArray(value)?value.filter(valid):[]);}catch{return new Set();}}
  function write(used){try{localStorage.setItem(KEY,JSON.stringify([...used].sort((a,b)=>a-b)));}catch{throw new Error('无法保存头像使用记录，请释放浏览器存储空间后重试。');}}
  const url=id=>new URL(`avatars/avatar-${String(id).padStart(4,'0')}.jpg`,document.baseURI).href;
  function prepare(people,{fresh=false}={}){
    const used=read(),claimed=new Set(),next=people.map(p=>({...p})),needs=[];
    for(const p of next){
      if(valid(p.avatarId))used.add(p.avatarId);
      if(p.avatar)continue;
      if(!fresh&&valid(p.avatarId)&&!claimed.has(p.avatarId))claimed.add(p.avatarId);
      else{p.avatarId=null;needs.push(p);}
    }
    const free=Array.from({length:SIZE},(_,i)=>i+1).filter(id=>!used.has(id)&&!claimed.has(id));
    if(free.length<needs.length)throw new Error(`未用头像只剩 ${free.length} 张，需要 ${needs.length} 张。不会自动重复分配；可减少新人物或重置已用记录。`);
    // Shuffle unused IDs, rather than walking visually related source photos.
    for(let i=free.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[free[i],free[j]]=[free[j],free[i]];}
    needs.forEach((p,i)=>{p.avatarId=free[i];used.add(p.avatarId);});write(used);
    return next;
  }
  function assign(people,personId,id){
    if(!valid(id))throw new Error('头像编号无效。');
    const p=people.find(p=>p.id===personId);if(!p)throw new Error('这个人物已不存在。');
    if(p.avatarId===id&&!p.avatar)return people.map(p=>({...p}));
    if(read().has(id)||people.some(p=>!p.avatar&&p.avatarId===id))throw new Error('这个头像已经使用，请选择一张未用头像。');
    const used=read();used.add(id);write(used);return people.map(p=>p.id===personId?{...p,avatar:null,avatarId:id}:{...p});
  }
  function reset(people){const keep=new Set(people.filter(p=>!p.avatar&&valid(p.avatarId)).map(p=>p.avatarId));write(keep);}
  function remember(ids){const used=read();for(const id of ids)if(valid(id))used.add(id);write(used);}
  return {size:SIZE,valid,url,prepare,assign,reset,remember,used:()=>read()};
})();
