/**
 * Seed the database with demo Hinglish transcriptions (no-op if data exists).
 *   npm run seed
 */
const { init, store } = require('../src/lib/db');

const SAMPLES = [
  { text: 'mera naam Ayush hai, I am a software developer from Pune', language: 'hinglish', duration_ms: 6200 },
  { text: 'हम अपनी टीम के साथ मिलकर इस feature को जल्दी ship करेंगे', language: 'hinglish', duration_ms: 5100 },
  { text: 'the client requested a CSV export by tomorrow morning', language: 'english', duration_ms: 4300 },
  { text: 'कृपया production bug को पहले fix करें, फिर नई सुविधाओं पर आगे बढ़ें', language: 'hindi', duration_ms: 5900 },
  { text: 'main is sprint mein API integration aur unit tests complete karunga', language: 'hinglish', duration_ms: 6800 },
];

(async () => {
  await init();
  const existing = await store.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} transcription(s) — nothing seeded.`);
    process.exit(0);
  }
  for (const s of SAMPLES) {
    const row = await store.create(s);
    console.log(`Seeded #${row.id}: ${s.text.slice(0, 60)}…`);
  }
  console.log(`Seeded ${SAMPLES.length} demo transcriptions.`);
  process.exit(0);
})().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
