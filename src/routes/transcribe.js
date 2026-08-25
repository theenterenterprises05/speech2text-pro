const { Router } = require('express');
const { enabled, transcribe } = require('../services/gemini');

const router = Router();

/**
 * POST /api/transcribe — { audioBase64, mimeType } → { text }
 * Optional AI transcription via Gemini (free tier). 503 when not configured.
 */
router.post('/', async (req, res, next) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ error: 'audioBase64 is required' });
    }
    if (!enabled()) {
      return res.status(503).json({
        error: 'GEMINI_API_KEY not configured. Set it in .env to enable server-side AI transcription.',
      });
    }
    const text = await transcribe(audioBase64, mimeType || 'audio/webm');
    res.json({ text });
  } catch (e) { next(e); }
});

module.exports = router;
