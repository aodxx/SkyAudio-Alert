// src/content/presentationPlanner.js
// V1.5 Phase 4: Gemini chooses presentation emphasis/wording; verified facts remain authoritative.
const { buildGeminiReportInput }=require('./reportContract');
const { parsePresentationPlan, buildPresentationPlanFallback }=require('./presentationContract');
const { GEMINI_BASE_URL, fetchGeminiContent, parseGeminiJsonText }=require('./geminiReport');

function extractText(json){return json?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('').trim()||'';}
function plannerSchema(){
 return {type:'OBJECT',properties:{
  severity:{type:'STRING',enum:['normal','watch','affected','critical','unknown']},priority:{type:'STRING',enum:['normal','watch','affected','critical','unknown']},visualVariant:{type:'STRING',enum:['normal','watch','affected','critical','unknown']},
  cards:{type:'ARRAY',items:{type:'OBJECT',properties:{id:{type:'STRING'},role:{type:'STRING',enum:['hero','action','facts','impact','weather','source','uncertainty']},title:{type:'STRING'},body:{type:'STRING'},items:{type:'ARRAY',items:{type:'STRING'}},cta:{type:'ARRAY',items:{type:'OBJECT',properties:{label:{type:'STRING'},uri:{type:'STRING'}},required:['label','uri']}}},required:['id','role','title','body','items','cta']}},
  spokenText:{type:'STRING'},spokenSections:{type:'ARRAY',items:{type:'STRING'}},
  audioStyle:{type:'OBJECT',properties:{tone:{type:'STRING',enum:['calm','friendly','urgent']},pacing:{type:'STRING'},detailLevel:{type:'STRING',enum:['standard','detailed','high']},emphasis:{type:'ARRAY',items:{type:'STRING'}}},required:['tone','pacing','detailLevel','emphasis']},
  actions:{type:'ARRAY',items:{type:'STRING'}},warnings:{type:'ARRAY',items:{type:'STRING'}},factsUsed:{type:'ARRAY',items:{type:'STRING'}}
 },required:['severity','priority','visualVariant','cards','spokenText','spokenSections','audioStyle','actions','warnings','factsUsed']};
}
async function generatePresentationPlan(context,config,opts={}){
 const fallback=()=>{const r=buildPresentationPlanFallback({floodSituation:context.floodSituation,weatherAnalysis:context.weatherAnalysis,report:context.report});const v=parsePresentationPlan(r);if(!v.ok)throw new Error(v.errors.join('; '));return{...v.plan,provider:'fallback'}};
 if(!config?.content?.apiKey){if(config?.mode==='production'&&!config.dryRun)throw new Error('GEMINI_API_KEY is not configured');return fallback();}
 const input=buildGeminiReportInput({floodSituation:context.floodSituation,weatherAnalysis:context.weatherAnalysis,location:context.location,date:context.date});
 const prompt=[
  'คุณคือ Presentation Planner ของน้องจุ่นจ้าน ไม่ใช่แหล่งข้อเท็จจริง',
  'สร้างรายงานภาษาไทยสำหรับบ้านลำพาย โดยใช้เฉพาะ facts JSON ที่ให้มา ห้ามค้นเว็บ ห้ามเดา ห้ามเพิ่มตัวเลข สถานี ถนน เวลา หรือเหตุการณ์',
  'severity, priority และ visualVariant ต้องตรงกับ floodSituation.severity ทุกประการ',
  'Card 1 ต้องอ่านจบได้เองและบอกสถานการณ์น้ำทันที; critical ต้องมีคำแนะนำสำคัญใน Card 1; unknown ต้องบอกความไม่แน่นอน',
  'เลือกจำนวนการ์ดตามความสำคัญ ไม่ต้องมีจำนวนตายตัว และทำให้แต่ละการ์ดสั้นสำหรับการเลื่อนแนวนอน',
  'เสียงไม่กำหนดเวลาตายตัว: เลือกความละเอียดตามสถานการณ์และเขียน spokenText ที่ละเอียดพอ ไม่ตัดข้อเท็จจริงสำคัญ',
  'ห้ามพูดถึงราคาปาล์ม ราคายาง ข่าวสารทั่วไป และห้ามใช้คำยืนยันเกิน facts',
  'CTA ใช้ได้เฉพาะ https://cctv.maholan.net/ https://chachoengsao-flood.vercel.app/phatthalung https://chachoengsao-flood.vercel.app/phatthalung/weather',
  'ตอบ JSON ตาม schema เท่านั้น',JSON.stringify(input)
 ].join('\n');
 const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',thinkingConfig:{thinkingLevel:config.content.thinkingLevel},responseSchema:plannerSchema()}};
 const url=GEMINI_BASE_URL+'/'+encodeURIComponent(config.content.model)+':generateContent';
 const result=await fetchGeminiContent(opts.fetchImpl||fetch,url,{method:'POST',headers:{'x-goog-api-key':config.content.apiKey,'Content-Type':'application/json'},body:JSON.stringify(body)},opts.maxAttempts||2);
 let res=result?.response||result;
 if(!res.ok&&res.status===503){
  const recoveryBody={contents:[{role:'user',parts:[{text:prompt+'\nหาก schema ไม่ได้ ให้ตอบ JSON ธรรมดาเท่านั้น ห้ามใส่ markdown'}]}]};
  const rr=await fetchGeminiContent(opts.fetchImpl||fetch,url,{method:'POST',headers:{'x-goog-api-key':config.content.apiKey,'Content-Type':'application/json'},body:JSON.stringify(recoveryBody)},opts.recoveryAttempts||1);
  res=rr?.response||rr;
 }
 if(!res.ok)throw Object.assign(new Error('Gemini presentation plan request failed: '+res.status),{stage:'content.presentation',retryable:res.status===429||res.status>=500});
 const parsed=parsePresentationPlan(parseGeminiJsonText(extractText(await res.json())));
 if(!parsed.ok)throw Object.assign(new Error('Gemini presentation plan validation failed: '+parsed.errors.join('; ')),{stage:'content.presentation'});
 if(parsed.plan.severity!==context.floodSituation?.severity)throw Object.assign(new Error('Presentation planner changed verified flood severity'),{stage:'content.presentation'});
 const factsUsed=parsed.plan.factsUsed?.length?parsed.plan.factsUsed:(context.report?.factsUsed||[]);if(!factsUsed.length)throw Object.assign(new Error('Presentation planner has no factsUsed trace'),{stage:'content.presentation'});return {...parsed.plan,factsUsed,provider:'gemini'};
}
module.exports={generatePresentationPlan,plannerSchema};
