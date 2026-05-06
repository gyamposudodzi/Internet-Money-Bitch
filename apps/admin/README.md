# Admin App

Static admin console for the IMB backend.

## Run Locally

From the repo root:

```powershell
python -m http.server 4174 -d apps/admin
```

Then open:

- `http://localhost:4174`

## Backend

The app expects the API at:

- `http://localhost:8000/api/v1`

Admin requests use:

- `Authorization: Bearer <ADMIN_API_TOKEN>`
- `X-Admin-User-Id: <admin-user-uuid>`

If the backend is unavailable, the dashboard falls back to seeded demo data so
the interface stays reviewable.

## Current Capabilities

- Connect with bootstrap admin auth
- View admin identity and overview metrics
- Review admin users
- Review platform users
- Ban and unban users
- Apply manual point adjustments
- View recent audit activity
- Browse protected movie/audio inventory
- Create movies
- Create audio items
- Attach content files
- Edit and archive content inventory
