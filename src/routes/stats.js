const { Router } = require('express');
const { store } = require('../lib/db');

const router = Router();

/** GET /api/stats — dashboard aggregates */
router.get('/', async (req, res, next) => {
  try {
    res.json(await store.stats());
  } catch (e) { next(e); }
});

module.exports = router;
