# AiNireekshak API Documentation

## Base URL

```
http://localhost:8000
```

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:
```
Authorization: Bearer <token>
```

### Admin Authentication

#### POST /api/auth/admin/register
Create the first admin account (only works when no admins exist).

**Request Body:**
```json
{
  "email": "admin@example.com",
  "username": "admin",
  "password": "securepassword"
}
```

#### POST /api/auth/admin/login
**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "role": "admin",
  "user": { "id": 1, "email": "admin@example.com", "username": "admin" }
}
```

### Team Authentication

#### POST /api/auth/team/login
**Request Body:**
```json
{
  "team_name": "Team Alpha",
  "access_code": "XXXX-XXXX-XXXX"
}
```

---

## Events

#### GET /api/events
List all events. Admin only.

#### POST /api/events
Create event. Admin only.

```json
{
  "name": "Hackathon 2025",
  "description": "Annual coding competition",
  "start_date": "2025-01-15T09:00:00",
  "end_date": "2025-01-16T18:00:00",
  "max_teams": 50
}
```

#### GET /api/events/{id}
#### PUT /api/events/{id}
#### DELETE /api/events/{id}

#### PUT /api/events/{id}/scoring-weights
Update scoring weights (must sum to 100).
```json
{
  "pitch_technical": 60,
  "presentation": 15,
  "code_implementation": 8,
  "feasibility": 7,
  "innovation": 5,
  "problem_relevance": 5
}
```

---

## Teams

#### GET /api/teams?event_id={id}
#### POST /api/teams
Creates team and returns access code (shown once only).

#### POST /api/teams/import
Import teams from CSV file.

#### GET /api/teams/{id}
#### PUT /api/teams/{id}
#### DELETE /api/teams/{id}
#### POST /api/teams/{id}/regenerate-code

---

## Sessions

#### GET /api/sessions?status={status}&event_id={id}
#### POST /api/sessions
#### GET /api/sessions/{id}
#### PUT /api/sessions/{id}/status

---

## Submissions

#### POST /api/submissions/upload
Multipart file upload.

#### GET /api/submissions/{id}
#### GET /api/submissions/team/{team_id}
#### POST /api/submissions/{id}/analyze

---

## Evaluations

#### GET /api/evaluations/{id}
#### GET /api/evaluations/team/{team_id}
#### POST /api/evaluations/generate
#### GET /api/evaluations/rankings/{event_id}
#### POST /api/evaluations/rankings/{event_id}/shortlist

---

## Reports

#### GET /api/reports/event/{event_id}/export/csv
#### GET /api/reports/event/{event_id}/export/excel

---

## Health

#### GET /api/health
Returns service status.

```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "redis": "unavailable",
    "ai_provider": "demo_mode",
    "livekit": "not_configured"
  },
  "version": "1.0.0"
}
```

---

## WebSocket Endpoints

### /ws/session/{session_id}
Real-time judging session communication.

### /ws/admin/monitor/{session_id}
Admin session monitoring.

**Message Format:**
```json
{
  "type": "caption|ai_message|status|correction",
  "data": { ... },
  "timestamp": "2025-01-15T10:30:00Z"
}
```
