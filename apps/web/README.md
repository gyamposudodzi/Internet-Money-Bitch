# Web App

Static public-facing media discovery client for the IMB ecosystem.

## Run Locally

From the repo root:

```powershell
python -m http.server 4173 -d apps/web
```

Then open:

- `http://localhost:4173`

## Backend

The app tries to load live data from:

- `http://localhost:8000/api/v1`

If the backend is unavailable, it falls back to seeded demo content so the UI
still works for layout and flow testing.
