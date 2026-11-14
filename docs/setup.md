# AiNireekshak Setup Guide

See [README.md](../README.md) for quick start.

## Detailed Setup

### System Requirements

- **OS**: Windows 10/11, macOS 12+, Linux (Ubuntu 20.04+)
- **Node.js**: v20 or newer (LTS recommended)
- **Python**: 3.11 or newer
- **Docker**: Optional (for PostgreSQL and Redis)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 2GB for dependencies

### Step 1: Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | No | sqlite | PostgreSQL connection string |
| REDIS_URL | No | localhost:6379 | Redis connection |
| JWT_SECRET_KEY | Yes (prod) | dev default | JWT signing key |
| GEMINI_API_KEY | No | empty | Gemini API key for AI features |
| STORAGE_PATH | No | ./uploads | File upload directory |
| CORS_ORIGINS | No | localhost:3000 | Allowed CORS origins |

### Step 2: Backend Setup

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1    # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Step 3: Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

### Step 4: Verify

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health

### Step 5: Login

Default admin credentials:
- Email: `admin@ainireekshak.com`
- Password: `admin123`

### Optional: PostgreSQL + Redis

```bash
docker compose up -d
```

Update DATABASE_URL in .env to use PostgreSQL.
