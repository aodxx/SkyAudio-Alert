// src/content/safetyFirewall.js
const CERTAINTY_PATTERNS=Object.freeze([/ปลอดภัยแน่นอน/i,/น้ำท่วมแน่นอน/i,/ยืนยันว่าเกิดน้ำท่วม/i]);
const FORBIDDEN_TOPIC_PATTERNS=Object.freeze([/ราคาปาล์ม/i,/ราคายาง/i,/ปาล์มน้ำมัน/i,/ยางพารา/i,/ข่าวสารทั่วไป/i]);
const FORECAST_ONLY_PATTERNS=Object.freeze([/ฝน.*(จึง|เลย|ทำให้).*น้ำท่วม/i,/ฝน.*จะ.*ท่วม/i]);
const normalize=v=>String(v??'').replace(/\s+/g,' ').trim();
const outputText=plan=>[plan?.spokenText,...(plan?.spokenSections||[]),...(plan?.actions||[]),...(plan?.warnings||[]),...(plan?.cards||[]).flatMap(c=>[c?.title,c?.body,...(c?.items||[])])].map(normalize).filter(Boolean).join('\n');
function collectStrings(v,out=[]){if(v==null)return out;if(typeof v==='string'){if(v.trim())out.push(v.trim());return out}if(typeof v==='number'){out.push(String(v));return out}if(Array.isArray(v)){v.forEach(x=>collectStrings(x,out));return out}if(typeof v==='object')Object.values(v).forEach(x=>collectStrings(x,out));return out}
function extractNumbers(t){return[...new Set((normalize(t).match(/(?:\d+(?:\.\d+)?|[๐-๙]+(?:[.,][๐-๙]+)?)/g)||[]))]}
function sourceNumbers(f){return new Set(extractNumbers(collectStrings(f).join(' ')))}
function validateGeneratedFacts(plan,verifiedFacts,options={}){
 const e=[];if(!plan||typeof plan!=='object')return['presentation plan is required'];const t=outputText(plan);
 if(CERTAINTY_PATTERNS.some(p=>p.test(t)))e.push('unsupported certainty claim');
 if(FORBIDDEN_TOPIC_PATTERNS.some(p=>p.test(t)))e.push('forbidden market/news topic');
 const s=verifiedFacts?.floodSituation?.severity;if(s&&plan.severity!==s)e.push('presentation severity does not match verified flood severity');
 const forecastOnly=options.forecastOnly===true||(s==='unknown'&&!(verifiedFacts?.floodSituation?.stations?.length));
 if(forecastOnly&&FORECAST_ONLY_PATTERNS.some(p=>p.test(t)))e.push('forecast-only weather cannot establish an actual flood');
 const allowed=sourceNumbers(verifiedFacts),unknown=extractNumbers(t).filter(n=>!allowed.has(n));
 if(unknown.length)e.push('generated numeric fact not found in verified facts: '+unknown.join(', '));
 if(options.requireFactsUsed!==false&&(!Array.isArray(plan.factsUsed)||plan.factsUsed.length===0))e.push('factsUsed trace is required');
 return e;
}
module.exports={outputText,extractNumbers,validateGeneratedFacts,CERTAINTY_PATTERNS,FORBIDDEN_TOPIC_PATTERNS,FORECAST_ONLY_PATTERNS};