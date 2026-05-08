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

The login page itself now asks for:

- username or email
- password

and exchanges those against the bootstrap admin login endpoint before using the
protected headers internally.

Local test sign-in:

- Username: `imb_admin`
- Or email: `admin@example.com`
- Password: `admin12345`

If the backend is unavailable, the dashboard falls back to seeded demo data so
the interface stays reviewable.

## Current Capabilities

- Connect through a dedicated admin auth page
- Keep the current admin session across page refreshes in the same browser
- View admin identity and overview metrics
- Use a top navigation shell with working view switching
- Use the profile dropdown to open `Profile`, `Settings`, or `Logout`
- Review admin users
- Review platform users
- Ban and unban users
- Apply manual point adjustments
- View recent audit activity
- Browse protected movie/audio inventory
- Open an add modal from the dashboard header
- Switch between `movie`, `audio`, and `content file` forms inside that modal
- See in-modal save feedback and disabled submit states while forms are submitting
- Create movies and attach multiple existing content files in the same form
- Create audio items and attach multiple existing content files in the same form
- Attach content files
- Edit and archive content inventory
- See whether content files are already attached before reassigning them

## Notes

- Uses the Next.js App Router
- Keeps the current admin API integration on the client
- The public site has also moved to `Next.js`
