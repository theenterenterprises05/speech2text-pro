/**
 * End-to-end HTTP smoke test for the Speech2Text Pro API.
 *   BASE_URL=http://localhost:3123 node tests/smoke.test.js
 * Exits non-zero on any failed assertion — CI-friendly.
 */
const BASE = process.env.BASE_URL || 'http://localhost:3123';

let passCount = 0;
let failCount = 0;

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, cond, extra = '') {
  if (cond) {
    passCount += 1;
    console.log(`  ✅ PASS  ${name}`);
  } else {
    failCount += 1;
    console.log(`  ❌ FAIL  ${name} ${extra}`);
  }
}

(async () => {
  console.log(`\nSmoke test → ${BASE}\n`);

  // 1. health
  const health = await call('GET', '/api/health');
  check('GET /api/health returns ok', health.status === 200 && health.data.ok === true, JSON.stringify(health.data));

  // 2. create
  const created = await call('POST', '/api/transcriptions', {
    text: 'mera naam Ayush hai, I am a full stack developer',
    language: 'hinglish',
    duration_ms: 4100,
  });
  check('POST /api/transcriptions creates row', created.status === 201 && created.data.id > 0, JSON.stringify(created.data));
  const id = created.data.id;

  // 3. validation
  const bad = await call('POST', '/api/transcriptions', { text: '' });
  check('POST rejects empty text (400)', bad.status === 400);

  // 4. list
  const list = await call('GET', '/api/transcriptions');
  check('GET /api/transcriptions lists rows', list.status === 200 && Array.isArray(list.data) && list.data.length >= 1);

  // 5. get by id
  const got = await call('GET', `/api/transcriptions/${id}`);
  check('GET /api/transcriptions/:id returns row', got.status === 200 && got.data.id === id);

  // 6. search
  const found = await call('GET', '/api/transcriptions?search=Ayush');
  check('Search finds "Ayush"', found.status === 200 && found.data.length >= 1);

  // 7. update
  const updated = await call('PUT', `/api/transcriptions/${id}`, { text: 'main ek full stack developer hoon, building with Node and PostgreSQL' });
  check('PUT updates text', updated.status === 200 && updated.data.text.includes('PostgreSQL'), JSON.stringify(updated.data));

  // 8. stats
  const stats = await call('GET', '/api/stats');
  check('GET /api/stats returns aggregates', stats.status === 200 && typeof stats.data.total === 'number' && stats.data.total >= 1, JSON.stringify(stats.data));

  // 9. delete one
  const del = await call('DELETE', `/api/transcriptions/${id}`);
  check('DELETE /api/transcriptions/:id removes row', del.status === 200 && del.data.ok === true);

  // 10. delete-all
  await call('POST', '/api/transcriptions', { text: 'temporary row for cleanup test', language: 'english' });
  const clear = await call('DELETE', '/api/transcriptions');
  check('DELETE /api/transcriptions clears all', clear.status === 200 && clear.data.deleted >= 1);

  // 11. 404
  const missing = await call('GET', '/api/transcriptions/999999');
  check('Unknown id → 404', missing.status === 404);

  console.log(`\n${passCount} passed, ${failCount} failed\n`);
  process.exit(failCount > 0 ? 1 : 0);
})().catch((e) => {
  console.error('Smoke test crashed:', e.message);
  process.exit(1);
});
