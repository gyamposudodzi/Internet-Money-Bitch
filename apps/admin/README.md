# Admin App

Next.js admin console for the IMB backend.

## Run Locally

From `apps/admin`:

```powershell
npm install
npm run dev
```

Then open:

- `http://localhost:3001`

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
- Create movies and attach multiple existing content files in the same form
- Create audio items and attach multiple existing content files in the same form
- Attach content files
- Edit and archive content inventory
- See whether content files are already attached before reassigning them

## Notes

- Uses the Next.js App Router
- Keeps the current admin API integration on the client
- The public site has also moved to `Next.js`
