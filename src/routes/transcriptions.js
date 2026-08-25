const { Router } = require('express');
const { store } = require('../lib/db');
const config = require('../config');

const router = Router();

/** POST /api/transcriptions — create */
router.post('/', async (req, res, next) => {
  try {
    const { text, language, duration_ms } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required and must be a non-empty string' });
    }
    if (text.length > config.maxTextLength) {
      return res.status(400).json({ error: `text must be at most ${config.maxTextLength} characters` });
    }
    const row = await store.create({
      text: text.trim(),
      language: language || 'auto',
      duration_ms: duration_ms || 0,
    });
    res.status(201).json(row);
  } catch (e) { next(e); }
});

/** GET /api/transcriptions — list (search + language filter + pagination) */
router.get('/', async (req, res, next) => {
  try {
    const rows = await store.list({
      search: req.query.search || '',
      language: req.query.language || '',
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /api/transcriptions/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const row = await store.get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Transcription not found' });
    res.json(row);
  } catch (e) { next(e); }
});

/** PUT /api/transcriptions/:id — update */
router.put('/:id', async (req, res, next) => {
  try {
    const { text, language } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required and must be a non-empty string' });
    }
    if (text.length > config.maxTextLength) {
      return res.status(400).json({ error: `text must be at most ${config.maxTextLength} characters` });
    }
    const row = await store.update(req.params.id, { text: text.trim(), language });
    if (!row) return res.status(404).json({ error: 'Transcription not found' });
    res.json(row);
  } catch (e) { next(e); }
});

/** DELETE /api/transcriptions/:id */
router.delete('/:id', async (req, res, next) => {
  try {
    const ok = await store.remove(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Transcription not found' });
    res.json({ ok: true, id: Number(req.params.id) });
  } catch (e) { next(e); }
});

/** DELETE /api/transcriptions — delete all */
router.delete('/', async (req, res, next) => {
  try {
    const deleted = await store.clear();
    res.json({ ok: true, deleted });
  } catch (e) { next(e); }
});

module.exports = router;
