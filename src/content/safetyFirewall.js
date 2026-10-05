// src/content/safetyFirewall.js
const CERTAINTY_PATTERNS=Object.freeze([/ปลอดภัยแน่นอน/i,/น้ำท่วมแน่นอน/i,/ยืนยันว่าเกิดน้ำท่วม/i]);
const FORBIDDEN_TOPIC_PATTERNS=Object.freeze([/ราคาปาล์ม/i,/ราคายาง/i,/ปาล์มน้ำมัน/i,/ยางพารา/i,/ข่าวสารทั่วไป/i]);
const FORECAST_ONLY_PATTERNS=Object.freeze([/ฝน.*(จึง|เลย|ทำให้).*น้ำท่วม/i,/ฝน.*จะ.*ท่วม/i]);
const normalize=v=>String(v??'').replace(/\s+/g,' ').trim();
// A certainty phrase is only a violation when it is asserted. Long-form narration
// legitimately explains what NOT to assume ("ไม่ได้แปลว่าปลอดภัยแน่นอน"), so a phrase
// preceded by a negation cue within a short window is allowed.
const NEGATION_CUE=/(ไม่ได้แปลว่า|ไม่ได้หมายความว่า|ไม่ได้บอกว่า|ไม่ได้ยืนยันว่า|ไม่ได้การันตีว่า|ไม่ได้รับประกันว่า|ไม่ได้หมายถึง|ไม่ได้ทำให้|ไม่ควรคิดว่า|ไม่ควรสรุปว่า|ไม่อาจบอกว่า|ไม่สามารถบอกว่า|ไม่สามารถยืนยันว่า|ไม่อาจยืนยันว่า|อย่าเพิ่งคิดว่า|อย่าเพิ่งสรุปว่า|อย่าคิดว่า|อย่าสรุปว่า|อย่าเข้าใจว่า|ห้ามพูดว่า|ห้ามสรุปว่า|ยังไม่มีข้อมูลที่บอกว่า|มิได้บอกว่า)\s*[^\s]{0,3}\s*$/;
const THAI_NUMBER_PARTS=['ยี่สิบ','สามสิบ','สี่สิบ','ห้าสิบ','หกสิบ','เจ็ดสิบ','แปดสิบ','เก้าสิบ','ศูนย์','หนึ่ง','สอง','สาม','สี่','ห้า','หก','เจ็ด','แปด','เก้า','สิบ','ร้อย','พัน','หมื่น','แสน','ล้าน','เอ็ด'];
const THAI_NUMBER_TOKEN= new RegExp(`(?:${THAI_NUMBER_PARTS.sort((a,b)=>b.length-a.length).join('|')})+`,'g');
const THAI_NUMBER_UNITS=/(?:เซนติเมตร|มิลลิเมตร|กิโลเมตรต่อชั่วโมง|กิโลเมตร|เมตร|นาที|เปอร์เซ็นต์|องศา|โมง|ทุ่ม|จุด)/;
const THAI_DIGIT_VALUES=Object.freeze({ศูนย์:0,หนึ่ง:1,สอง:2,สาม:3,สี่:4,ห้า:5,หก:6,เจ็ด:7,แปด:8,เก้า:9,เอ็ด:1});
const THAI_TENS_VALUES=Object.freeze({สิบ:10,ยี่สิบ:20,สามสิบ:30,สี่สิบ:40,ห้าสิบ:50,หกสิบ:60,เจ็ดสิบ:70,แปดสิบ:80,เก้าสิบ:90});
function parseThaiNumberWords(value){
 let text=String(value||'').replace(/\s/g,''); if(!text)return null;
 if(text.includes('จุด')){const [whole,decimal]=text.split('จุด');const w=parseThaiNumberWords(whole);if(w===null||![...decimal].every(c=>Object.hasOwn(THAI_DIGIT_VALUES,c)))return null;return Number(`${w}.${[...decimal].map(c=>THAI_DIGIT_VALUES[c]).join('')}`)}
 let total=0,current=0,matched=false;
 while(text){let token=THAI_NUMBER_PARTS.find((part)=>text.startsWith(part));if(!token)return null;text=text.slice(token.length);matched=true;
  if(Object.hasOwn(THAI_TENS_VALUES,token)){current+=THAI_TENS_VALUES[token]}
  else if(Object.hasOwn(THAI_DIGIT_VALUES,token)){current+=THAI_DIGIT_VALUES[token]}
  else {const unit={สิบ:10,ร้อย:100,พัน:1000,หมื่น:10000,แสน:100000,ล้าน:1000000}[token];if(unit===1000000){total=(total+ (current||1))*unit;current=0}else{total+=(current||1)*unit;current=0}}
 }
 return matched?total+current:null;
}
function extractThaiMeasurementNumbers(text){
 const results=[];for(const match of normalize(text).matchAll(THAI_NUMBER_TOKEN)){const phrase=match[0];const tail=normalize(text).slice((match.index||0)+phrase.length,(match.index||0)+phrase.length+24);if(phrase.length<3&&!THAI_NUMBER_UNITS.test(tail))continue;const number=parseThaiNumberWords(phrase);if(number!==null)results.push(String(number))}return results;
}
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
function extractNumbers(t){const digits=(normalize(t).match(/(?:\d+(?:\.\d+)?|[๐-๙]+(?:[.,][๐-๙]+)?)/g)||[]).map(normalizeNumberToken);return[...new Set([...digits,...extractThaiMeasurementNumbers(t)])]}
function sourceNumbers(f){return new Set(extractNumbers(collectStrings(f).join(' ')))}
function sourceText(f){return normalize(collectStrings(f).join(' ')).toLowerCase()}
function verifyNamedFacts(text,verifiedFacts){
 const source=sourceText(verifiedFacts);const errors=[];
 const stationNames=(verifiedFacts?.floodSituation?.stations||[]).map((station)=>normalize(station?.name)).filter(Boolean);
 if(stationNames.length) for(const match of normalize(text).matchAll(/สถานี\s*[:：]?\s*([^,.;\n]+)/g)){const name=normalize(match[1]).replace(/^(ที่|ซึ่ง|มีข้อมูล).*$/,'').trim();if(name&&name.length>2&&!/^(เฝ้าระวัง|ปกติ|วิกฤต|ได้รับผลกระทบ|ที่มีข้อมูลยืนยัน|ใกล้ล้นตลิ่ง|ระดับน้ำ|มากและ|ต้นทาง|วัดน้ำ)/.test(name)&&!stationNames.some((allowed)=>name.startsWith(allowed)))errors.push('generated station name not found in verified facts: '+name)}
 const roads=(verifiedFacts?.floodSituation?.roads||[]).map(normalize).filter(Boolean);
 for(const match of normalize(text).matchAll(/ถนน\s*([^,.;\n]+)/g)){const name=normalize(match[1]).trim();if(name&&name.length>2&&(!roads.length||!roads.some((allowed)=>name.startsWith(allowed)))&&!/^(ที่|ใน|หรือ|ข้อมูล|ต้นทาง|ข้อจำกัด)/.test(name))errors.push('generated road name not found in verified facts: '+name)}
 const unsupportedEvents=/(น้ำล้น|น้ำท่วม|ดินถล่ม|ถนนขาด|ปิดถนน|อพยพ)/g;
 for(const match of normalize(text).matchAll(unsupportedEvents)){if(!source.includes(match[0].toLowerCase())&&!/ไม่|ยังไม่|ไม่ได้|ไม่ควร|ห้าม|ไม่ใช่หลักฐาน/.test(normalize(text).slice(Math.max(0,match.index-60),match.index)))errors.push('generated event not found in verified facts: '+match[0])}
 return errors;
}
function validateGeneratedFacts(plan,verifiedFacts,options={}){
 const e=[];if(!plan||typeof plan!=='object')return['presentation plan is required'];const t=outputText(plan);
 if(hasAssertedMatch(t,CERTAINTY_PATTERNS))e.push('unsupported certainty claim');
 if(FORBIDDEN_TOPIC_PATTERNS.some(p=>p.test(t)))e.push('forbidden market/news topic');
 const s=verifiedFacts?.floodSituation?.severity;if(s&&plan.severity!==s)e.push('presentation severity does not match verified flood severity');
 const forecastOnly=options.forecastOnly===true||(s==='unknown'&&!(verifiedFacts?.floodSituation?.stations?.length));
 if(forecastOnly&&FORECAST_ONLY_PATTERNS.some(p=>p.test(t)))e.push('forecast-only weather cannot establish an actual flood');
 const allowed=sourceNumbers(verifiedFacts),unknown=extractNumbers(t).filter(n=>!allowed.has(n));
 if(unknown.length)e.push('generated numeric fact not found in verified facts: '+unknown.join(', '));
 e.push(...verifyNamedFacts(t,verifiedFacts));
 if(options.requireFactsUsed!==false&&(!Array.isArray(plan.factsUsed)||plan.factsUsed.length===0))e.push('factsUsed trace is required');
 return e;
}
module.exports={outputText,extractNumbers,validateGeneratedFacts,CERTAINTY_PATTERNS,FORBIDDEN_TOPIC_PATTERNS,FORECAST_ONLY_PATTERNS};
