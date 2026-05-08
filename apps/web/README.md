# Web App

Next.js public-facing media discovery client for the IMB ecosystem.

## Run Locally

From `apps/web`:

```powershell
npm install
npm run dev
```

Then open:

- `http://localhost:3000`

## Backend

The app tries to load live data from:

- `http://localhost:8000/api/v1`

If the backend is unavailable, it falls back to seeded demo content so the UI
still works for layout and flow testing.

## Current Capabilities

- Browse featured, movie, and audio lanes
- Restore the current browsing session after refresh in the same browser
- Keep selected title, selected file, points balance, and active view in local session storage
- Show clearer status feedback for catalog sync, fallback mode, search, and unlock actions
- Create unlock sessions and spend points from the detail rail
- Continue delivery through Telegram deep links
- Hide points and wallet UI for guest visitors until Telegram-linked user details are present

## Notes

- Uses the Next.js App Router
- Keeps the current catalog, detail, and Telegram unlock flow on the client
- The admin app is still a separate static client for now
