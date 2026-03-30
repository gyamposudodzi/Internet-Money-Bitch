# IMB Product Plan

## Vision

Build a movie and audio distribution ecosystem with:

- A web app for discovery, details, downloads, and rewards
- A backend that powers the web app now and an Android app later
- Telegram-based gated delivery for movie files
- A points system that rewards ad views and can unlock ad-free downloads
- An admin dashboard for publishing, moderation, analytics, and operations

The goal is to make downloads simple, monetizable, and scalable without making the experience feel spammy or untrustworthy.

## Core Product Flow

### User flow for movies

1. User visits the web app homepage.
2. User sees posters/thumbnails, genres, trending titles, and search.
3. User clicks a movie card.
4. User lands on a details page with:
   - Poster and backdrop
   - Title, synopsis, genre, year, duration, rating
   - Available download qualities
   - Trailer if available
   - Related titles
5. User clicks a download quality.
6. Instead of direct download, the app sends the user to the movie's Telegram channel or Telegram bot flow.
7. Before receiving the file link in Telegram, the user must complete a 5-second ad/watch gate unless they have enough points.
8. After successful ad completion, the Telegram bot/channel provides the file or the final external file link.

### User flow for audio

1. User browses or searches audio content.
2. User opens an audio details page.
3. User chooses format/quality.
4. Telegram handles delivery after ad-gate or points bypass.

### Reward flow

1. User connects or enters Telegram username.
2. Each verified ad completion gives points.
3. Points accumulate on the backend against the Telegram identity.
4. When enough points are available, a user can bypass ad gates for future downloads.

## Main Product Areas

### 1. Public Web App

Features:

- Homepage with featured, trending, latest uploads
- Search and filtering by genre, year, quality, language, type
- Movie thumbnails/posters
- Movie details pages
- Audio details pages
- Download CTA leading into Telegram flow
- Lightweight account state tied to Telegram username or Telegram auth
- Points balance display
- Watchlist or favorites later if needed

### 2. Backend API

The backend should be built API-first so both web and Android clients can use the same services.

Responsibilities:

- Content catalog APIs
- Search and filtering APIs
- Movie/audio metadata management
- Download session creation
- Telegram user association
- Ad verification callbacks
- Points accrual and redemption
- Admin APIs
- Analytics and audit logs

### 3. Telegram Delivery Layer

Possible implementation:

- Telegram bot for personalized interaction
- Telegram channels for content distribution
- Deep links from web to bot/channel

Recommended flow:

- Web app creates a short-lived download session
- User opens Telegram via deep link with session token
- Telegram bot validates the session
- Bot checks whether:
  - user has enough points to skip ad
  - user must watch an ad first
- After ad success, bot sends:
  - file directly in Telegram if feasible
  - or external download link
  - or channel-specific content access instructions

Why bot-first is better than channel-only:

- Better user tracking
- Easier points handling
- More reliable gating logic
- Cleaner user-specific delivery

## Content Types

Support at minimum:

- Movies
- Series
- Audio

For series, structure should support:

- Series
- Seasons
- Episodes
- Episode-specific qualities and file links

## Technical Architecture

## Frontend

Recommended stack:

- Next.js or React frontend
- Tailwind or a clean design system
- Server-side rendering for SEO-friendly movie pages
- Responsive mobile-first UI

Key frontend pages:

- Home
- Browse/search
- Movie details
- Series details
- Audio details
- Download/redirect page
- Points and rewards page
- Help/FAQ

## Backend

Recommended stack options:

- Node.js with NestJS or Express/Fastify
- Or Python with FastAPI

Recommendation:

- Use `FastAPI` or `NestJS`
- Keep services modular from the start
- Expose REST APIs first
- Keep room for future websocket notifications if needed

Backend modules:

- Auth and identity
- Catalog/content
- Downloads
- Telegram integration
- Ad integration
- Rewards/points
- Admin
- Analytics
- Notifications

## Database and Storage

### Supabase usage

Use Supabase for:

- PostgreSQL database
- Authentication if needed
- Row-level security where appropriate
- Admin/internal tables
- Analytics tables

Do not store movie files in Supabase Storage if the file size/cost model is not ideal.

### External file storage

Movie/audio files should be stored elsewhere, such as:

- Cloudflare R2
- Backblaze B2
- AWS S3-compatible storage
- Private hosting/CDN storage

The backend should never expose raw permanent file URLs directly if abuse is a concern.

Use:

- Signed URLs
- Short-lived tokens
- File access audit logs

## Suggested Data Model

Core tables/entities:

- `users`
  - id
  - telegram_username
  - telegram_user_id
  - points_balance
  - role
  - created_at

- `movies`
  - id
  - title
  - slug
  - description
  - poster_url
  - backdrop_url
  - release_year
  - duration
  - genres
  - language
  - status
  - published_at

- `series`
  - id
  - title
  - slug
  - description
  - poster_url
  - release_year

- `seasons`
  - id
  - series_id
  - season_number

- `episodes`
  - id
  - season_id
  - title
  - episode_number
  - description

- `audio_items`
  - id
  - title
  - artist
  - album
  - cover_url
  - duration
  - language

- `content_files`
  - id
  - content_type
  - content_id
  - quality
  - format
  - storage_provider
  - storage_key
  - file_size
  - delivery_type
  - telegram_channel_id

- `download_sessions`
  - id
  - user_id
  - content_file_id
  - status
  - ad_required
  - ad_completed
  - points_used
  - expires_at

- `point_transactions`
  - id
  - user_id
  - type
  - amount
  - source
  - reference_id
  - created_at

- `ad_events`
  - id
  - user_id
  - provider
  - campaign
  - event_type
  - verified
  - created_at

- `admins`
  - id
  - user_id
  - permissions

- `audit_logs`
  - id
  - actor_id
  - action
  - entity_type
  - entity_id
  - metadata
  - created_at

## Authentication and Identity

Best options:

- Telegram login widget for identity
- Or lightweight local auth plus Telegram linking

Recommendation:

- Use Telegram login or verified Telegram bot linking
- Store `telegram_user_id` as the main identity bridge
- Avoid depending only on username because usernames can change

Important note:

- Username can be displayed publicly
- Telegram numeric user ID should be the backend identity key

## Points and Ad Logic

### Points rules

Example rules:

- 1 ad watch = X points
- 1 movie download bypass = Y points
- HD or larger files can cost more points than low quality
- Returning users can earn streak bonuses

### Anti-abuse rules

- Short-lived download sessions
- Verified server-side ad completion callbacks
- Per-user cooldowns
- Device/IP heuristics
- Rate limiting on download creation
- Duplicate reward prevention

### Recommended reward ideas

- First ad watch of the day gives a bonus
- Referral bonus tied to Telegram invite or code
- Bonus points for watching a full rewarded ad
- Limited-time campaigns for featured content

## Admin Dashboard

The admin dashboard should handle much more than uploads.

Core admin features:

- Create and edit movies, series, episodes, audio
- Upload posters, backdrops, thumbnails
- Attach files and qualities
- Assign Telegram channels/bot delivery settings
- Publish/unpublish content
- Schedule releases
- Search content inventory
- Monitor download sessions
- Monitor ad completions
- Monitor point balances and suspicious activity
- View top-performing content
- View revenue-oriented analytics
- Manage banners, homepage sections, and ad placements
- Admin roles and permissions

Advanced admin ideas:

- Broken link checker for content files
- Re-upload queue
- Telegram delivery health dashboard
- Ad conversion metrics by content
- Fraud detection panel
- Manual points adjustment
- DMCA/takedown workflow if needed

## Monetization Strategy

Revenue depends on ads, but the interface should still feel clean.

### Ad placement principles

- Keep ads integrated, not chaotic
- Do not interrupt browsing every few seconds
- Put the strongest ad friction near the download intent, not everywhere
- Balance trust and monetization

### Recommended ad placements

- Home page inline banner between sections
- Detail page secondary banner below metadata
- Download unlock step with rewarded 5-second ad
- Telegram-side confirmation ad gate
- Occasional sticky but compact ad on mobile

### Avoid

- Popups on every click
- Full-page ad spam before search results
- Too many animated ads
- Ads that block reading the movie details

Best rule:

- Make discovery smooth
- Monetize at high-intent moments

## UI/UX Direction

The site should feel premium enough that users trust the platform.

Design goals:

- Strong poster-first browsing
- Fast load times
- Clean hierarchy
- Clear quality labels
- Clear Telegram-based flow explanation
- Subtle ad placement
- Mobile-first layout because many users will come from phones

Important UX details:

- Explain why Telegram is used before the user clicks download
- Show whether a download needs ad watch or can be unlocked with points
- Show estimated point cost clearly
- Show a reward confirmation after ad completion
- Keep the journey to actual file access short

## Android Readiness

The backend should be designed now for future Android support.

That means:

- Mobile-safe auth tokens
- Clean REST API contracts
- Pagination on catalog endpoints
- Versioned APIs like `/api/v1/...`
- Centralized business logic in backend, not frontend
- Reusable download session and points APIs
- Media metadata responses optimized for mobile apps

Future Android features:

- Native Telegram deep linking
- Push notifications for new uploads
- Offline favorites/watchlist metadata
- Referral/share features

## SEO and Discoverability

Even if downloads are handled through Telegram, the web app should still be discoverable.

Suggested SEO features:

- Server-rendered detail pages
- Clean slugs
- Meta titles and descriptions
- Open Graph poster previews
- Sitemap
- Genre/category landing pages

## Security and Risk Areas

This project has abuse and trust risks, so backend controls matter a lot.

Key risks:

- Link sharing and bypassing ad gates
- Fake ad completion events
- Automated scraping of catalog and links
- Telegram identity spoofing
- Storage URL leakage
- Copyright/legal exposure depending on jurisdiction and content rights

Mitigations:

- Signed short-lived links
- Bot-validated session tokens
- Server-side reward verification
- Rate limiting
- Audit logs
- Access rules by role
- Optional moderation queue before publishing

## Recommended Build Phases

### Phase 1: Foundations

- Define data model
- Set up Supabase project and schema
- Choose backend framework
- Set up frontend scaffold
- Set up admin scaffold

### Phase 2: Catalog and Discovery

- Movie, series, audio entities
- Browse and search APIs
- Frontend listing and details pages
- Poster and metadata management

### Phase 3: Telegram Delivery

- Telegram bot integration
- Download session creation
- Deep linking from web to Telegram
- File delivery rules

### Phase 4: Ads and Points

- Rewarded ad integration
- Ad verification flow
- Points ledger
- Ad bypass using points

### Phase 5: Admin and Analytics

- Publishing tools
- Quality/file assignment
- Dashboard metrics
- Fraud monitoring

### Phase 6: Android Preparation

- Harden APIs
- Improve auth flows
- Add mobile-specific response tuning
- Write Android integration docs

## MVP Scope Recommendation

To avoid overbuilding, the first MVP should include:

- Web app with movies and audio
- Search and detail pages
- Telegram bot delivery
- One rewarded ad flow
- Points wallet
- Admin upload and publish panel
- External storage integration

Leave these for later:

- Full referral system
- Series with deep episode management if timeline is tight
- Advanced recommendations
- Native Android app
- Complex ad marketplace integrations

## Additional Ideas

Ideas that could improve the ecosystem:

- "Free today" section with zero-point promotional titles
- Daily spin or reward bonus tied to ad engagement
- Personalized recommendations based on downloads
- Trending in Telegram widget
- User request feature for missing titles
- Content availability alerts
- Multi-language metadata support
- Community ratings or lightweight reactions
- Smart download mirror selection if one host is slow

## Suggested Repo Structure

Since this repo is starting fresh, a good future structure could be:

```text
/apps
  /web
  /admin
  /api
/packages
  /ui
  /config
  /types
  /utils
/docs
  /product
  /api
  /architecture
```

## Recommended Next Step

Build from the backend contract outward.

Suggested immediate order:

1. Finalize product rules and MVP scope
2. Design the database schema
3. Define API endpoints
4. Build Telegram bot/session flow
5. Build web catalog and details pages
6. Build admin publishing dashboard
7. Add ad provider integration and points logic

## Final Recommendation

The strongest version of this product is not just "a download site with many ads." It should feel like:

- a clean media discovery app
- a controlled Telegram delivery system
- a rewards platform that makes ads feel optional over time

If we do that well, the ads become part of the incentive loop instead of pure friction.
