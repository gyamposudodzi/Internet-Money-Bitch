# API Specification

## Overview

This API is designed for:

- Web app consumption
- Future Android app consumption
- Telegram bot integration
- Admin dashboard operations

Version all endpoints under `/api/v1`.

Response format recommendation:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

For failures:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "string_code",
    "message": "Human readable message"
  }
}
```

## Auth Strategy

Recommended auth modes:

- Public anonymous access for published catalog browsing
- Admin auth for dashboard endpoints
- Telegram-linked user auth for reward and download endpoints

Recommended headers:

- `Authorization: Bearer <token>`
- `X-Client-Platform: web|android|telegram`
- `X-App-Version: <version>`

## Public Catalog Endpoints

### `GET /api/v1/home`

Purpose:

- Return homepage sections, featured content, banners, and ad slot metadata

Example data:

- featured movies
- trending titles
- latest uploads
- featured audio

### `GET /api/v1/search`

Query params:

- `q`
- `type=movie|series|audio`
- `genre`
- `year`
- `language`
- `page`
- `limit`

Purpose:

- Unified search across supported content types

### `GET /api/v1/movies`

Query params:

- `genre`
- `year`
- `language`
- `sort=latest|popular|featured`
- `page`
- `limit`

### `GET /api/v1/movies/:slug`

Returns:

- movie metadata
- poster/backdrop
- genres
- trailer
- available download qualities
- related titles
- ad/points requirements summary

### `GET /api/v1/series`

Query params:

- same structure as movies

### `GET /api/v1/series/:slug`

Returns:

- series metadata
- seasons
- episodes
- downloadable episode files or season bundles

### `GET /api/v1/audio`

Query params:

- `artist`
- `album`
- `language`
- `sort`
- `page`
- `limit`

### `GET /api/v1/audio/:slug`

Returns:

- audio metadata
- available qualities/formats
- points/ad requirement

## User and Rewards Endpoints

### `POST /api/v1/auth/telegram/link`

Purpose:

- Link a web session to a Telegram account

Input:

```json
{
  "telegram_user_id": 123456789,
  "telegram_username": "example_user",
  "auth_payload": "provider_specific_payload"
}
```

### `GET /api/v1/me`

Returns:

- user profile
- Telegram linkage state
- points balance

### `GET /api/v1/me/points`

Returns:

- current balance
- recent point transactions

### `GET /api/v1/me/downloads`

Returns:

- recent download sessions
- status
- unlocked items

## Download Flow Endpoints

### `POST /api/v1/download-sessions`

Purpose:

- Start a gated download session for a specific file

Input:

```json
{
  "content_file_id": "uuid",
  "consume_points": false
}
```

Success response:

```json
{
  "data": {
    "download_session_id": "uuid",
    "session_token": "uuid",
    "ad_required": true,
    "points_cost": 10,
    "telegram_deep_link": "https://t.me/your_bot?start=..."
  },
  "meta": {},
  "error": null
}
```

Rules:

- If user has enough points and `consume_points=true`, points can be spent immediately
- Otherwise ad requirement remains active
- Session must expire quickly, for example in 10 to 15 minutes

### `GET /api/v1/download-sessions/:id`

Purpose:

- Poll or inspect download session state from web or app

Returns:

- `created`
- `ad_pending`
- `ad_verified`
- `completed`
- `expired`

### `POST /api/v1/download-sessions/:id/use-points`

Purpose:

- Spend points to bypass ad

### `POST /api/v1/download-sessions/:id/cancel`

Purpose:

- Cancel a stale or accidental session

## Ad Verification Endpoints

### `POST /api/v1/ads/callback/:provider`

Purpose:

- Receive server-to-server callbacks from ad platforms

Validation:

- verify provider secret/signature
- verify session exists
- verify event is not a duplicate

Effects:

- mark ad event as verified
- award points if configured
- unlock download session

### `POST /api/v1/ads/events`

Purpose:

- Optional client-side event intake for non-authoritative analytics

Note:

- Do not use this alone to grant rewards

## Telegram Integration Endpoints

### `POST /api/v1/telegram/webhook`

Purpose:

- Receive Telegram bot updates

Expected handling:

- `/start <session_token>`
- user verification
- session lookup
- ad requirement check
- content unlock response

### `GET /api/v1/telegram/session/:token`

Purpose:

- Internal or bot-facing lookup of session metadata

Returns:

- user linkage state
- file label
- points/ad status
- delivery instructions

### `POST /api/v1/telegram/session/:token/complete`

Purpose:

- Mark Telegram-side delivery complete

## Admin Endpoints

All admin routes should require admin auth and permission checks.

### Content management

- `GET /api/v1/admin/movies`
- `POST /api/v1/admin/movies`
- `PATCH /api/v1/admin/movies/:id`
- `DELETE /api/v1/admin/movies/:id`
- `GET /api/v1/admin/series`
- `POST /api/v1/admin/series`
- `PATCH /api/v1/admin/series/:id`
- `GET /api/v1/admin/audio`
- `POST /api/v1/admin/audio`
- `PATCH /api/v1/admin/audio/:id`

### File management

- `POST /api/v1/admin/content-files`
- `PATCH /api/v1/admin/content-files/:id`
- `POST /api/v1/admin/content-files/:id/generate-link`
- `POST /api/v1/admin/content-files/:id/test-delivery`

### Publishing

- `POST /api/v1/admin/publish/:contentType/:id`
- `POST /api/v1/admin/unpublish/:contentType/:id`
- `POST /api/v1/admin/schedule/:contentType/:id`

### Rewards and moderation

- `GET /api/v1/admin/users`
- `GET /api/v1/admin/users/:id`
- `POST /api/v1/admin/users/:id/points-adjustment`
- `POST /api/v1/admin/users/:id/ban`
- `POST /api/v1/admin/users/:id/unban`

### Analytics

- `GET /api/v1/admin/analytics/overview`
- `GET /api/v1/admin/analytics/downloads`
- `GET /api/v1/admin/analytics/ads`
- `GET /api/v1/admin/analytics/content-performance`

### Site operations

- `GET /api/v1/admin/homepage-sections`
- `PATCH /api/v1/admin/homepage-sections/:id`
- `GET /api/v1/admin/ad-slots`
- `PATCH /api/v1/admin/ad-slots/:id`

## Example Download Lifecycle

1. User opens movie details page.
2. Client requests `POST /api/v1/download-sessions`.
3. API creates a short-lived session and returns a Telegram deep link.
4. User opens Telegram.
5. Telegram bot sends `/start <session_token>` to backend.
6. Backend checks whether points were spent or ad is still required.
7. User watches ad if needed.
8. Ad provider callback verifies completion.
9. Backend marks session `ad_verified`.
10. Telegram bot provides file or final file access path.
11. Backend records completion and analytics.

## Mobile and Android Notes

To keep the API Android-ready:

- keep payloads normalized
- support cursor or page-based pagination consistently
- avoid putting business rules only in the frontend
- return explicit status flags instead of relying on inferred UI logic
- keep Telegram deep links and content metadata available in one response where possible

## Recommended Next Implementation Files

After this API spec, the next useful artifacts are:

- OpenAPI document
- backend route scaffold
- Telegram bot command spec
- Supabase RLS policy file
