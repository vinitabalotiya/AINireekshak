# AiNireekshak — Multilingual AI-Powered Hackathon Judging Platform

AiNireekshak is an automated AI hackathon judge designed to understand participants speaking naturally in Hindi, Hinglish, English and regional Indian languages. It preserves original spoken context, conducts interactive judging sessions with a synthetic AI avatar, analyzes project submissions, and generates structured, evidence-based scores.

---

## Key Features

- **Multilingual Speech Understanding** — Native Hindi, Hinglish, and English with context preservation and transient live captions.
- **Dynamic Anti-Replay Liveness Challenges (Anti-Spoofing)** —
  - Cryptographically random challenges (4–5 per pitch, min 20s gap, 5s response window + 1s grace, unique nonces).
  - Challenge pool: Hand gestures (`Open_Palm` 🖐️, `Thumb_Up` 👍, `Victory` ✌️) via MediaPipe Gesture Recognizer (confidence ≥ 0.7 held ≥ 500ms); Head turns (`Turn head LEFT` ⬅️, `Turn head RIGHT` ➡️) via MediaPipe Face Landmarker yaw (≥ 25° held ≥ 300ms, returned to center < 10°).
  - Anti-spoofing face presence verification at moment of success; evidence snapshot JPEG capture.
  - Non-blocking countdown overlay with i18n instructions in Hindi, Hinglish, and English.
  - Suspected replay flagging (`LIVENESS_FAILED` if failed challenges > 2) displayed with admin audit timeline.
- **Silent Background Behavioral Telemetry** —
  - MediaPipe runs 100% silently in the live judging room with no landmark meshes or gauges visible to participants.
  - Normalized 1–100 behavioral scale (`round(1 + (raw - 1) * 99 / 81)`).
  - Each behavioral parameter contributes exactly 3% by default with proportional scaling of content criteria to ensure total weights sum to exactly 100%.
- **2-Line Rolling Caption Buffer** —
  - Non-accumulating rolling display showing at most 2 lines in DOM and UI state simultaneously with ~300ms fade-out.
  - Complete transcript preserved non-rendered in memory and database for evaluation and organizer audit.
- **Multilingual Understanding & Hinglish Transliteration Engine** —
  - Dedicated modes for English (`en-US`), Hindi (`hi-IN`), and Hinglish.
  - Hinglish mode guarantees 100% Roman/Latin script captions with 0% Devanagari characters via deterministic transliteration.
  - Phonetized Devanagari fed to `hi-IN` TTS voices for natural Indian accentuation.
- **Dual-Engine Spoken Voice Output & Adaptive Cross-Examination** —
  - **Preflight Audio Unlock**: Mandatory preflight modal with audible test tone to unlock browser `AudioContext` and `SpeechSynthesis`.
  - **Dual-Engine TTS**: Primary backend MP3 generation via `TTSService` (`gTTS`) $\rightarrow$ Browser `SpeechSynthesis` with Chrome GC protection $\rightarrow$ Web Audio chime fallback.
  - **Adaptive Cross-Questioning**: Automatically identifies vague or unsubstantiated answers and issues follow-up inquiries.
  - **1.8s Silence VAD**: Automatically finalizes speech chunks upon natural pause.
  - **Zero-Latency Barge-in**: Participant speaking instantly halts avatar speech synthesis in $<300\text{ ms}$.
  - **Acoustic Echo Suppression**: STT capture pauses while avatar is speaking to prevent microphone loopback.
  - **20s Watchdog Timer**: Automatically recovers avatar from stuck states.
  - **Multi-Turn Grounded Q&A**: 3–5 rounds of probing inquiries grounded in submitted PPT, code, and live spoken transcript.
- **Comprehensive Admin & Participant Portals** —
  - Admin: Event creation, CSV import, live session monitoring with liveness audit logs, and Excel/CSV rankings exports.
  - Team: PPT/Code submission with automatic AI extraction, live judging stage, and official scorecard view.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, MediaPipe Tasks-Vision |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Alembic, Pydantic |
| Database | SQLite (development) / PostgreSQL (production) |
| Cache | Redis (optional in dev) |
| AI Providers | Google Gemini API (with OpenAI and Demo Provider fallbacks) |
| Real-time | WebSockets, Web Speech API, MediaRecorder |

---

## Quick Start

### 1. Prerequisites
- Node.js 20+ and npm
- Python 3.11 or newer
- Modern web browser (Chrome, Edge) with webcam and microphone access

### 2. Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
- API Docs: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/api/health`

### 3. Frontend Setup

```powershell
cd frontend
npm install
npm run dev -- -p 3000
```
- Web Application: `http://localhost:3000`

---

## Default Credentials

| Portal | URL | Username | Password / Access Code |
|--------|-----|----------|------------------------|
| Admin Portal | `http://localhost:3000/admin/login` | `admin@ainireekshak.com` | `admin123` |
| Team Portal | `http://localhost:3000/team/login` | Team: `Team BharatAI` | Access Code: `TEAM-DEMO-2026` |

---

## Verification & Testing Suite

### Running Backend Unit & Integration Tests
```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/unit/ tests/api/ -W ignore
```
Tests include:
- `tests/unit/test_liveness.py`: Anti-replay scheduler, nonce validation, replay rejection, grace window, and flagging threshold.
- `tests/unit/test_scoring.py`: 1–82 to 1–100 rescaling formula, clamping, and hybrid 3% behavior weight summing to 100%.
- `tests/unit/test_multilingual_stt.py`: Multilingual STT modes, Hinglish transliteration, and 0% Devanagari invariant.
- `tests/unit/test_security.py`: Password hashing, token security, and IDOR protection.
- `tests/api/test_full_workflow.py`: End-to-end event creation, team submission, and evaluation.

### Running Headless Playwright Audio Dry Runs (All 3 Languages)
```powershell
cd backend
.venv\Scripts\python.exe -m pytest tests/e2e/test_judge_voice_dryrun.py -s -W ignore
```
Validates complete voice interaction across English, Hindi, and Hinglish with fake media streams:
1. Final STT output produced (Roman only in Hinglish mode).
2. LLM response generated and received.
3. Dual-engine TTS emits playable audio bytes.
4. Spoken audio playback confirmed via browser events.
5. DOM caption count remains $\le 2$ lines.
6. Adaptive cross-question triggered on vague answers.
7. Barge-in interrupts and halts avatar audio in $<300\text{ ms}$.

### Frontend Typecheck & Verification
```powershell
cd frontend
cmd /c "set PATH=C:\Program Files\nodejs;%PATH% && node node_modules\typescript\bin\tsc --noEmit"
```

---

## License
MIT
