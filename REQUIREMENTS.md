# Speech2Text Pro — Requirement Checklist & Design Mapping

Source of truth: Procucev AI Tech Hiring Assignment (Assignment 1: Real-time Transcription),
read from https://docs.google.com/document/d/1yuN0C2D6RWEmNzxT-DcId4v9YiaTyPAqGYNqceLCYXM

## Assignment requirements (verbatim intent)
1. Web application "Speech to Text" — user speaks a sentence in real time.
2. Multilingual by nature — e.g. mixture of Hindi & English (Hinglish), transcribed real-time.
3. Database used to store transcriptions.
4. Transcription history visible in a dashboard with CRUD operations.
5. Note 1: use any self-deployed open source service for STT (e.g. Gemini 3.1 free API).
6. Note 2: TTS via any 3rd-party API allowed; open-source preferred.
7. Note 3: partial assignment acceptable — goal is assessing coding skills.
8. Deliverables: (a) GitHub repo link, (b) deployed app link on any cloud.
9. Submit answers + links to govardhan.sherkhane@procucev.com

## Design decisions
| # | Requirement | Implementation | Borrowed from InterviewOS | Built new |
|---|-------------|----------------|----------------------------|-----------|
| 1 | Real-time STT | Web Speech API (continuous, interim results) | — | Live state machine, restart-on-end loop |
| 2 | Multilingual Hinglish | hi-IN recognizer + script detection (Devanagari/Latin) | — | Language classifier + auto label |
| 3 | Database | PostgreSQL 16 (`transcriptions` table, auto-schema) + in-memory dev fallback | MongoDB/Mongoose pattern (repo) | pg pool, CRUD service layer |
| 4 | History + CRUD | Dashboard table: save, search, filter, edit modal, delete, delete-all, export | Recruiter-analytics dashboard concept | Full vanilla JS data grid |
| 5 | STT free/open-source | Web Speech API (0 cost, client-side); optional Gemini REST route `/api/transcribe` | Gemini SDK integration (repo) | Server route + env toggle |
| 6 | TTS | Browser SpeechSynthesis (open-source, offline), voice auto-pick hi/en | Web Audio voice UX (repo) | Script-aware voice selection |
| 7 | World-class extras | Waveform visualizer, live stats (words/chars/langs), timer, TXT export, seed data, smoke test | AnalyserNode visualizer concept | Canvas waveform, stats API, seed script, CI-able smoke test |
| 8 | Deploy | Render/Railway-ready: Dockerfile, docker-compose, HTTPS note | Render hosting (repo) | compose with pg healthcheck |

## Verification
- `node tests/smoke.test.js` runs a real HTTP smoke test (health → CRUD → stats → cleanup).
- Browser mic features require HTTPS or localhost (Chrome/Edge).
