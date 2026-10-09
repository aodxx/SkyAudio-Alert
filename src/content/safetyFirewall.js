// src/content/safetyFirewall.js
const CERTAINTY_PATTERNS=Object.freeze([/ปลอดภัยแน่นอน/i,/น้ำท่วมแน่นอน/i,/ยืนยันว่าเกิดน้ำท่วม/i]);
const FORBIDDEN_TOPIC_PATTERNS=Object.freeze([/ราคาปาล์ม/i,/ราคายาง/i,/ปาล์มน้ำมัน/i,/ยางพารา/i,/ข่าวสารทั่วไป/i]);
const FORECAST_ONLY_PATTERNS=Object.freeze([/ฝน.*(จึง|เลย|ทำให้).*น้ำท่วม/i,/ฝน.*จะ.*ท่วม/i]);
const normalize=v=>String(v??'').replace(/\s+/g,' ').trim();
// A certainty phrase is only a violation when it is asserted. Long-form narration
// legitimately explains what NOT to assume ("ไม่ได้แปลว่าปลอดภัยแน่นอน"), so a phrase
// preceded by a negation cue within a short window is allowed.
const NEGATION_CUE=/(ไม่ได้แปลว่า|ไม่ได้หมายความว่า|ไม่ได้บอกว่า|ไม่ได้ยืนยันว่า|ไม่ได้การันตีว่า|ไม่ได้รับประกันว่า|ไม่ได้หมายถึง|ไม่ได้ทำให้|ไม่ควรคิดว่า|ไม่ควรสรุปว่า|ไม่อาจบอกว่า|ไม่สามารถบอกว่า|ไม่สามารถยืนยันว่า|ไม่อาจยืนยันว่า|อย่าเพิ่งคิดว่า|อย่าเพิ่งสรุปว่า|อย่าคิดว่า|อย่าสรุปว่า|อย่าเข้าใจว่า|ห้ามพูดว่า|ห้ามสรุปว่า|ยังไม่มีข้อมูลที่บอกว่า|มิได้บอกว่า)\s*[^\s]{0,3}\s*$/;
function hasAssertedMatch(text,patterns,window=24){
 for(const p of patterns){
  const g=new RegExp(p.source,p.flags.includes('g')?p.flags:p.flags+'g');let m;
  while((m=g.exec(text))){
   const before=text.slice(Math.max(0,m.index-window),m.index);
   if(!NEGATION_CUE.test(before))return true;
   if(m[0].length===0)g.lastIndex++;
  }
 }
 return false;
}
function normalizeNumberToken(v){
 let s=String(v??'').trim().replace(/,/g,'').replace(/๐/g,'0').replace(/๑/g,'1').replace(/๒/g,'2').replace(/๓/g,'3').replace(/๔/g,'4').replace(/๕/g,'5').replace(/๖/g,'6').replace(/๗/g,'7').replace(/๘/g,'8').replace(/๙/g,'9');
 if(/^\d+(?:\.\d+)?$/.test(s)&&s.includes('.'))s=s.replace(/\.?0+$/,'');
 return s;
}
const outputText=plan=>[plan?.spokenText,...(plan?.spokenSections||[]),...(plan?.actions||[]),...(plan?.warnings||[]),...(plan?.cards||[]).flatMap(c=>[c?.title,c?.body,...(c?.items||[])])].map(normalize).filter(Boolean).join('\n');
function collectStrings(v,out=[]){if(v==null)return out;if(typeof v==='string'){if(v.trim())out.push(v.trim());return out}if(typeof v==='number'){out.push(String(v));return out}if(Array.isArray(v)){v.forEach(x=>collectStrings(x,out));return out}if(typeof v==='object')Object.values(v).forEach(x=>collectStrings(x,out));return out}
function extractNumbers(t){return[...new Set((normalize(t).match(/(?:\d+(?:\.\d+)?|[๐-๙]+(?:[.,][๐-๙]+)?)/g)||[]).map(normalizeNumberToken))]}
function sourceNumbers(f){return new Set(extractNumbers(collectStrings(f).join(' ')))}
function validateSectionFactTrace(plan, factsSnapshot) {
 const errors = [];
 if (!factsSnapshot || !factsSnapshot.facts || !Array.isArray(plan?.sections)) return errors;
 const knownIds = new Set(Array.isArray(factsSnapshot.factIds) ? factsSnapshot.factIds : Object.keys(factsSnapshot.facts));
 plan.sections.forEach((section, index) => {
  const used = Array.isArray(section?.factsUsed) ? section.factsUsed.map(String) : [];
  const unknownIds = used.filter((id) => !knownIds.has(id));
  if (unknownIds.length) errors.push(`section ${index + 1} references unknown fact IDs: ${[...new Set(unknownIds)].join(', ')}`);
  const citedNumbers = new Set(used.flatMap((id) => factsSnapshot.facts[id]?.spokenForms || []).flatMap(extractNumbers));
  const unsupportedNumbers = extractNumbers(section?.text).filter((number) => !citedNumbers.has(number));
  if (unsupportedNumbers.length) errors.push(`section ${index + 1} numeric claims are not supported by its cited facts: ${[...new Set(unsupportedNumbers)].join(', ')}`);
 });
 return errors;
}
function validateGeneratedFacts(plan,verifiedFacts,options={}){
 const e=[];if(!plan||typeof plan!=='object')return['presentation plan is required'];const t=outputText(plan);if(options.factsSnapshot)e.push(...validateSectionFactTrace(plan,options.factsSnapshot));
 if(hasAssertedMatch(t,CERTAINTY_PATTERNS))e.push('unsupported certainty claim');
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