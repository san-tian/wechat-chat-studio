'use strict';
window.ChainMessage=(()=>{
  const heading='#接龙';
  const example='#接龙\n活动报名接龙（请填写姓名及备注）\n\n1. 张三 已报名\n2. 李四 已报名';
  const text=value=>String(value||'').replace(/\r\n?/g,'\n');
  function isChain(message){return message.type==='chain'||message.type==='text'&&/^[\t ]*[#＃][\t ]*接龙(?:[\t ]*(?:\n|$)|[\t ]+)/.test(text(message.content));}
  function body(value){const content=text(value);const match=/^[\t ]*[#＃][\t ]*接龙[\t ]*/.exec(content);if(!match)return content;const rest=content.slice(match[0].length);return rest.startsWith('\n')?rest.slice(1):rest;}
  function normalize(value){const rest=body(value);return heading+(rest?'\n'+rest:'');}
  function generate(description,names){const info=body(description).trim();const entries=text(names).split('\n').map(line=>line.replace(/^\s*\d+[.．、][\t ]*/,'').trim()).filter(Boolean);if(!entries.length)throw new Error('请在名单中每行填写一条内容。');const content=heading+(info?'\n'+info:'')+'\n'+(info?'\n':'')+entries.map((entry,i)=>`${i+1}. ${entry}`).join('\n');if(content.length>10000)throw new Error('单条接龙最多 10000 个字符，请减少名单内容。');return content;}
  function fields(value){const lines=body(value).split('\n');const first=lines.findIndex(line=>/^\s*\d+[.．、][\t ]*/.test(line));if(first<0)return {description:lines.join('\n').trim(),names:''};return {description:lines.slice(0,first).join('\n').trim(),names:lines.slice(first).map(line=>line.replace(/^\s*\d+[.．、][\t ]*/,'')).join('\n')};}
  return {heading,example,isChain,body,normalize,generate,fields};
})();
