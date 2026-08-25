const { Router } = require('express');
const { store } = require('../lib/db');
const { enabled: geminiEnabled } = require('../services/gemini');

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'speech2text-pro',
    version: '2.0.0',
    db: store.dbType(),
    gemini: geminiEnabled(),
    time: new Date().toISOString(),
  });
});

module.exports = router;
