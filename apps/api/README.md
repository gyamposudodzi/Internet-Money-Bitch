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

The catalog, download-session, Telegram, and ad routes now use repository
layers and are ready to read/write against Postgres when `DATABASE_URL` is
configured. Admin routes now require a configured bearer token plus an
admin user id header, backed by database role checks. The current focus is the
remaining route groups and the first web client scaffold on top of these endpoints.

## Admin Auth

Set `ADMIN_API_TOKEN` in `.env`, then send:

```text
Authorization: Bearer <ADMIN_API_TOKEN>
X-Admin-User-Id: <admin-user-uuid>
```

Starter admin endpoints:

- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/analytics/overview`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/movies`
- `POST /api/v1/admin/movies`
- `PATCH /api/v1/admin/movies/{movie_id}`
- `DELETE /api/v1/admin/movies/{movie_id}`
- `GET /api/v1/admin/audio`
- `POST /api/v1/admin/audio`
- `PATCH /api/v1/admin/audio/{audio_id}`
- `DELETE /api/v1/admin/audio/{audio_id}`
- `GET /api/v1/admin/content-files`
- `POST /api/v1/admin/content-files`
- `PATCH /api/v1/admin/content-files/{content_file_id}`
- `DELETE /api/v1/admin/content-files/{content_file_id}`
