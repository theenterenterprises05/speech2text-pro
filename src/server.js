/**
 * Speech2Text Pro — Express server.
 * Serves the dashboard (public/) and exposes the REST API:
 *   /api/health, /api/stats, /api/transcriptions (CRUD), /api/transcribe (optional Gemini)
 */
const path = require('path');
const express = require('express');
const config = require('./config');
const { init, store } = require('./lib/db');
const healthRouter = require('./routes/health');
const transcriptionsRouter = require('./routes/transcriptions');
const statsRouter = require('./routes/stats');
const transcribeRouter = require('./routes/transcribe');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '30mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api', healthRouter);
app.use('/api/transcriptions', transcriptionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/transcribe', transcribeRouter);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

init()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`🎙️  Speech2Text Pro running at http://localhost:${config.port}`);
      console.log(`    database : ${store.dbType()}`);
      console.log(`    gemini   : ${require('./services/gemini').enabled() ? `on (${config.geminiModel})` : 'off (set GEMINI_API_KEY to enable AI transcription)'}`);
    });
  })
  .catch((e) => {
    console.error('Failed to start server:', e.message);
    process.exit(1);
  });
