// src/content/presentationContract.js
// V1.5 Phase 4: validates Gemini's presentation plan without becoming a fact source.
const ROLES=Object.freeze(['hero','action','facts','impact','weather','source','uncertainty']);
const TONES=Object.freeze(['calm','friendly','urgent']);
const DETAILS=Object.freeze(['standard','detailed','high']);
const text=v=>v===null||v===undefined?'':String(v).trim();
const list=(v,max)=>Array.isArray(v)?v.map(text).filter(Boolean).slice(0,max):[];

function parsePresentationPlan(value){
 let p=value;
 if(typeof p==='string'){try{p=JSON.parse(p)}catch(_){return{ok:false,errors:['PresentationPlan is not valid JSON']}}}
 if(!p||typeof p!=='object'||Array.isArray(p))return{ok:false,errors:['PresentationPlan must be an object']};
 const cards=Array.isArray(p.cards)?p.cards.slice(0,10).map((c,i)=>({
  id:text(c.id)||'card-'+(i+1),role:ROLES.includes(c.role)?c.role:'facts',title:text(c.title),body:text(c.body),
  items:list(c.items,4),cta:Array.isArray(c.cta)?c.cta.slice(0,3).map(x=>({label:text(x?.label),uri:text(x?.uri)})).filter(x=>x.label&&x.uri):[]
 })):[],
 plan={schemaVersion:'1.0',severity:text(p.severity)||'unknown',priority:text(p.priority)||'unknown',visualVariant:text(p.visualVariant)||'unknown',
 cards,spokenText:text(p.spokenText),spokenSections:list(p.spokenSections,8),
 audioStyle:{tone:TONES.includes(p.audioStyle?.tone)?p.audioStyle.tone:'calm',pacing:text(p.audioStyle?.pacing)||'natural',detailLevel:DETAILS.includes(p.audioStyle?.detailLevel)?p.audioStyle.detailLevel:'standard',emphasis:list(p.audioStyle?.emphasis,6)},
 audioSelectionPolicy:'gemini-adaptive-within-verified-facts',actions:list(p.actions,3),warnings:list(p.warnings,10),factsUsed:list(p.factsUsed,30)};
 const errors=validatePresentationPlan(plan,{expectedSeverity:p.expectedSeverity});
 return errors.length?{ok:false,errors,plan}:{ok:true,plan};
}
function validatePresentationPlan(plan,{expectedSeverity}={}){
 const e=[]; if(!plan||typeof plan!=='object')return['PresentationPlan must be an object'];
 if(plan.schemaVersion!=='1.0')e.push('schemaVersion must be 1.0');
 if(!['normal','watch','affected','critical','unknown'].includes(plan.severity))e.push('severity is invalid');
 if(plan.priority!==plan.severity)e.push('priority must match verified severity');
 if(plan.visualVariant!==plan.severity)e.push('visualVariant must match verified severity');
 if(!text(plan.spokenText))e.push('spokenText is required');
 if(!Array.isArray(plan.cards)||!plan.cards.length||plan.cards.length>10)e.push('cards must contain 1-10 items');
 if(plan.cards?.[0]&&(!text(plan.cards[0].title)||!text(plan.cards[0].body)))e.push('Card 1 must be self-contained');
 if(plan.severity==='critical'&&plan.cards?.[0]&&!/ทำ|ติดตาม|หลีกเลี่ยง|ฉุกเฉิน|ทันที|ประกาศ/i.test(plan.cards[0].body))e.push('critical Card 1 must contain an immediate action');
 if(plan.severity==='unknown'&&plan.cards?.[0]&&!/ยืนยัน|ไม่ทราบ|ไม่พร้อม|ข้อมูล/i.test(plan.cards[0].body))e.push('unknown Card 1 must disclose uncertainty');
 if(!TONES.includes(plan.audioStyle?.tone)||!DETAILS.includes(plan.audioStyle?.detailLevel))e.push('audioStyle is invalid');
 const combined=[plan.spokenText,...(plan.actions||[]),(plan.cards||[]).flatMap(c=>[c.title,c.body,...(c.items||[])])].join('\n');
 if(/ปลอดภัยแน่นอน|น้ำท่วมแน่นอน|ยืนยันว่าเกิดน้ำท่วม|ราคาปาล์ม|ราคายาง|ข่าวสารทั่วไป/i.test(combined))e.push('presentation contains unsupported certainty or forbidden topic');
 if(expectedSeverity&&plan.severity!==expectedSeverity)e.push('severity does not match verified flood severity');
 return e;
}
function buildPresentationPlanFallback({floodSituation,weatherAnalysis,report}){
 const severity=floodSituation?.severity||'unknown',label={normal:'ปกติ',watch:'เฝ้าระวัง',affected:'ได้รับผลกระทบ',critical:'วิกฤต',unknown:'ยังยืนยันไม่ได้'}[severity]||'ยังยืนยันไม่ได้';
 const actions=(floodSituation?.actions||[]).slice(0,3);
 const hero=severity==='unknown'?'ยังยืนยันสถานการณ์น้ำล่าสุดไม่ได้ จึงไม่ควรสรุปว่าเกิดหรือไม่เกิดน้ำท่วม':(report?.shortSummary||floodSituation?.summary||'ติดตามสถานการณ์น้ำล่าสุด');
 const cards=[{id:'hero',role:severity==='unknown'?'uncertainty':severity==='critical'?'action':'hero',title:'สถานการณ์น้ำ: '+label,body:hero,items:[],cta:[]}];
 if(severity==='critical')cards.push({id:'source',role:'source',title:'ตรวจสอบข้อมูลทันที',body:'ติดตามประกาศและแหล่งข้อมูลทางการ',items:[],cta:[{label:'ดูสถานะน้ำ / CCTV',uri:'https://cctv.maholan.net/'},{label:'สถานการณ์น้ำพัทลุง',uri:'https://chachoengsao-flood.vercel.app/phatthalung'}]});
 else cards.push({id:'weather',role:'weather',title:'พยากรณ์อากาศ',body:weatherAnalysis?.current?.description?.label||'ติดตามพยากรณ์อากาศ',items:[],cta:[{label:'อากาศ / เรดาร์ฝน',uri:'https://chachoengsao-flood.vercel.app/phatthalung/weather'}]});
 return{schemaVersion:'1.0',severity,priority:severity,visualVariant:severity,cards,spokenText:report?.spokenText||'',spokenSections:[],audioStyle:{tone:severity==='critical'?'urgent':'friendly',pacing:'natural',detailLevel:severity==='critical'?'high':'detailed',emphasis:actions},audioSelectionPolicy:'gemini-adaptive-within-verified-facts',actions,warnings:report?.warnings||[],factsUsed:report?.factsUsed||[]};
}
module.exports={ROLES,parsePresentationPlan,validatePresentationPlan,buildPresentationPlanFallback};
