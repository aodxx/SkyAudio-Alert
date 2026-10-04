const EXPLAINER_LIBRARY_VERSION = '1.0.0';
const REVIEW_STATUS = 'pending_community_review';

const EXPLAINERS = Object.freeze([
  {
    id: 'opening.orientation',
    category: 'structure',
    text: 'รายการนี้จะแยกสิ่งที่ข้อมูลต้นทางยืนยันได้ออกจากสิ่งที่ยังต้องติดตาม หากต้องการฟังเฉพาะประเด็นสำคัญ ให้ฟังช่วงสรุปท้ายรายการได้',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'severity.normal',
    category: 'severity',
    text: 'คำว่าปกติหมายถึงข้อมูลต้นทางจัดสถานการณ์ไว้ในระดับปกติ ณ เวลาที่สังเกต ไม่ใช่คำรับประกันว่าสถานการณ์จะไม่เปลี่ยนแปลง',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'severity.watch',
    category: 'severity',
    text: 'คำว่าเฝ้าระวังหมายถึงควรติดตามข้อมูลต้นทางต่อเนื่อง และพิจารณาร่วมกับเวลาอัปเดตและแนวโน้มที่รายงาน',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'severity.affected',
    category: 'severity',
    text: 'คำว่าได้รับผลกระทบใช้เมื่อข้อมูลต้นทางระบุพื้นที่หรือเส้นทางที่ได้รับผลกระทบ รายการนี้จะกล่าวถึงเฉพาะชื่อที่มีอยู่ในข้อมูล',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'severity.critical',
    category: 'severity',
    text: 'คำว่าวิกฤตเป็นระดับที่ข้อมูลต้นทางรายงาน ควรติดตามประกาศจากหน่วยงานที่รับผิดชอบและปฏิบัติตามคำแนะนำอย่างเป็นทางการ',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'severity.unknown',
    category: 'severity',
    text: 'เมื่อข้อมูลยังยืนยันไม่ได้ เราจะไม่สรุปว่าเกิดน้ำท่วมหรือปลอดภัย ควรตรวจสอบข้อมูลล่าสุดจากแหล่งที่ระบุไว้',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'weather.rain-is-not-flood-proof',
    category: 'weather-context',
    text: 'โอกาสฝนเป็นข้อมูลพยากรณ์อากาศ ไม่ใช่หลักฐานยืนยันว่ามีน้ำท่วม การประเมินสถานการณ์น้ำต้องอ้างอิงข้อมูลน้ำจากแหล่งต้นทาง',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'water.distance-to-bank',
    category: 'water-context',
    text: 'ค่าระยะต่ำกว่าตลิ่งควรอ่านตามหน่วยและคำอธิบายของสถานีต้นทาง ค่านี้ไม่ควรถูกแปลงเป็นการคาดการณ์ว่าจะเกิดน้ำล้นเมื่อใด',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'source.checking-limits',
    category: 'source-literacy',
    text: 'ภาพจากกล้องและหน้าเว็บช่วยให้ตรวจสอบข้อมูลได้อีกทางหนึ่ง แต่อาจมีเวลาหน่วงหรือมองเห็นพื้นที่ไม่ครบ จึงควรดูเวลาที่อัปเดตและประกาศจากหน่วยงานร่วมด้วย',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'preparedness.general',
    category: 'preparedness',
    text: 'การเตรียมตัวทั่วไปอาจรวมถึงทำให้โทรศัพท์พร้อมใช้งาน จัดของจำเป็นและยาประจำตัวไว้หยิบได้สะดวก และช่วยกันดูแลผู้ที่ต้องการความช่วยเหลือ โดยให้ยึดประกาศทางการเป็นหลัก',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'recap.focus',
    category: 'structure',
    text: 'ช่วงนี้จะทวนระดับสถานการณ์ แนวโน้ม และสิ่งที่ข้อมูลระบุให้ติดตาม โดยไม่เพิ่มข้อเท็จจริงนอกเหนือจากที่กล่าวมา',
    reviewStatus: REVIEW_STATUS,
  },
  {
    id: 'closing.next-update',
    category: 'structure',
    text: 'ขอให้ติดตามข้อมูลต้นทางเมื่อมีการอัปเดต แล้วพบกันใหม่ในรายงานครั้งถัดไป',
    reviewStatus: REVIEW_STATUS,
  },
]);

const EXPLAINER_BY_ID = Object.freeze(Object.fromEntries(EXPLAINERS.map((entry) => [entry.id, entry])));

function getExplainer(id) {
  return EXPLAINER_BY_ID[id];
}

module.exports = { EXPLAINER_LIBRARY_VERSION, REVIEW_STATUS, EXPLAINERS, getExplainer };
