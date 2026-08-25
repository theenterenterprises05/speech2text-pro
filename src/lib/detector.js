/**
 * Script / language detection helpers.
 * Classifies a transcript as Hindi, English, Hinglish (code-mixed) or unknown
 * so the dashboard can auto-label rows and filter by language.
 */
function countScripts(text) {
  let devanagari = 0;
  let latin = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x0900 && code <= 0x097f) devanagari += 1;
    else if (/[A-Za-z]/.test(ch)) latin += 1;
  }
  return { devanagari, latin };
}

/** Returns 'hinglish' | 'hindi' | 'english' | 'unknown' */
function detectLanguage(text) {
  const { devanagari, latin } = countScripts(text || '');
  if (devanagari > 0 && latin > 0) return 'hinglish';
  if (devanagari > 0) return 'hindi';
  if (latin > 0) return 'english';
  return 'unknown';
}

function wordCount(text) {
  const tokens = (text || '').trim().split(/\s+/).filter(Boolean);
  return tokens.length;
}

module.exports = { detectLanguage, countScripts, wordCount };
