# API Service

FastAPI backend for:

- Catalog APIs
- Download sessions
- Telegram bot integration
- Ad verification
- Points ledger
- Admin operations

## Local Setup

Create an environment file:

```powershell
Copy-Item .env.example .env
```

Install dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
```

Run the API:

```powershell
uvicorn app.main:app --reload --port 8000
```

Useful URLs:

- `http://localhost:8000/api/v1/health`
- `http://localhost:8000/docs`

## Current State

The catalog routes now use a repository layer and are ready to read from
Postgres when `DATABASE_URL` is configured. The current focus is replacing the
remaining placeholder route groups and adding real query-backed services for
downloads, Telegram, rewards, and admin operations.
