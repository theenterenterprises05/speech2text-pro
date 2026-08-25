/** Centralised configuration loaded from environment variables. */
require('dotenv').config();

module.exports = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL || '', // empty => in-memory dev store
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.1-flash',
  geminiBase: 'https://generativelanguage.googleapis.com/v1beta',
  maxTextLength: 10000,
};
