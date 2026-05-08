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
remaining route groups, stronger admin auth, and richer operations tooling on top
of these endpoints.

## Admin Auth

Set `ADMIN_API_TOKEN` in `.env`, then send:

```text
Authorization: Bearer <ADMIN_API_TOKEN>
X-Admin-User-Id: <admin-user-uuid>
```

For the admin login page, also set:

```text
ADMIN_LOGIN_USERNAME=imb_admin
ADMIN_LOGIN_EMAIL=admin@example.com
ADMIN_LOGIN_PASSWORD=admin12345
ADMIN_LOGIN_USER_ID=11111111-1111-1111-1111-111111111111
```

The login screen uses `POST /api/v1/admin/auth/login` with username/email plus password,
then stores the returned bearer token and admin user id for subsequent protected requests.

Default local test credentials currently baked into the dev setup:

- Username: `imb_admin`
- Email: `admin@example.com`
- Password: `admin12345`

Starter admin endpoints:

- `GET /api/v1/admin/auth/me`
- `GET /api/v1/admin/analytics/overview`
- `GET /api/v1/admin/users`
- `GET /api/v1/admin/platform-users`
- `PATCH /api/v1/admin/platform-users/{user_id}`
- `POST /api/v1/admin/platform-users/{user_id}/points-adjustments`
- `GET /api/v1/admin/audit-logs`
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
