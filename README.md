# 🎙️ Speech2Text Pro — Real-time Multilingual Transcription

A **world-class, zero-paid-key** web app that transcribes speech in real time,
natively handles code-mixed **Hindi + English (Hinglish)**, stores every
transcription in a relational database, and provides a **dashboard with full
CRUD** — plus optional AI transcription via the **Gemini free API**.

Built as **Assignment 1: Real-time Transcription** for the Procucev AI Tech
Hiring Assignment.

---

## ✨ Features

- **Real-time STT** — words appear as you speak (interim + final results), continuous session
- **Multilingual** — Hindi (हिन्दी), English, and code-mixed **Hinglish** with script detection (auto-label)
- **✨ AI Transcribe** — optional server-side Gemini transcription (`POST /api/transcribe`) for higher accuracy on mixed speech
- **History dashboard** — save, search, language filter, edit (modal), delete (single + all), **TXT export**
- **Live stats** — saved count, words, today, per-language breakdown chips
- **TTS playback** — free open-source browser SpeechSynthesis, script-aware voice auto-pick (Hindi/English)
- **Waveform visualizer** — canvas + Web Audio AnalyserNode reacts while you speak
- **PostgreSQL** storage with auto schema; in-memory dev fallback so `npm start` works with zero setup
- **Docker-ready** — `docker compose up` runs app + PostgreSQL 16

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML + CSS + vanilla JS (no build step) |
| Backend | Node.js + Express (layered: routes → services → lib) |
| Database | PostgreSQL 16 (`pg`), in-memory fallback for dev |
| STT | Web Speech API (browser) + optional Gemini REST (free key) |
| TTS | Web SpeechSynthesis (browser, free/offline) |
| Deploy | Render / Railway / Fly.io, or `docker compose` |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐        ┌────────────────────────┐
│                Browser (Dashboard)          │  REST  │   Optional Gemini API  │
│  Web Speech API ─► live transcript (live)   │◄──────►│  /api/transcribe (AI)  │
│  SpeechSynthesis ◄─ TTS playback            │        │  gemini-3.1-flash      │
│  AnalyserNode ─► waveform canvas            │        └────────────────────────┘
└──────────────────────┬──────────────────────┘
                       │  /api/transcriptions (CRUD) + /api/stats
                       ▼
            ┌──────────────────────┐
            │  Express server      │──► PostgreSQL (transcriptions) / in-memory
            │  src/server.js       │
            └──────────────────────┘
```

## 📦 Project Structure

```
speech2text-pro/
├── public/                  # Frontend (vanilla JS, no build step)
│   ├── index.html           # Dashboard UI
│   ├── style.css
│   └── app.js               # STT / AI / TTS / waveform / CRUD
├── src/
│   ├── server.js            # Express bootstrap
│   ├── config.js            # Env config
│   ├── lib/
│   │   ├── db.js            # PostgreSQL + in-memory store (same interface)
│   │   └── detector.js      # Hinglish/Hindi/English script detection
│   ├── routes/              # health, transcriptions, stats, transcribe
│   └── services/
│       └── gemini.js        # Optional AI transcription (free API)
├── scripts/seed.js          # Demo Hinglish data (npm run seed)
├── tests/smoke.test.js      # E2E HTTP smoke test (npm test)
├── REQUIREMENTS.md          # Requirement → implementation mapping
├── Dockerfile / docker-compose.yml
└── .env.example
```

## 🚀 Quick Start

**Docker (recommended):**
```bash
docker compose up --build
# open http://localhost:3000
```

**Manual:**
```bash
npm install
cp .env.example .env        # optional: set DATABASE_URL + GEMINI_API_KEY
npm start                   # open http://localhost:3000
npm run seed                # optional demo data
npm test                    # E2E smoke test (11 checks)
```

## 🗄️ Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | Server port |
| `DATABASE_URL` | no | *(in-memory)* | PostgreSQL connection string |
| `GEMINI_API_KEY` | no | — | Enables AI transcription (free: aistudio.google.com/apikey) |
| `GEMINI_MODEL` | no | `gemini-3.1-flash` | Gemini model for /api/transcribe |

## 🔌 REST API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Status: db engine, gemini on/off |
| POST | `/api/transcriptions` | Create transcription |
| GET | `/api/transcriptions` | List (`search`, `language`, `limit`, `offset`) |
| GET | `/api/transcriptions/:id` | Get one |
| PUT | `/api/transcriptions/:id` | Update |
| DELETE | `/api/transcriptions/:id` | Delete one |
| DELETE | `/api/transcriptions` | Delete all |
| GET | `/api/stats` | Aggregates (total, words, today, by language) |
| POST | `/api/transcribe` | AI STT: `{audioBase64, mimeType}` → `{text}` (needs key) |

## ☁️ Deployment

1. Push to GitHub, create a **Render/Railway** web service from the repo.
2. Add a managed PostgreSQL (e.g. Neon) and set `DATABASE_URL`.
3. Set `GEMINI_API_KEY` (optional, free).
4. Deploy — the URL is HTTPS automatically. **HTTPS is required for the microphone.**

## ✅ Assignment Coverage (see REQUIREMENTS.md for full mapping)

Real-time STT ✅ · Multilingual Hinglish ✅ · DB storage ✅ · History + CRUD ✅ ·
Free/open-source STT (Web Speech + optional Gemini free) ✅ · Open-source TTS ✅ ·
GitHub repo ✅ · Deployed link ✅ · Partial-acceptance-friendly ✅

## 📄 License

MIT — free to use.
