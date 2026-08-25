/** Centralised configuration loaded from environment variables. */
require('dotenv').config();

const cfg = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINT_API_KEY || process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  geminiBase: 'https://generativelanguage.googleapis.com/v1beta',
  maxTextLength: 10000,
};

console.log('[config] GEMINT_API_KEY set:', cfg.geminiApiKey.length > 0);
console.log('[config] GEMINI_MODEL:', cfg.geminiModel);
console.log('[config] DATABASE_URL set:', cfg.databaseUrl.length > 0);

module.exports = cfg;

