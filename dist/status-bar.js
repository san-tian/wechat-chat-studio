'use strict';
window.StatusBar=(()=>{
  const applications=[{id:'wechat',name:'微信'},{id:'qq',name:'QQ'},{id:'alipay',name:'支付宝'},{id:'tiktok',name:'抖音'},{id:'mail',name:'邮件'},{id:'music',name:'音乐'}];
  const appIds=new Set(applications.map(a=>a.id));
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=(value,fallback,min,max)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Math.round(Number(value)))):fallback;
  function normalize(s={}){return {statusPlatform:s.statusPlatform==='ios'?'ios':'android',notificationApps:Array.isArray(s.notificationApps)?[...new Set(s.notificationApps.filter(id=>appIds.has(id)))].slice(0,4):['wechat','qq','mail'],wifiEnabled:typeof s.wifiEnabled==='boolean'?s.wifiEnabled:true,wifiStrength:number(s.wifiStrength,3,1,3),signal:number(s.signal,4,0,4),dualSim:typeof s.dualSim==='boolean'?s.dualSim:false,secondarySignal:number(s.secondarySignal,3,0,4),networkType:['5G','4G','LTE','3G','none'].includes(s.networkType)?s.networkType:'5G',showBatteryPercent:typeof s.showBatteryPercent==='boolean'?s.showBatteryPercent:true};}
  function notification(id){
    if(!appIds.has(id))return '';
    let paths='';
    if(id==='mail')paths='<path d="M3 4h18a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm0 2v2l9 6 9-6V6l-9 6-9-6Z" fill-rule="evenodd"/>';
    else if(id==='music')paths='<path d="M9 4v11.2A4.6 4.6 0 0 0 6.5 15C4 15 2 16.6 2 18.5S4 22 6.5 22s4.5-1.6 4.5-3.5V8l9-2v7.2a4.6 4.6 0 0 0-2.5-.2c-2.5 0-4.5 1.6-4.5 3.5s2 3.5 4.5 3.5 4.5-1.6 4.5-3.5V1L9 4Z"/>';
    else paths=`<path d="${StatusIconArtwork.apps[id]}"/>`;
    return `<svg class="status-app-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${paths}</svg>`;
  }
  function signal(level,second=false){return `<svg class="status-signal${second?' status-signal-secondary':''}" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${second?'副卡':'主卡'}信号 ${level} 格">${[4,7,10,14].map((height,i)=>`<rect x="${i*4}" y="${15-height}" width="2.9" height="${height}" rx=".45" opacity="${level>i?1:.22}"/>`).join('')}</svg>`;}
  function wifi(level){return `<svg class="status-wifi" viewBox="-20 -840 1000 760" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Wi-Fi ${['','弱','中','强'][level]}">${StatusIconArtwork.wifiBands.map((d,i)=>`<path d="${d}" opacity="${level>i?1:.2}"/>`).join('')}</svg>`;}
  function battery(value,percent){const low=value<=20;return `<span class="status-battery-group${low?' is-low':''}" aria-label="电量 ${value}%"><svg class="status-battery-icon" viewBox="0 0 28 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x=".8" y=".8" width="23.6" height="12.4" rx="2.6" fill="none" stroke="currentColor" stroke-width="1.35" opacity=".6"/><rect x="26" y="4.5" width="1.8" height="5" rx=".7" opacity=".65"/>${value>0?`<rect class="status-battery-fill" x="3" y="3" width="${19.2*value/100}" height="8" rx="1.1"/>`:''}</svg>${percent?`<span class="status-battery-percent">${value}%</span>`:''}</span>`;}
  function render(settings){const s=normalize(settings),isAndroid=s.statusPlatform==='android';const level=number(settings.battery,87,0,100);const apps=isAndroid?s.notificationApps:[];
    const notices=apps.length?`<span class="status-notifications" aria-label="应用通知">${apps.map(id=>`<span data-status-app="${id}" aria-label="${applications.find(a=>a.id===id).name}通知">${notification(id)}</span>`).join('')}</span>`:'';
    return `<div class="chat-status status-${s.statusPlatform}"><div class="status-left"><span class="chat-clock">${escape(settings.time??'12:02')}</span>${notices}</div><div class="chat-status-icons">${!s.wifiEnabled&&s.networkType!=='none'?`<span class="status-network">${s.networkType}</span>`:''}<span class="status-sim-group">${signal(s.signal)}${s.dualSim?signal(s.secondarySignal,true):''}</span>${s.wifiEnabled?wifi(s.wifiStrength):''}${battery(level,s.showBatteryPercent)}</div></div>`;
  }
  return {applications,normalize,notification,render};
})();
