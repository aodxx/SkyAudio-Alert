// src/content/qualityScore.js
const text=v=>String(v??'').trim();
function scorePresentationQuality(plan,floodSituation,weatherAnalysis){
 const checks={
  floodVisibility:Boolean(plan?.cards?.[0]?.title&&plan?.cards?.[0]?.body&&plan?.severity),
  freshnessVisibility:Boolean(/อัปเดต|ข้อมูลล่าสุด|สด|ล่าช้า|เก่า|ยืนยันไม่ได้|ไม่สามารถยืนยัน/i.test([plan?.spokenText,...(plan?.cards||[]).map(c=>c?.body)].join(' '))||floodSituation?.freshness?.state==='fresh'),
  actionClarity:(Array.isArray(plan?.actions)&&plan.actions.length>0)||plan?.severity==='normal',
  sourceVisibility:(plan?.cards||[]).some(c=>c?.role==='source'||/แหล่งข้อมูล|ตรวจสอบ|CCTV/i.test(text(c?.body))),
  compactness:Array.isArray(plan?.cards)&&plan.cards.length>=1&&plan.cards.length<=6&&(plan.cards||[]).every(c=>text(c?.body).length<=650),
  carouselCompleteness:Array.isArray(plan?.cards)&&plan.cards.length>=2,
  accessibility:Boolean(plan?.cards?.[0]?.title&&plan?.cards?.[0]?.body),
  audioConsistency:Boolean(plan?.spokenText&&plan?.severity===floodSituation?.severity),
  audioInformationSufficiency:text(plan?.spokenText).length>=(plan?.severity==='critical'?80:35),
  weatherContext:!weatherAnalysis||(plan?.cards||[]).some(c=>c?.role==='weather')||plan?.severity==='critical'
 };
 const passed=Object.values(checks).filter(Boolean).length,total=Object.keys(checks).length;
 return{score:Math.round(passed/total*100),passed,total,checks,safetyOverride:false};
}
module.exports={scorePresentationQuality};