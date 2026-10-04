const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFloodSituation, createUnknownFloodSituation, validateFloodSituation } = require('../src/flood/contract');

test('FloodSituation normalizes valid severity/trend/freshness', () => {
  const s = normalizeFloodSituation({
    severity:'watch', summary:'มีสถานีใกล้ล้นตลิ่ง', trend:'rising',
    location:{name:'บ้านลำพาย',province:'พัทลุง'},
    source:{name:'ศูนย์ข้อมูลน้ำพัทลุง',url:'https://example.test/flood'},
    observedAt:'2026-10-04T00:00:00+07:00',
    retrievedAt:'2026-10-04T01:00:00+07:00'
  }, {freshnessLimitMinutes:180});
  assert.equal(s.severity,'watch');
  assert.equal(s.trend,'rising');
  assert.equal(s.freshness.state,'fresh');
  assert.deepEqual(validateFloodSituation(s),[]);
});

test('FloodSituation marks old observations stale', () => {
  const s = normalizeFloodSituation({
    severity:'normal', summary:'ข้อมูลเก่า', location:{name:'บ้านลำพาย'},
    source:{name:'source'}, observedAt:'2026-10-03T00:00:00+07:00',
    retrievedAt:'2026-10-04T00:00:00+07:00'
  }, {freshnessLimitMinutes:180});
  assert.equal(s.freshness.state,'stale');
  assert.ok(s.freshness.ageMinutes > 180);
});

test('unknown flood situation has explicit limitation', () => {
  const s = createUnknownFloodSituation({
    location:{name:'บ้านลำพาย',province:'พัทลุง'},
    source:{name:'source unavailable'},
    retrievedAt:'2026-10-04T00:00:00+07:00'
  });
  assert.equal(s.severity,'unknown');
  assert.match(s.summary,/ยืนยัน/);
  assert.deepEqual(validateFloodSituation(s),[]);
});

test('invalid flood contract is rejected', () => {
  const errors = validateFloodSituation({severity:'critical'});
  assert.ok(errors.length >= 3);
});

test('stale state cannot claim zero age', () => {
  const s = normalizeFloodSituation({
    severity:'normal', summary:'ข้อมูลเก่า', location:{name:'บ้านลำพาย'},
    source:{name:'source'}, freshness:{state:'stale',ageMinutes:0}
  });
  assert.ok(validateFloodSituation(s).includes('stale freshness must have positive ageMinutes'));
});