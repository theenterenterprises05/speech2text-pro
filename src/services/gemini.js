/**
 * Optional server-side AI transcription via the Google Gemini REST API.
 * Free API key from https://aistudio.google.com/apikey — turn on by setting
 * GEMINI_API_KEY. Handles code-mixed Hindi + English with high accuracy.
 */
const config = require('../config');

function enabled() {
  return config.geminiApiKey.length > 0;
}

async function transcribe(audioBase64, mimeType = 'audio/webm') {
  if (!enabled()) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  const url = `${config.geminiBase}/models/${config.geminiModel}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`;
  const body = {
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          {
            text:
              'Transcribe this speech exactly as spoken. It may mix Hindi and English ' +
              '(Hinglish). Output ONLY the transcription text with no commentary, no ' +
              'quotes, no timestamps. Preserve spoken words verbatim with accurate spelling.',
          },
        ],
      },
    ],
    generationConfig: { temperature: 0 },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error?.message || `Gemini API error (HTTP ${resp.status})`);
  }
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(' ').trim();
  if (!text) throw new Error('Gemini returned no transcription');
  return text;
}

module.exports = { enabled, transcribe };
