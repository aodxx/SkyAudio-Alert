const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFloodSituation } = require('../src/flood/contract');
const severities=['normal','watch','affected','critical','unknown'];

for(const severity of severities){
  test(`fixture severity ${severity} remains representable`,()=>{
    const s=normalizeFloodSituation({
      severity,summary:`fixture-${severity}`,location:{name:'บ้านลำพาย',province:'พัทลุง'},
      source:{name:'fixture'},trend:'unknown',freshness:{state:severity==='unknown'?'unknown':'fresh',ageMinutes:severity==='unknown'?null:0}
    });
    assert.equal(s.severity,severity);
  });
}