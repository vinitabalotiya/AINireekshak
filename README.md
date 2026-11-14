# AiNireekshak — Multilingual AI-Powered Hackathon Judging Platform

AiNireekshak is an AI hackathon judge designed to understand participants speaking naturally in Hindi, Hinglish, English and regional Indian languages. It preserves original spoken context, conducts interactive judging sessions with a synthetic AI avatar, analyzes project submissions, and generates structured, evidence-based scores.

## Features

- **Multilingual Speech Understanding** — Hindi, Hinglish, English with original language preservation
- **Real-time AI Judging** — Interactive sessions with synthetic AI avatar
- **Live Captions** — Including Romanised Hindi/Hinglish
- **Transcript Corrections** — Participants can correct misheard speech
- **Document Analysis** — PDF, PPT, DOCX extraction and AI evaluation
- **Code Analysis** — ZIP and GitHub repository static analysis
- **Configurable Scoring** — Weighted evaluation with evidence linking
- **Admin Dashboard** — Event management, team tracking, analytics
- **Team Portal** — Submissions, live judging, session status
- **Export & Reports** — CSV, Excel exports with rankings

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Pydantic |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Cache | Redis (optional in dev) |
| AI | Gemini API (with provider abstraction) |
| Real-time | WebSockets, LiveKit |

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Docker (optional, for PostgreSQL/Redis)

### 1. Clone and configure

```bash
git clone <repo-url>
cd AiNireekshak
cp .env.example .env
# Edit .env with your settings (app works in demo mode without AI keys)
```

### 2. Start the backend

#### Windows PowerShell
```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### Linux / macOS
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The backend will:
- Create a SQLite database automatically on first run
- Create a default admin (admin@ainireekshak.com / admin123)
- Run on http://localhost:8000
- Provide API docs at http://localhost:8000/docs

### 3. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 4. (Optional) Start PostgreSQL and Redis with Docker

```bash
docker compose up -d
```

Then update `DATABASE_URL` in `.env` to:
```
DATABASE_URL=postgresql+psycopg://ainireekshak:ainireekshak_dev@localhost:5432/ainireekshak
```

## Project Structure

```
AiNireekshak/
├── frontend/          # Next.js 15 application
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# Reusable components
│   │   ├── hooks/     # Custom React hooks
│   │   ├── lib/       # Utilities
│   │   ├── services/  # API client services
│   │   ├── types/     # TypeScript types
│   │   └── contexts/  # React contexts
│   └── ...
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # Route handlers
│   │   ├── core/      # Config, security, database
│   │   ├── models/    # SQLAlchemy models
│   │   ├── schemas/   # Pydantic schemas
│   │   ├── services/  # Business logic
│   │   ├── websocket/ # WebSocket handlers
│   │   └── main.py    # App entry point
│   └── tests/
├── docker-compose.yml
└── docs/
```

## Default Credentials

| Portal | Username | Password |
|--------|----------|----------|
| Admin | admin@ainireekshak.com | admin123 |

> **⚠️ Change default credentials in production!**

## API Keys Required for Full Functionality

| Service | Purpose | Required? |
|---------|---------|-----------|
| GEMINI_API_KEY | AI evaluation, question generation | Optional (demo mode available) |
| LIVEKIT_URL/KEY/SECRET | Live video/audio rooms | Optional (simulated mode available) |
| OPENAI_API_KEY | Alternative AI provider | Optional |

## Features by Credential Status

### Works without any API keys (Demo Mode)
- Admin portal (events, teams, sessions management)
- Team portal (login, submissions, dashboard)
- Document upload and text extraction
- Code analysis (static)
- Scoring engine and rankings
- CSV/Excel export
- Demo AI responses (clearly labeled)

### Requires GEMINI_API_KEY
- Real AI project analysis
- Intelligent question generation
- Evidence-based evaluation
- Multilingual understanding

### Requires LiveKit credentials
- Live audio/video judging rooms
- Real-time captions
- Avatar with speech

## License

MIT
