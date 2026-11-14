# AiNireekshak Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js 15)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Public   │  │  Admin   │  │  Team    │  │ Judging  │   │
│  │ Landing   │  │ Portal   │  │ Portal   │  │  Room    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API + WebSocket
┌────────────────────────┴────────────────────────────────────┐
│                    Backend (FastAPI)                          │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Auth   │  │  Events  │  │ Sessions │  │WebSocket │    │
│  │ Service │  │ Service  │  │ Service  │  │ Manager  │    │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘    │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  AI     │  │ Document │  │  Code    │  │Evaluation│    │
│  │Provider │  │Extractor │  │ Analyzer │  │ Engine   │    │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────┴────┐    ┌─────┴────┐    ┌─────┴────┐
    │ SQLite/ │    │  Redis   │    │  File    │
    │PostgreSQL│   │ (cache)  │    │ Storage  │
    └─────────┘    └──────────┘    └──────────┘
```

## Processing Pipelines

### A. Real-time Judging Pipeline
1. Participant speaks via microphone
2. Audio streamed via WebSocket/LiveKit
3. Speech-to-text (multilingual, preserves original language)
4. Transcript generated with language detection
5. Captions displayed in real-time
6. Participant can correct transcription errors
7. AI generates contextual follow-up questions
8. Avatar responds via TTS
9. Session evidence collected and stored

### B. Project Evaluation Pipeline
1. Files uploaded (PPT, PDF, DOC, ZIP, GitHub URL)
2. Files validated (type, size, safety)
3. Content extracted (text, structure, code)
4. AI analyzes content structure
5. Evidence extracted and linked
6. Category scores generated with justifications
7. Final weighted score calculated
8. Evaluation report generated

## Database Schema (Key Entities)

- **AdminUser** — Platform administrators
- **Event** — Hackathon events with scoring weights
- **Team** — Participant teams with hashed access codes
- **TeamMember** — Individual team members
- **Session** — Judging sessions with scheduling
- **Submission** — Uploaded files and their analysis
- **Transcript** — Speech transcriptions with corrections
- **Evaluation** — Scored evaluations with evidence
- **AuditLog** — System activity tracking

## Security Architecture

- JWT-based authentication with role separation
- Argon2 password hashing
- Team access codes: plain text shown once, stored as hash
- File upload validation (type, size, path traversal prevention)
- Safe ZIP extraction (no symlinks, size limits)
- CORS configuration
- Rate limiting on auth endpoints
- Team data isolation enforced at query level

## AI Provider Architecture

```
AIProvider (Abstract)
    ├── GeminiProvider (google-genai)
    ├── DemoProvider (mock responses)
    └── [Future: OpenAIProvider]

Factory: get_ai_provider() returns appropriate provider based on config
```

## Scoring System

| Category | Default Weight |
|----------|---------------|
| Pitch & Technical Understanding | 60% |
| PPT & Presentation Material | 15% |
| Code & Implementation Evidence | 8% |
| Feasibility & Practicality | 7% |
| Innovation | 5% |
| Problem Relevance & Impact | 5% |

Weights are configurable per event. Total must equal 100%.
