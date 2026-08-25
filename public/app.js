import { animate, spring, stagger } from "https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm";

/* ============ Speech2Text Pro — frontend ============
 * STT  : Web Speech API (client-side, free, multilingual, real-time)
 * AI   : optional Gemini REST (server-side) via /api/transcribe
 * TTS  : Web SpeechSynthesis (open-source, offline), script-aware voice pick
 * Wave : canvas visualizer (Web Audio AnalyserNode where available)
 * ==================================================== */

const $ = (id) => document.getElementById(id);

const els = {
  dynamicBg: $('dynamic-bg'),
  engineStatus: $('engineStatus'),
  statChips: $('statChips'),
  liveBadge: $('liveBadge'),
  timer: $('timer'),
  langSelect: $('langSelect'),
  voiceSelect: $('voiceSelect'),
  micBtn: $('micBtn'),
  aiBtn: $('aiBtn'),
  speakBtn: $('speakBtn'),
  copyBtn: $('copyBtn'),
  saveBtn: $('saveBtn'),
  clearBtn: $('clearBtn'),
  placeholder: $('placeholder'),
  finalText: $('finalText'),
  interimText: $('interimText'),
  langDetect: $('langDetect'),
  waveform: $('waveform'),
  refreshBtn: $('refreshBtn'),
  exportBtn: $('exportBtn'),
  searchInput: $('searchInput'),
  langFilter: $('langFilter'),
  clearAllBtn: $('clearAllBtn'),
  countPill: $('countPill'),
  historyBody: $('historyBody'),
  modalBackdrop: $('modalBackdrop'),
  editText: $('editText'),
  cancelEditBtn: $('cancelEditBtn'),
  saveEditBtn: $('saveEditBtn'),
  toast: $('toast'),
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const state = {
  recording: false,
  aiMode: false,
  finalText: '',
  interimText: '',
  lang: 'hi-IN',
  recStart: 0,
  recognition: null,
  voices: [],
  mediaRecorder: null,
  chunks: [],
  stream: null,
  analyser: null,
  editingId: null,
  geminiOn: false,
  health: null,
};

/* ---------------- helpers ---------------- */
let toastTimer;
function toast(msg, type = 'info') {
  els.toast.textContent = msg;
  els.toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (els.toast.className = 'toast hidden'), 3000);
}

async function api(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const hasDevanagari = (t) => /[\u0900-\u097F]/.test(t);
const LANG_LABEL = { hindi: 'हिन्दी', english: 'English', hinglish: 'Hinglish', auto: 'Auto', 'hi-IN': 'हिन्दी+EN', 'en-IN': 'English (IN)', 'en-US': 'English (US)' };
const langLabel = (l) => LANG_LABEL[l] || l;

function fmtTime(iso) {
  try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return String(iso); }
}

function clientScriptGuess(text) {
  if (hasDevanagari(text) && /[A-Za-z]/.test(text)) return 'hinglish';
  if (hasDevanagari(text)) return 'hindi';
  return 'english';
}

/* ---------------- live STT ---------------- */
function renderLive() {
  els.finalText.textContent = state.finalText;
  els.interimText.textContent = state.interimText;
  const live = (state.finalText + ' ' + state.interimText).trim();
  els.placeholder.classList.toggle('hidden', !!live);
  els.saveBtn.disabled = !state.finalText.trim();
  if (live) els.langDetect.textContent = `Detected: ${langLabel(clientScriptGuess(live))}`;
  else els.langDetect.textContent = '';
}

function startRecognition() {
  if (!SpeechRecognition) return;
  const rec = new SpeechRecognition();
  rec.lang = state.lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      const txt = r[0].transcript;
      if (r.isFinal) final += txt;
      else interim += txt;
    }
    if (final) state.finalText += final;
    state.interimText = interim;
    renderLive();
  };

  rec.onerror = (e) => {
    if (e.error === 'not-allowed') toast('Microphone permission denied — check browser settings.', 'error');
    else if (e.error === 'no-speech') toast('No speech detected — try again.', 'error');
    else toast(`Recognition error: ${e.error}`, 'error');
    stopSTT();
  };

  rec.onend = () => { if (state.recording) { try { rec.start(); } catch { /* already started */ } } };

  state.recognition = rec;
  state.recStart = Date.now();
  tickTimer();
  if (!state.timerId) state.timerId = setInterval(tickTimer, 500);
  rec.start();
}

function tickTimer() {
  const s = state.recording ? Math.floor((Date.now() - state.recStart) / 1000) : 0;
  els.timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  if (!state.recording && state.timerId) { clearInterval(state.timerId); state.timerId = null; }
}

function setSTT(on, aiMode = false) {
  state.recording = on;
  state.aiMode = aiMode;
  if (on) {
    els.dynamicBg.classList.add('active-recording');
    els.liveBadge.textContent = aiMode ? 'Recording for AI...' : 'Recording...';
    els.liveBadge.className = 'badge recording';
    if (aiMode) {
      els.aiBtn.textContent = 'Stop & Transcribe';
      els.aiBtn.classList.add('recording');
      els.micBtn.disabled = true;
    } else {
      els.micBtn.textContent = 'Stop Speaking';
      els.micBtn.classList.add('recording');
      els.aiBtn.disabled = true;
    }
  } else {
    els.dynamicBg.classList.remove('active-recording');
    els.liveBadge.textContent = 'Stopped';
    els.liveBadge.className = 'badge stopped';
    els.micBtn.textContent = 'Start Speaking';
    els.micBtn.classList.remove('recording');
    els.aiBtn.textContent = 'AI Transcribe';
    els.aiBtn.classList.remove('recording');
    els.micBtn.disabled = false;
    els.aiBtn.disabled = false;
    renderLive();
  }
}

function stopSTT() {
  if (!state.recording) return;
  state.recording = false;
  if (state.recognition) { try { state.recognition.stop(); } catch { /* ignore */ } }
  if (state.aiMode && state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.stop();
  }
  stopStream();
  setSTT(false);
}

function toggleSTT() {
  if (!SpeechRecognition) {
    toast('Browser Speech Recognition unsupported — use AI Transcribe (needs GEMINI_API_KEY) or Chrome/Edge.', 'error');
    return;
  }
  if (state.recording) { stopSTT(); return; }
  setSTT(true, false);
  state.recStart = Date.now();
  startRecognition();
}

/* ---------------- AI transcribe (MediaRecorder → Gemini) ---------------- */
async function toggleAI() {
  if (state.recording) { stopSTT(); return; }
  if (!state.geminiOn) {
    toast('Gemini API not configured on the server — set GEMINI_API_KEY to use AI Transcribe.', 'error');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.stream = stream;
    setupAnalyser(stream);
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
    state.mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    state.chunks = [];
    state.mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) state.chunks.push(e.data); };
    state.mediaRecorder.onstop = async () => {
      stopStream();
      const blob = new Blob(state.chunks, { type: mime });
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = String(reader.result).split(',')[1];
        try {
          const r = await api('/api/transcribe', {
            method: 'POST',
            body: JSON.stringify({ audioBase64: base64, mimeType: mime }),
          });
          state.finalText = (state.finalText + ' ' + r.text).trim();
          renderLive();
          toast('AI transcription complete');
        } catch (e) { toast(e.message, 'error'); }
      };
      reader.readAsDataURL(blob);
    };
    state.recStart = Date.now();
    tickTimer();
    if (!state.timerId) state.timerId = setInterval(tickTimer, 500);
    setSTT(true, true);
    state.mediaRecorder.start(500);
  } catch (e) {
    toast('Microphone unavailable: ' + e.message, 'error');
  }
}

function setupAnalyser(stream) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    state.analyser = ctx.createAnalyser();
    state.analyser.fftSize = 256;
    src.connect(state.analyser);
  } catch { state.analyser = null; }
}

function stopStream() {
  if (state.stream) { state.stream.getTracks().forEach((t) => t.stop()); state.stream = null; state.analyser = null; }
}

/* ---------------- waveform ---------------- */
const wf = els.waveform;
const wfCtx = wf.getContext('2d');
let wfRAF = null;

function drawWave() {
  wfRAF = requestAnimationFrame(drawWave);
  const w = wf.width, h = wf.height;
  wfCtx.clearRect(0, 0, w, h);
  if (!state.recording) { wfCtx.fillStyle = 'rgba(255,255,255,0.1)'; wfCtx.fillRect(0, h / 2 - 1, w, 2); return; }
  const bins = 96;
  let data = null;
  if (state.analyser) {
    data = new Uint8Array(state.analyser.frequencyBinCount);
    state.analyser.getByteFrequencyData(data);
  }
  
  // Sleek solid white/grey gradient instead of purple/cyan
  const grad = wfCtx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.4)'); 
  grad.addColorStop(0.5, 'rgba(255,255,255,0.9)'); 
  grad.addColorStop(1, 'rgba(255,255,255,0.4)');
  wfCtx.fillStyle = grad;
  
  const bw = w / bins;
  for (let i = 0; i < bins; i++) {
    let v;
    if (data) {
      const idx = Math.floor((i / bins) * data.length);
      v = data[idx] / 255;
    } else {
      v = 0.12 + 0.4 * Math.abs(Math.sin(i * 0.35 + Date.now() * 0.004)) * (0.6 + 0.4 * Math.sin(i * 0.13));
    }
    const bh = Math.max(3, v * h * 0.92);
    const x = i * bw;
    wfCtx.beginPath();
    wfCtx.roundRect(x + 1, (h - bh) / 2, Math.max(2, bw - 2), bh, 3);
    wfCtx.fill();
  }
}
if (wfCtx) drawWave();

/* ---------------- TTS ---------------- */
function loadVoices() {
  if (!('speechSynthesis' in window)) return;
  state.voices = speechSynthesis.getVoices();
  const opts = state.voices.filter((v) => /^hi|^en/.test(v.lang || ''));
  els.voiceSelect.innerHTML = '<option value="">Auto (script-aware)</option>' +
    opts.map((v) => `<option value="${v.name}">${v.name} (${v.lang})</option>`).join('');
}

function speak(text) {
  if (!('speechSynthesis' in window)) { toast('Browser TTS not supported.', 'error'); return; }
  if (!text.trim()) { toast('Nothing to listen to yet.', 'error'); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const wantHi = hasDevanagari(text);
  const chosen = els.voiceSelect.value;
  if (chosen) {
    const v = state.voices.find((x) => x.name === chosen);
    if (v) u.voice = v;
  } else {
    const pick = state.voices.find((v) => v.lang && ((wantHi && v.lang.startsWith('hi')) || (!wantHi && v.lang.startsWith('en'))));
    if (pick) u.voice = pick;
  }
  u.rate = 0.97;
  speechSynthesis.speak(u);
}

/* ---------------- live actions ---------------- */
function clearLive() {
  state.finalText = '';
  state.interimText = '';
  renderLive();
}

async function saveCurrent() {
  const text = state.finalText.trim();
  if (!text) { toast('Nothing to save — speak first.', 'error'); return; }
  try {
    const row = await api('/api/transcriptions', {
      method: 'POST',
      body: JSON.stringify({
        text,
        language: clientScriptGuess(text),
        duration_ms: state.recStart ? Math.max(0, Date.now() - state.recStart) : 0,
      }),
    });
    toast(`Saved #${row.id} (${langLabel(row.language)})`);
    loadList();
    loadStats();
  } catch (e) { toast(e.message, 'error'); }
}

function copyLive() {
  const text = (state.finalText + ' ' + state.interimText).trim();
  if (!text) { toast('Nothing to copy.', 'error'); return; }
  navigator.clipboard?.writeText(text).then(
    () => toast('Copied to clipboard'),
    () => toast('Copy failed — select manually.', 'error')
  );
}

/* ---------------- stats ---------------- */
async function loadStats() {
  try {
    const s = await api('/api/stats');
    const chips = [
      `<span class="chip">Saved: <b>${s.total}</b></span>`,
      `<span class="chip">Words: <b>${s.words}</b></span>`,
      `<span class="chip">Today: <b>${s.today}</b></span>`,
    ];
    for (const [lang, n] of Object.entries(s.byLanguage || {})) {
      chips.push(`<span class="chip lang-${lang}">${langLabel(lang)} <b>${n}</b></span>`);
    }
    els.statChips.innerHTML = chips.join('');
    
    // Animate chips in
    animate(".chip", { opacity: [0, 1], y: [10, 0] }, { delay: stagger(0.05), duration: 0.4 });
  } catch { /* non-fatal */ }
}

/* ---------------- history CRUD ---------------- */
async function loadList() {
  const q = els.searchInput.value.trim();
  const lang = els.langFilter.value;
  try {
    const rows = await api(`/api/transcriptions?search=${encodeURIComponent(q)}&language=${encodeURIComponent(lang)}&limit=200`);
    renderRows(rows);
    els.countPill.textContent = rows.length ? `· ${rows.length} shown` : '';
  } catch (e) {
    els.historyBody.innerHTML = `<tr><td colspan="5" class="empty">Failed to load: ${e.message}</td></tr>`;
  }
}

function renderRows(rows) {
  els.historyBody.innerHTML = '';
  if (!rows.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="empty">No transcriptions match — record something and press <b>Save</b>.</td>`;
    els.historyBody.appendChild(tr);
    return;
  }
  rows.forEach((t) => els.historyBody.appendChild(buildRow(t)));
  
  // Staggered animation for table rows using Motion
  animate("tbody tr", { opacity: [0, 1], x: [-10, 0] }, { delay: stagger(0.03), duration: 0.4 });
}

function buildRow(t) {
  const tr = document.createElement('tr');

  const tdText = document.createElement('td');
  const spanText = document.createElement('span');
  spanText.className = 'row-text';
  spanText.textContent = t.text;
  spanText.title = t.text;
  tdText.appendChild(spanText);

  const tdLang = document.createElement('td');
  const badge = document.createElement('span');
  badge.className = `lang-badge ${t.language || 'auto'}`;
  badge.textContent = langLabel(t.language || 'auto');
  tdLang.appendChild(badge);

  const tdWc = document.createElement('td');
  tdWc.className = 'wc';
  tdWc.textContent = t.text.trim().split(/\s+/).filter(Boolean).length;

  const tdTime = document.createElement('td');
  tdTime.className = 'time-cell';
  tdTime.textContent = fmtTime(t.created_at);

  const tdActions = document.createElement('td');
  tdActions.className = 'actions-col';
  const div = document.createElement('div');
  div.className = 'row-actions';
  div.append(
    iconBtn('Play', () => speak(t.text), 'Listen (TTS)'),
    iconBtn('Edit', () => openEdit(t), 'Edit'),
    iconBtn('Del', async () => {
      if (!confirm(`Delete transcription #${t.id}?`)) return;
      try {
        await api(`/api/transcriptions/${t.id}`, { method: 'DELETE' });
        toast(`Deleted #${t.id}`);
        // Fade out animation before removing
        animate(tr, { opacity: 0, height: 0 }, { duration: 0.3 }).finished.then(() => {
          loadList(); loadStats();
        });
      } catch (e) { toast(e.message, 'error'); }
    }, 'Delete', true)
  );
  tdActions.appendChild(div);

  tr.append(tdText, tdLang, tdWc, tdTime, tdActions);
  return tr;
}

function iconBtn(label, onClick, title, danger) {
  const b = document.createElement('button');
  b.className = `icon-btn${danger ? ' del' : ''}`;
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/* ---------------- edit modal ---------------- */
function openEdit(t) {
  state.editingId = t.id;
  els.editText.value = t.text;
  els.modalBackdrop.classList.remove('hidden');
  animate(els.modalBackdrop, { opacity: [0, 1] }, { duration: 0.2 });
  animate(".modal", { scale: [0.95, 1], opacity: [0, 1], y: [10, 0] }, { duration: 0.3, easing: spring() });
  els.editText.focus();
}
function closeEdit() {
  state.editingId = null;
  animate(".modal", { scale: 0.95, opacity: 0, y: 10 }, { duration: 0.2 });
  animate(els.modalBackdrop, { opacity: 0 }, { duration: 0.2 }).finished.then(() => {
    els.modalBackdrop.classList.add('hidden');
  });
}
async function saveEdit() {
  if (!state.editingId) return;
  const text = els.editText.value.trim();
  if (!text) { toast('Text cannot be empty.', 'error'); return; }
  try {
    await api(`/api/transcriptions/${state.editingId}`, {
      method: 'PUT',
      body: JSON.stringify({ text, language: clientScriptGuess(text) }),
    });
    toast('Updated');
    closeEdit();
    loadList(); loadStats();
  } catch (e) { toast(e.message, 'error'); }
}

async function clearAll() {
  if (!confirm('Delete ALL transcriptions? This cannot be undone.')) return;
  try {
    const r = await api('/api/transcriptions', { method: 'DELETE' });
    toast(`Deleted ${r.deleted} transcription(s)`);
    loadList(); loadStats();
  } catch (e) { toast(e.message, 'error'); }
}

async function exportTxt() {
  try {
    const rows = await api('/api/transcriptions?limit=1000');
    if (!rows.length) { toast('Nothing to export.', 'error'); return; }
    const lines = rows.map((r) => `[${fmtTime(r.created_at)}] (${langLabel(r.language || 'auto')}) ${r.text}`);
    const blob = new Blob(['Speech2Text Pro export\n=====================\n\n', lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `transcriptions-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) { toast(e.message, 'error'); }
}

/* ---------------- events ---------------- */
els.micBtn.addEventListener('click', toggleSTT);
els.aiBtn.addEventListener('click', toggleAI);
els.saveBtn.addEventListener('click', saveCurrent);
els.clearBtn.addEventListener('click', clearLive);
els.speakBtn.addEventListener('click', () => speak((state.finalText + ' ' + state.interimText).trim()));
els.copyBtn.addEventListener('click', copyLive);
els.refreshBtn.addEventListener('click', () => { loadList(); loadStats(); });
els.exportBtn.addEventListener('click', exportTxt);
els.clearAllBtn.addEventListener('click', clearAll);
els.cancelEditBtn.addEventListener('click', closeEdit);
els.saveEditBtn.addEventListener('click', saveEdit);
els.modalBackdrop.addEventListener('click', (e) => { if (e.target === els.modalBackdrop) closeEdit(); });
els.langSelect.addEventListener('change', () => {
  state.lang = els.langSelect.value;
  if (state.recording && !state.aiMode) { stopSTT(); setTimeout(toggleSTT, 80); } // restart with new language
});
els.langFilter.addEventListener('change', loadList);
let searchTimer;
els.searchInput.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(loadList, 300); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeEdit(); });
window.addEventListener('beforeunload', stopSTT);

/* ---------------- init ---------------- */
(async function init() {
  if (SpeechRecognition) els.engineStatus.textContent = 'Engine: Web Speech';
  else els.engineStatus.textContent = 'Engine: Unsupported';
  if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = loadVoices; }

  // Initial page load animations
  animate(".topbar", { opacity: [0, 1], y: [-20, 0] }, { duration: 0.6, easing: spring() });
  animate(".card", { opacity: [0, 1], y: [20, 0] }, { delay: stagger(0.1), duration: 0.6, easing: spring() });

  try {
    const h = await api('/api/health');
    state.health = h;
    state.geminiOn = !!h.gemini;
    els.engineStatus.textContent = `Engine: ${h.db === 'postgres' ? 'Postgres' : 'Memory'}${h.gemini ? ' + Gemini' : ''}`;
  } catch { /* non-fatal */ }

  loadStats();
  loadList();
})();
