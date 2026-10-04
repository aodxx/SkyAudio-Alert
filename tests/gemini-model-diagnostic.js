const assert = require('node:assert/strict');

const API_KEY = process.env.GEMINI_API_KEY;
const MODELS = [
  process.env.GEMINI_PRIMARY_MODEL || 'gemini-3.8-flash',
  process.env.GEMINI_COMPARISON_MODEL || 'gemini-3.7-flash',
];

if (!API_KEY) throw new Error('GEMINI_API_KEY is required');

async function probe(model, kind) {
  const body = kind === 'minimal'
    ? {
        contents: [{ role: 'user', parts: [{ text: 'ตอบคำว่า OK เท่านั้น' }] }],
        generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
      }
    : {
        contents: [{ role: 'user', parts: [{ text: [
          'ตอบเป็น JSON เท่านั้น',
          'ห้ามสร้างข้อเท็จจริงที่ไม่ได้ให้มา',
          JSON.stringify({
            flood: { severity: 'watch', summary: 'มีสถานีใกล้ล้นตลิ่ง ควรติดตามการเปลี่ยนแปลง', trend: 'rising' },
            weather: { description: 'มีเมฆมาก', temperature: 28, precipitationProbabilityMax: 70 },
            location: { name: 'บ้านลำพาย', district: 'ต.โคกชะงาย', province: 'พัทลุง' },
          }),
        ].join('\\n') }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: 'low' },
        },
      };

  const started = Date.now();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const elapsedMs = Date.now() - started;
  const text = await response.text();
  let detail = text;
  try {
    const json = JSON.parse(text);
    detail = json?.error ? JSON.stringify(json.error) : text;
  } catch (_) {}

  return {
    model,
    kind,
    status: response.status,
    ok: response.ok,
    elapsedMs,
    detail: detail.slice(0, 800),
  };
}

async function main() {
  const results = [];
  for (const model of MODELS) {
    results.push(await probe(model, 'minimal'));
    results.push(await probe(model, 'shaped'));
  }

  console.log(JSON.stringify({ ok: true, results }, null, 2));

  const primaryMinimal = results.find((r) => r.model === MODELS[0] && r.kind === 'minimal');
  const primaryShaped = results.find((r) => r.model === MODELS[0] && r.kind === 'shaped');
  assert.ok(primaryMinimal, 'Primary minimal probe missing');
  assert.ok(primaryShaped, 'Primary shaped probe missing');

  if (primaryMinimal.status >= 500) {
    console.log('DIAGNOSIS=primary_model_server_error');
  } else if (primaryMinimal.status === 429) {
    console.log('DIAGNOSIS=primary_model_rate_or_quota');
  } else if (primaryMinimal.ok && primaryShaped.status === 503) {
    console.log('DIAGNOSIS=primary_reachable_structured_output_capacity_error');
  } else if (primaryMinimal.ok && primaryShaped.ok) {
    console.log('DIAGNOSIS=primary_minimal_and_structured_reachable');
  } else if (primaryMinimal.ok) {
    console.log('DIAGNOSIS=primary_reachable_but_structured_request_error');
  } else {
    console.log('DIAGNOSIS=primary_model_request_or_auth_error');
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
