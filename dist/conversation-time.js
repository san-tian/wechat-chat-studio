'use strict';
// A conversation timestamp is a wall-clock value selected by the author. Never
// parse it as UTC or convert it to the browser's timezone when saving a draft.
window.ConversationTime=(()=>{
  const formats=['date','month-day','time','relative','weekday','custom'];
  const pad=n=>String(n).padStart(2,'0');
  const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  function day(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));if(!match||Number(match[1])<1)return null;
    const date=new Date(0);date.setUTCFullYear(Number(match[1]),Number(match[2])-1,Number(match[3]));date.setUTCHours(0,0,0,0);
    return date.getUTCFullYear()===Number(match[1])&&date.getUTCMonth()+1===Number(match[2])&&date.getUTCDate()===Number(match[3])?date:null;
  }
  const validTime=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value));
  const validStamp=value=>typeof value==='string'&&value.length===16&&Boolean(day(value.slice(0,10)))&&value[10]==='T'&&validTime(value.slice(11));
  function format(date,time,style='date',custom=''){
    const d=day(date);if(!d||!validTime(time))throw new Error('请选择有效的对话日期和时间。');
    const month=d.getUTCMonth()+1,n=d.getUTCDate(),year=d.getUTCFullYear();
    if(style==='custom')return String(custom);
    if(style==='time')return time;
    if(style==='weekday')return `星期${'日一二三四五六'[d.getUTCDay()]} ${time}`;
    if(style==='month-day')return `${month}月${n}日 ${time}`;
    if(style==='relative'){const difference=(day(today())-d)/86400000;if(difference===0)return `今天 ${time}`;if(difference===1)return `昨天 ${time}`;}
    return `${year}年${month}月${n}日 ${time}`;
  }
  function fromText(content,fallbackDate=today(),fallbackTime='12:02'){
    const text=String(content||'').trim();let match;
    if((match=/^(?:(今天|昨天)\s*)?(\d{1,2}):(\d{2})$/.exec(text))){
      const d=day(fallbackDate)||day(today());if(match[1]==='昨天')d.setUTCDate(d.getUTCDate()-1);
      const date=`${String(d.getUTCFullYear()).padStart(4,'0')}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`,time=pad(match[2])+':'+match[3];
      if(validTime(time))return {date,time,style:match[1]?'relative':'time',custom:content};
    }
    if((match=/^(\d{4})[年./-](\d{1,2})[月./-](\d{1,2})日?[ T]+(\d{1,2}):(\d{2})$/.exec(text))){const date=`${match[1]}-${pad(match[2])}-${pad(match[3])}`,time=pad(match[4])+':'+match[5];if(day(date)&&validTime(time))return {date,time,style:'date',custom:content};}
    if((match=/^(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/.exec(text))){const date=`${fallbackDate.slice(0,4)}-${pad(match[1])}-${pad(match[2])}`,time=pad(match[3])+':'+match[4];if(day(date)&&validTime(time))return {date,time,style:'month-day',custom:content};}
    return {date:day(fallbackDate)?fallbackDate:today(),time:validTime(fallbackTime)?fallbackTime:'12:02',style:'custom',custom:String(content||'')};
  }
  function model(message,settings={}){
    const fallbackDate=day(settings.chatDate)?settings.chatDate:today(),fallbackTime=validTime(settings.chatTime)?settings.chatTime:'12:02';
    if(message&&validStamp(message.timestamp))return {date:message.timestamp.slice(0,10),time:message.timestamp.slice(11),style:formats.includes(message.timeFormat)?message.timeFormat:'date',custom:message.content||''};
    if(message)return fromText(message.content,fallbackDate,fallbackTime);
    return {date:fallbackDate,time:fallbackTime,style:formats.includes(settings.chatTimeFormat)?settings.chatTimeFormat:'date',custom:settings.chatTimeCustom||''};
  }
  function make({date,time,style,custom}){if(!formats.includes(style))style='date';const content=format(date,time,style,custom);if(!content.trim())throw new Error('请填写时间显示文字。');return {timestamp:date+'T'+time,timeFormat:style,content};}
  return {today,day,validTime,validStamp,formats,format,model,make,fromText};
})();
