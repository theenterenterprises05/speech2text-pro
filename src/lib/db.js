/**
 * Data layer.
 * - Production : PostgreSQL via DATABASE_URL (schema auto-created).
 * - Dev/demo   : in-memory store, so `npm start` runs anywhere with zero setup.
 * Both implement the same interface, so swapping in MySQL/SQLite later is trivial.
 */
const { Pool } = require('pg');
const config = require('../config');
const { wordCount } = require('./detector');

const usePostgres = config.databaseUrl.length > 0;
let pool = null;
const memory = { rows: [], nextId: 1 };

async function init() {
  if (!usePostgres) return;
  pool = new Pool({ connectionString: config.databaseUrl, max: 10 });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transcriptions (
      id          SERIAL PRIMARY KEY,
      text        TEXT        NOT NULL,
      language    VARCHAR(20) NOT NULL DEFAULT 'auto',
      duration_ms INTEGER     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

const store = {
  dbType: () => (usePostgres ? 'postgres' : 'memory'),

  async create({ text, language = 'auto', duration_ms = 0 }) {
    const lang = String(language || 'auto').slice(0, 20);
    const ms = Number.isFinite(duration_ms) ? Math.max(0, Math.round(duration_ms)) : 0;
    if (usePostgres) {
      const { rows } = await pool.query(
        `INSERT INTO transcriptions (text, language, duration_ms)
         VALUES ($1, $2, $3) RETURNING *`,
        [text, lang, ms]
      );
      return rows[0];
    }
    const row = {
      id: memory.nextId++,
      text,
      language: lang,
      duration_ms: ms,
      created_at: new Date().toISOString(),
    };
    memory.rows.push(row);
    return { ...row };
  },

  async list({ search = '', language = '', limit = 100, offset = 0 } = {}) {
    const lim = Math.min(Number(limit) || 100, 500);
    const off = Math.max(Number(offset) || 0, 0);
    if (usePostgres) {
      const { rows } = await pool.query(
        `SELECT * FROM transcriptions
         WHERE ($1 = '' OR text ILIKE '%' || $1 || '%')
           AND ($2 = '' OR language = $2)
         ORDER BY created_at DESC, id DESC
         LIMIT $3 OFFSET $4`,
        [String(search), String(language), lim, off]
      );
      return rows;
    }
    let rows = memory.rows.filter(
      (r) =>
        (!search || r.text.toLowerCase().includes(String(search).toLowerCase())) &&
        (!language || r.language === language)
    );
    rows = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return rows.slice(off, off + lim);
  },

  async get(id) {
    const nid = Number(id);
    if (usePostgres) {
      const { rows } = await pool.query(`SELECT * FROM transcriptions WHERE id = $1`, [nid]);
      return rows[0] || null;
    }
    return memory.rows.find((r) => r.id === nid) || null;
  },

  async update(id, { text, language }) {
    const nid = Number(id);
    if (usePostgres) {
      const { rows } = await pool.query(
        `UPDATE transcriptions
         SET text = COALESCE($2, text), language = COALESCE($3, language)
         WHERE id = $1 RETURNING *`,
        [nid, text || null, language || null]
      );
      return rows[0] || null;
    }
    const row = memory.rows.find((r) => r.id === nid);
    if (!row) return null;
    if (text) row.text = text;
    if (language) row.language = String(language).slice(0, 20);
    return { ...row };
  },

  async remove(id) {
    const nid = Number(id);
    if (usePostgres) {
      const { rowCount } = await pool.query(`DELETE FROM transcriptions WHERE id = $1`, [nid]);
      return rowCount > 0;
    }
    const idx = memory.rows.findIndex((r) => r.id === nid);
    if (idx === -1) return false;
    memory.rows.splice(idx, 1);
    return true;
  },

  async clear() {
    if (usePostgres) {
      const { rowCount } = await pool.query(`DELETE FROM transcriptions`);
      return rowCount;
    }
    const n = memory.rows.length;
    memory.rows = [];
    return n;
  },

  async count() {
    if (usePostgres) {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM transcriptions`);
      return rows[0].n;
    }
    return memory.rows.length;
  },

  async all() {
    if (usePostgres) {
      const { rows } = await pool.query(`SELECT * FROM transcriptions ORDER BY created_at DESC, id DESC LIMIT 1000`);
      return rows;
    }
    return [...memory.rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  /** Dashboard aggregates: totals + language breakdown (db-agnostic). */
  async stats() {
    const rows = await this.all();
    let words = 0;
    let chars = 0;
    let today = 0;
    const byLanguage = {};
    const now = new Date();
    const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    for (const r of rows) {
      words += wordCount(r.text);
      chars += r.text.length;
      const created = new Date(r.created_at);
      if (created.getTime() >= todayStart) today += 1;
      const key = r.language || 'auto';
      byLanguage[key] = (byLanguage[key] || 0) + 1;
    }
    return { total: rows.length, words, chars, today, byLanguage };
  },
};

module.exports = { init, store };
