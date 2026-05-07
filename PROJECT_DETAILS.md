# Project Details

## Purpose

This document explains the current codebase in practical terms:

- what each top-level area is for
- what each important file does
- what the major functions and classes are responsible for
- how data moves from the public web app to the backend, the database, ads, Telegram, and the admin console

This project is a media delivery ecosystem with four connected parts:

1. a public web app for browsing movies and audio
2. an admin app for publishing and operations
3. a FastAPI backend that owns the rules and data access
4. a Postgres/Supabase schema that stores platform state

The Android app is not built yet, but the backend is being shaped so Android can use the same APIs later.

## System Overview

The current stack is:

- Frontend public app: Next.js + React in `apps/web`
- Frontend admin app: Next.js + React in `apps/admin`
- Backend API: FastAPI + Python in `apps/api`
- Database: Postgres via Supabase schema/migrations in `supabase`
- Media file storage: external storage, referenced by `content_files`
- Delivery handoff: Telegram session/deep-link flow
- Reward model: ads or points can unlock content

## End-to-End Product Flow

### Public user flow

1. The user opens the public site.
2. The web app loads featured content, movies, and audio from the backend.
3. The user selects a movie or audio item.
4. The detail panel loads the full metadata and the active downloadable files for that item.
5. The user chooses one file variant, such as `720p`, `1080p`, or an audio format.
6. The web app creates a download session.
7. If points are used, the session is unlocked immediately.
8. If points are not used, the session remains ad-gated until ad verification completes.
9. The backend returns a Telegram deep link for the session.
10. Telegram receives `/start <session_token>`.
11. The backend validates the token and session state.
12. After the ad requirement is cleared, Telegram can deliver the file or the final delivery step.

### Admin publishing flow

1. An admin opens the admin app.
2. The admin authenticates with `Authorization: Bearer <ADMIN_API_TOKEN>` and `X-Admin-User-Id`.
3. The admin creates or updates a movie or audio item.
4. The admin creates content files separately or reuses existing ones.
5. When creating a movie or audio item, the admin can attach multiple existing content files from a searchable picker.
6. A title only becomes publicly useful when it has active attached files.
7. The public catalog only shows published content that has active downloadable files.

### Reward flow

1. A download session starts for a `content_file`.
2. The session can require an ad or allow a points bypass.
3. The ad callback endpoint verifies rewarded completion.
4. The backend marks the session as unlocked and records ad events and point transactions.
5. Telegram can then complete delivery.

## Repository Structure

```text
.
├── apps
│   ├── admin
│   ├── api
│   └── web
├── docs
│   ├── api
│   ├── architecture
│   └── product
├── packages
│   ├── config
│   ├── types
│   ├── ui
│   └── utils
├── supabase
│   ├── migrations
│   ├── schema.sql
│   └── seed.sql
├── PRODUCT_PLAN.md
├── PROJECT_DETAILS.md
├── README.md
└── ROADMAP.md
```

## Root Files

### `README.md`

Short root-level entry point for the repo. It links to the planning documents and names the core app folders.

### `PRODUCT_PLAN.md`

Product planning document. It explains the intended business model, feature ideas, Telegram handoff concept, ads strategy, points system, admin dashboard, and Android-readiness.

### `ROADMAP.md`

Execution tracker. It records where the project is, what has been completed, and what the next development focus should be.

### `PROJECT_DETAILS.md`

This document. It is the structural explanation of the repo and runtime flow.

### `.gitignore`

Excludes generated or local-only files such as Python caches, Node modules, and Next.js build output.

## Docs Folder

### `docs/api/API_SPEC.md`

The API contract document. It explains the intended endpoint surface, request/response shape, auth expectations, and example flow. It is broader than the current implementation and includes future-facing endpoints too.

### `docs/architecture/README.md`

Placeholder for architecture-specific documentation. No runtime logic.

### `docs/product/README.md`

Placeholder for product-oriented documentation. No runtime logic.

## Shared Packages Folder

These folders exist as placeholders for future shared code:

### `packages/config/README.md`

Intended home for shared configuration packages.

### `packages/types/README.md`

Intended home for shared TypeScript or contract types if the frontend grows.

### `packages/ui/README.md`

Intended home for shared UI components or design system assets.

### `packages/utils/README.md`

Intended home for shared utility code.

At the moment, these package folders are documentation placeholders and do not contain runtime code.

## Database and Supabase

### `supabase/schema.sql`

This is the current schema definition draft. It describes the database entities the app relies on.

Main enums:

- `app_role`
- `content_kind`
- `publication_status`
- `delivery_mode`
- `session_status`
- `point_tx_type`
- `ad_event_type`
- `storage_provider`

Main tables:

- `users`: platform users and Telegram-linked users
- `user_devices`: device and client context
- `genres`: content taxonomy
- `movies`: movie metadata
- `movie_genres`: movie-to-genre join table
- `series`: series metadata
- `series_genres`: series-to-genre join table
- `seasons`: season grouping for series
- `episodes`: episode metadata
- `audio_items`: music/audio metadata
- `content_files`: actual downloadable assets and delivery metadata
- `telegram_channels`: Telegram delivery channels
- `download_sessions`: short-lived unlock sessions
- `ad_providers`: rewarded ad providers
- `ad_events`: authoritative and non-authoritative ad event log
- `point_transactions`: points ledger
- `content_requests`: future user request queue
- `admin_roles`: admin permissions
- `audit_logs`: operations audit trail
- `homepage_sections`: homepage merchandising structure
- `ad_slots`: ad placement configuration

Important design rule:

- `movies`, `series`, `episodes`, and `audio_items` are metadata records
- `content_files` are the actual downloadable units
- one movie or audio item can have many content files

### `supabase/migrations/0001_initial_schema.sql`

Initial migration form of the schema. This is the database bootstrap file that should be applied to initialize the system.

### `supabase/seed.sql`

Seed data for local development and demo/testing flows. This helps both the backend and frontends have data to work with.

## Backend: `apps/api`

### Purpose

The backend is the source of truth for:

- what content exists
- what content is visible
- what files are attached to a title
- whether a user can unlock a file
- whether an ad has been verified
- how points are spent or awarded
- what admins can do

### `apps/api/pyproject.toml`

Python package configuration.

Dependencies:

- `fastapi`
- `uvicorn`
- `pydantic-settings`
- `sqlalchemy`
- `asyncpg`
- `python-dotenv`

Dev dependencies:

- `pytest`
- `httpx`
- `ruff`

### `apps/api/.env.example`

Example environment file showing required runtime configuration such as database URL, Telegram settings, ad callback secret, and admin token.

### `apps/api/README.md`

Backend setup guide and status summary. It explains local setup, useful URLs, and the current admin auth approach.

## Backend Application Layout

### `apps/api/app/__init__.py`

Package marker. No business logic.

### `apps/api/app/main.py`

Main FastAPI application bootstrap.

Functions:

- `create_app() -> FastAPI`
  - creates the FastAPI app
  - configures metadata such as app name and version
  - installs CORS middleware
  - registers exception handlers
  - mounts the API router under the configured prefix

Runtime role:

- this is the backend entry point used by `uvicorn app.main:app`

## Backend Core Layer

### `apps/api/app/core/__init__.py`

Package marker. No business logic.

### `apps/api/app/core/config.py`

Environment-driven settings model.

Classes:

- `Settings`
  - holds app config loaded from environment variables
  - includes app metadata, CORS origins, database connection info, Telegram info, ad secrets, session TTL, and admin token

Functions:

- `get_settings() -> Settings`
  - cached settings factory

Properties:

- `Settings.cors_origins`
  - splits the comma-separated CORS string into a list

Why it matters:

- every backend subsystem reads from this centralized config

### `apps/api/app/core/database.py`

Database session wiring.

Globals:

- `engine`
  - async SQLAlchemy engine, created only if `DATABASE_URL` exists
- `SessionLocal`
  - async session factory

Functions:

- `get_db_session()`
  - FastAPI dependency
  - yields an `AsyncSession`
  - raises a structured `AppError` with status `503` if the database is not configured

Why it matters:

- routes depend on this to talk to Postgres

### `apps/api/app/core/errors.py`

Central error handling.

Classes:

- `AppError`
  - custom exception with `code`, `message`, and `status_code`

Functions:

- `register_exception_handlers(app)`
  - installs a handler for `AppError`
  - installs a handler for FastAPI validation errors
  - wraps failures into the project response envelope

Why it matters:

- keeps errors predictable for frontend and API clients

### `apps/api/app/core/security.py`

Bootstrap admin security.

Functions:

- `require_admin_token(authorization)`
  - checks that `ADMIN_API_TOKEN` is configured
  - validates the `Authorization: Bearer ...` header
  - raises structured auth errors on failure

- `require_admin_user_header(...)`
  - depends on `require_admin_token`
  - requires `X-Admin-User-Id`
  - returns the admin user id header value

Why it matters:

- protects the admin endpoints before richer auth is added

## Backend Response Schemas

### `apps/api/app/schemas/__init__.py`

Package marker. No business logic.

### `apps/api/app/schemas/responses.py`

Shared response envelope definitions.

Classes:

- `ApiError`
  - normalized error payload
- `ApiResponse[T]`
  - generic success/error wrapper

Functions:

- `api_response(...)`
  - helper to build the standard `{ data, meta, error }` response shape

### `apps/api/app/schemas/catalog.py`

Catalog response models.

Classes:

- `ContentFileSummary`
  - represents a downloadable file shown to users
- `MediaSummary`
  - list-card level metadata for movies/series/audio
- `MediaDetail`
  - detail page payload with files included
- `HomeSection`
  - homepage grouping container

### `apps/api/app/schemas/downloads.py`

Download session request/response models.

Classes:

- `CreateDownloadSessionRequest`
  - request body for starting a session
- `DownloadSessionResponse`
  - returned session payload including token, deep link, status, and points data

### `apps/api/app/schemas/telegram.py`

Telegram-facing response models.

Classes:

- `TelegramSessionResponse`
  - session payload used in Telegram lookup flows
- `TelegramWebhookResponse`
  - structured result returned from webhook processing

### `apps/api/app/schemas/ads.py`

Ad route responses.

Classes:

- `AdCallbackResponse`
  - authoritative callback result
- `AdEventResponse`
  - client-side analytics event result

### `apps/api/app/schemas/admin.py`

Admin request and response models.

Classes:

- `AdminIdentityResponse`
- `AdminOverviewResponse`
- `AdminUserSummary`
- `AdminPlatformUserSummary`
- `AdminUserModerationRequest`
- `AdminPointAdjustmentRequest`
- `AdminPointAdjustmentResponse`
- `AdminAuditLogSummary`
- `AdminMovieCreateRequest`
- `AdminMovieUpdateRequest`
- `AdminAudioCreateRequest`
- `AdminAudioUpdateRequest`
- `AdminContentFileCreateRequest`
- `AdminContentFileUpdateRequest`
- `AdminMovieSummary`
- `AdminAudioSummary`
- `AdminContentFileSummary`

Why this file matters:

- it defines the admin dashboard contract, including content publishing, moderation, point changes, and content-file reassignment

## Backend Repository Layer

The repository layer is where most business rules live. Routes mostly validate input and delegate to repositories.

### `apps/api/app/repositories/__init__.py`

Package marker. No business logic.

### `apps/api/app/repositories/catalog.py`

Handles public catalog reads.

Classes:

- `CatalogFilters`
  - groups paging and filter inputs for list endpoints
- `CatalogRepository`
  - public content query service

Important methods in `CatalogRepository`:

- `__init__(session)`
  - stores the DB session

- `get_home_sections()`
  - returns homepage content sections and ad slot information

- `search(...)`
  - unified search across movies, series, and audio

- `list_movies(filters)`
  - returns published movies with active downloadable files

- `get_movie(slug)`
  - returns one movie plus attached files

- `list_series(page, limit)`
  - returns published series that have downloadable availability

- `get_series(slug)`
  - returns one series plus related file/downloadability info

- `list_audio(...)`
  - returns published audio items with active downloadable files

- `get_audio(slug)`
  - returns one audio item plus attached files

- `_list_content_files(content_kind, content_id)`
  - internal helper for fetching active files attached to one content record

- `_list_ad_slots()`
  - internal helper for homepage ad-slot data

- `_offset(page, limit)`
  - pagination helper

- `_movie_sort_clause(sort)`
  - safe SQL sort mapping for movies

- `_audio_sort_clause(sort)`
  - safe SQL sort mapping for audio

Module helpers:

- `as_media_summaries(rows)`
  - converts raw rows to `MediaSummary`

- `as_media_detail(row)`
  - converts one row to `MediaDetail`

Key business rule:

- this repository now hides titles from the public side if they do not have active downloadable files

### `apps/api/app/repositories/downloads.py`

Handles session creation, token lookup, point spending, and Telegram link generation.

Classes:

- `DownloadSessionRecord`
  - structured download session data
- `TelegramSessionRecord`
  - structured session view for Telegram
- `DownloadRepository`
  - session and unlock workflow service

Important methods in `DownloadRepository`:

- `__init__(session)`
  - stores the DB session

- `create_session(...)`
  - validates user and content file
  - creates a short-lived session
  - optionally spends points immediately
  - sets ad-required state
  - returns a Telegram deep link

- `get_session(session_id)`
  - fetches a session by UUID

- `get_session_by_token(session_token)`
  - fetches the Telegram-facing session view

- `cancel_session(session_id)`
  - cancels a session

- `complete_session_by_token(session_token)`
  - marks Telegram-side delivery as complete

- `use_points(session_id, user_id)`
  - spends points to unlock a session after creation

- `_get_content_file(content_file_id)`
  - internal file lookup

- `_get_user(user_id)`
  - internal user lookup

- `_build_telegram_link(session_token)`
  - creates the Telegram bot deep link if the bot username is configured

Module helper:

- `validate_uuid(value, field_name)`
  - validates UUID-shaped input for repository operations

Why it matters:

- this is the heart of the unlock flow between the site and Telegram

### `apps/api/app/repositories/ads.py`

Handles rewarded ad verification and analytics recording.

Classes:

- `AdCallbackResult`
  - authoritative callback result payload
- `AdEventResult`
  - client-side event intake result
- `AdRepository`
  - rewarded ad processing service

Important methods:

- `__init__(session)`
  - stores the DB session

- `process_callback(provider_name, payload)`
  - validates provider
  - validates event uniqueness
  - verifies the session token
  - updates session unlock state
  - records reward points and ad event data

- `record_event(payload)`
  - records a non-authoritative client analytics event

- `_get_provider(provider_name)`
  - internal provider lookup

- `_get_session_by_token(session_token)`
  - internal session lookup

- `_is_duplicate_event(provider_id, external_event_id)`
  - duplicate protection

- `_json_string(payload)`
  - safe JSON serialization helper

Why it matters:

- it separates authoritative reward unlocking from normal client analytics

### `apps/api/app/repositories/admin.py`

Handles admin identity, analytics, moderation, publishing, content-file management, and audit logging.

Classes:

- `AdminIdentity`
  - in-memory representation of an admin’s permissions
- `AdminRepository`
  - operations service for the dashboard

Important methods:

- `__init__(session)`
  - stores the DB session

- `get_admin_identity(user_id)`
  - loads admin role permissions for one user

- `get_overview()`
  - returns dashboard metrics

- `list_admin_users()`
  - lists admin-capable users and permissions

- `list_platform_users()`
  - lists normal platform users for moderation

- `update_platform_user(user_id, payload, actor_user_id)`
  - bans or unbans a user and records the action

- `adjust_user_points(user_id, payload, actor_user_id)`
  - changes a user’s points balance and writes a ledger transaction

- `list_audit_logs(limit=100)`
  - returns recent operations events

- `list_movies()`
  - admin-facing movie inventory listing

- `create_movie(payload, actor_user_id)`
  - inserts a movie record

- `update_movie(movie_id, payload, actor_user_id=None)`
  - edits movie metadata

- `archive_movie(movie_id, actor_user_id=None)`
  - archives a movie

- `list_audio()`
  - admin-facing audio inventory listing

- `create_audio(payload, actor_user_id)`
  - inserts an audio record

- `update_audio(audio_id, payload, actor_user_id=None)`
  - edits audio metadata

- `archive_audio(audio_id, actor_user_id=None)`
  - archives an audio item

- `list_content_files()`
  - lists content files, now including assignment state and assignment label

- `create_content_file(payload, actor_user_id)`
  - creates a downloadable asset record and validates that the target content exists

- `update_content_file(content_file_id, payload, actor_user_id=None)`
  - updates file metadata and can reassign a file to a different content target

- `deactivate_content_file(content_file_id, actor_user_id=None)`
  - soft-deactivates a file

- `_assert_content_target_exists(content_kind, content_id)`
  - verifies the referenced movie/audio/series/episode exists

- `_fetch_movie(movie_id)`
- `_movie_summary(movie_id)`
- `_fetch_audio(audio_id)`
- `_audio_summary(audio_id)`
- `_fetch_content_file(content_file_id)`
- `_content_file_summary(content_file_id)`
- `_fetch_platform_user(user_id)`
- `_platform_user_summary(user_id)`
  - internal fetch and summary helpers

- `_insert_audit_log(...)`
  - writes audit trail entries

- `_has_any_admin_permission(identity)`
  - checks whether an admin has any usable permission at all

Why it matters:

- this file powers the admin console and currently holds the most operations logic in the repo

## Backend API Route Layer

### `apps/api/app/api/__init__.py`

Package marker. No business logic.

### `apps/api/app/api/v1/__init__.py`

Package marker. No business logic.

### `apps/api/app/api/v1/router.py`

Central router registration.

Behavior:

- mounts `health`
- mounts `catalog`
- mounts `auth`
- mounts `users`
- mounts `downloads`
- mounts `ads`
- mounts `telegram`
- mounts `admin`

### `apps/api/app/api/v1/routes/__init__.py`

Package marker. No business logic.

### `apps/api/app/api/v1/routes/health.py`

Health check endpoint.

Functions:

- `health_check()`
  - returns a simple OK response for service health

### `apps/api/app/api/v1/routes/auth.py`

Telegram-link auth placeholder route.

Classes:

- `TelegramLinkRequest`
  - request body for linking a Telegram account

Functions:

- `link_telegram_account(payload)`
  - current scaffold endpoint for Telegram account linking

### `apps/api/app/api/v1/routes/users.py`

User-facing placeholder/self-service routes.

Functions:

- `get_me()`
  - returns current user info placeholder

- `get_my_points()`
  - returns points summary placeholder

- `get_my_downloads()`
  - returns user download history placeholder

These routes exist, but the richer production auth/user model is still ahead.

### `apps/api/app/api/v1/routes/catalog.py`

Public catalog endpoints.

Functions:

- `get_catalog_repository(session=Depends(get_db_session))`
  - dependency factory for `CatalogRepository`

- `get_home(repository=Depends(...))`
  - returns homepage sections

- `search_catalog(...)`
  - unified public search

- `list_movies(...)`
  - movie listing endpoint

- `get_movie(slug, repository=Depends(...))`
  - movie detail endpoint

- `list_series(...)`
  - series listing endpoint

- `get_series(slug, repository=Depends(...))`
  - series detail endpoint

- `list_audio(...)`
  - audio listing endpoint

- `get_audio(slug, repository=Depends(...))`
  - audio detail endpoint

### `apps/api/app/api/v1/routes/downloads.py`

Download session endpoints.

Functions:

- `get_download_repository(session=Depends(get_db_session))`
  - dependency factory for `DownloadRepository`

- `create_download_session(...)`
  - starts a new download session

- `get_download_session(...)`
  - returns one session by id

- `use_points_for_session(...)`
  - spends points to unlock an existing session

- `cancel_download_session(...)`
  - cancels a session

### `apps/api/app/api/v1/routes/telegram.py`

Telegram integration endpoints.

Functions:

- `get_download_repository(session=Depends(get_db_session))`
  - dependency factory for `DownloadRepository`

- `telegram_webhook(...)`
  - accepts Telegram webhook updates
  - currently focused on parsing `/start <token>` style messages and session lookup logic

- `get_telegram_session(...)`
  - bot-facing lookup of session metadata by token

- `complete_telegram_session(...)`
  - marks delivery complete

### `apps/api/app/api/v1/routes/ads.py`

Rewarded ad endpoints.

Functions:

- `get_ad_repository(session=Depends(get_db_session))`
  - dependency factory for `AdRepository`

- `receive_ad_callback(...)`
  - authoritative provider callback endpoint

- `record_ad_event(...)`
  - non-authoritative client analytics event endpoint

### `apps/api/app/api/v1/routes/admin.py`

Admin dashboard endpoints.

Functions:

- `get_admin_repository(session=Depends(get_db_session))`
  - dependency factory for `AdminRepository`

- `get_current_admin_identity(...)`
  - validates the bootstrap token/header pair and loads admin permissions

- `get_admin_me(...)`
  - returns current admin identity

- `get_admin_overview(...)`
  - returns top-level analytics overview

- `list_admin_users(...)`
  - lists admins

- `list_platform_users(...)`
  - lists platform users

- `moderate_platform_user(...)`
  - bans/unbans a user

- `adjust_platform_user_points(...)`
  - applies manual points changes

- `list_audit_logs(...)`
  - returns recent audit activity

- `ensure_can_manage_content(identity)`
  - local permission guard for content management actions

- `list_movies(...)`
- `create_movie(...)`
- `update_movie(...)`
- `archive_movie(...)`
  - movie inventory operations

- `list_audio(...)`
- `create_audio(...)`
- `update_audio(...)`
- `archive_audio(...)`
  - audio inventory operations

- `list_content_files(...)`
- `create_content_file(...)`
- `update_content_file(...)`
- `deactivate_content_file(...)`
  - downloadable asset operations

## Backend Tests

These files validate the implemented API behavior.

### `apps/api/tests/__init__.py`

Package marker. No logic.

### `apps/api/tests/test_health.py`

Checks service health behavior.

Test functions:

- `test_health_check_returns_ok()`

### `apps/api/tests/test_catalog.py`

Checks catalog route behavior.

Test functions:

- `test_home_uses_repository_sections()`
- `test_get_movie_returns_files()`
- `test_get_movie_returns_404_when_missing()`

### `apps/api/tests/test_downloads.py`

Checks session flow behavior.

Test functions:

- `test_create_download_session_returns_structured_payload()`
- `test_get_download_session_returns_not_found()`
- `test_use_points_unlocks_session()`

### `apps/api/tests/test_telegram.py`

Checks Telegram integration behavior.

Test functions:

- `test_get_telegram_session_returns_session_payload()`
- `test_telegram_webhook_parses_start_command()`
- `test_complete_telegram_session_marks_complete()`

### `apps/api/tests/test_ads.py`

Checks rewarded ad behavior.

Test functions:

- `test_ad_callback_returns_verified_payload()`
- `test_record_ad_event_is_non_authoritative()`

### `apps/api/tests/test_admin.py`

Checks admin auth, permissions, moderation, and publishing behaviors.

Test functions:

- `test_admin_me_requires_valid_headers()`
- `test_admin_overview_requires_permission()`
- `test_admin_users_denies_limited_admin()`
- `test_admin_platform_users_list()`
- `test_admin_can_ban_platform_user()`
- `test_admin_can_adjust_user_points()`
- `test_admin_can_view_audit_logs()`
- `test_admin_movies_list_for_content_manager()`
- `test_admin_create_movie()`
- `test_admin_create_audio()`
- `test_admin_create_content_file()`
- `test_admin_update_movie()`
- `test_admin_archive_audio()`
- `test_admin_deactivate_content_file()`
- `test_admin_reassign_content_file()`

## Public Web App: `apps/web`

### Purpose

The public web app is the browsing and unlock client for users. It is intentionally designed so discovery stays on the site while file delivery shifts to Telegram.

### `apps/web/README.md`

Run instructions and high-level notes about the live API fallback behavior.

### `apps/web/package.json`

Node package manifest for the public app. It defines Next.js and React dependencies and the dev/build scripts.

### `apps/web/package-lock.json`

Lockfile for deterministic Node dependency installation.

### `apps/web/next.config.mjs`

Next.js configuration file.

### `apps/web/app/layout.js`

App Router layout wrapper for the public app. It provides global document structure and imports global styles.

### `apps/web/app/globals.css`

All public app styling. It controls the shell, hero, catalog grid, detail rail, tab states, and responsive layout.

### `apps/web/lib/fallback-catalog.js`

Seeded demo data used when the backend is unavailable. It allows the frontend layout and flow to be testable without a live API.

### `apps/web/app/page.js`

Main public React page. This is the core client-side experience right now.

Top-level helper functions:

- `formatBytes(bytes)`
  - user-facing file size formatting

- `backgroundImage(url)`
  - converts image URLs into layered background styles for cards and hero areas

- `mergeUniqueItems(...groups)`
  - merges featured, movie, and audio collections without duplicates

- `fetchJson(baseUrl, path, options = {})`
  - standard fetch wrapper for the public API

Main component:

- `Page()`
  - root React component for the public site

Important inner functions inside `Page()`:

- `loadCollections()`
  - loads homepage, movies, and audio from the backend
  - falls back to demo data if the backend fails

- `loadItemDetails(item, options = {})`
  - fetches detail payload for one movie, series, or audio item

- `selectItem(item, options = {})`
  - selects one title, loads its detail, and resets the current session panel

- `performSearch()`
  - runs live search or local fallback search

- `createSession(consumePoints)`
  - starts a download session
  - can either use the ad path or immediate points path

- `usePointsForSession()`
  - upgrades an already-created session by spending points

Main UI state concepts:

- `activeView`
  - `discover`, `unlock`, or `wallet`

- `activeSection`
  - `featured`, `movies`, or `audio`

- `activeDetailPanel`
  - `overview`, `files`, or `unlock`

- `activeItem`
  - currently selected movie or audio item

- `activeFileId`
  - currently selected downloadable file

- `activeSession`
  - current unlock session

How the page behaves:

- left side handles browsing and top-level navigation
- right side is the detail rail
- file selection happens in the detail rail
- unlock controls also live in the detail rail
- the Telegram deep link is only relevant once a session exists

## Admin App: `apps/admin`

### Purpose

The admin app is the operations console for:

- admin identity
- analytics overview
- inventory management
- content-file management
- user moderation
- point adjustments
- audit visibility

### `apps/admin/README.md`

Admin setup notes and feature summary.

### `apps/admin/package.json`

Node package manifest for the admin app.

### `apps/admin/package-lock.json`

Lockfile for deterministic Node dependency installation.

### `apps/admin/next.config.mjs`

Next.js configuration file.

### `apps/admin/app/layout.js`

App Router layout wrapper for the admin app.

### `apps/admin/app/globals.css`

All admin styling. It controls the operator shell, side navigation, tables, forms, searchable file pickers, chips, and audit views.

### `apps/admin/lib/fallback-admin.js`

Seeded dashboard/demo data used when the backend is unavailable.

### `apps/admin/app/page.js`

Main admin React page and the current operational center of the frontend.

Top-level helper functions:

- `slugify(value)`
  - generates slugs from entered titles

- `fetchJson(baseUrl, path, options = {}, admin = false, auth = {})`
  - fetch wrapper
  - optionally adds admin auth headers

Main component:

- `Page()`
  - root React component for the admin console

Important computed values:

- `normalizedInventory`
  - filters inventory by search query and type

- `filteredMovieAttachableFiles`
  - searchable list of files for the movie file picker

- `filteredAudioAttachableFiles`
  - searchable list of files for the audio file picker

Important inner functions inside `Page()`:

- `setMode(mode, message)`
  - updates app mode/status feedback

- `loadInventory(baseUrl, authData)`
  - fetches movies, audio items, and content files

- `loadOperationsData(baseUrl, authData)`
  - fetches platform users and audit logs

- `loadDashboard()`
  - loads admin identity, overview, admin users, inventory, and operations data
  - falls back to demo data if live calls fail

- `submitMovie(event)`
  - creates or updates a movie
  - when creating, can attach multiple selected existing content files

- `submitAudio(event)`
  - creates or updates an audio item
  - when creating, can attach multiple selected existing content files

- `submitFile(event)`
  - creates or updates a content file record

- `submitPointsAdjustment(event)`
  - applies a manual points adjustment

- `archiveInventoryItem(type, id)`
  - archives a movie or audio item

- `deactivateContentFile(id)`
  - deactivates a content file

- `updatePlatformUserBanState(userId, isBanned)`
  - bans or unbans a user

- `permissionPills(user)`
  - converts admin permissions into UI labels

- `startEditInventory(item)`
  - moves the UI into the correct edit form for a movie or audio item

- `startEditFile(file)`
  - moves the UI into content-file edit mode

- `toggleMovieContentFile(contentFileId)`
  - selects or deselects one file in the movie picker

- `toggleAudioContentFile(contentFileId)`
  - selects or deselects one file in the audio picker

- `selectedMovieFilesLabel()`
  - friendly label for the movie picker trigger

- `selectedAudioFilesLabel()`
  - friendly label for the audio picker trigger

Important admin UX rule:

- the movie and audio creation forms do not force a full content-file form inside them
- instead, they let the admin choose from existing downloadable files using a searchable multi-select dropdown
- this is important because content files can be numerous

Important content-file status rule:

- files show whether they are `unassigned` or already `attached`
- this helps avoid accidental reassignment

## Current Architectural Boundaries

### What the frontend owns

- presentation
- client-side view state
- calling backend endpoints
- fallback demo mode

### What the backend owns

- visibility rules
- content-to-file relationships
- session creation and expiration
- points spending and rewards
- ad verification
- Telegram session validation
- admin permissions
- audit logging

### What the database owns

- persistent content records
- file records
- session state
- points ledger
- ad logs
- audit logs
- admin roles

## Important Business Rules in the Current Code

1. Public titles should not appear unless they are published and have active downloadable files.
2. `content_files` are separate from movies and audio because one title can have many downloadable versions.
3. The Telegram username is not the best identity key; the stable long-term key is `telegram_user_id`.
4. Rewarded ad verification must happen server-to-server before it changes unlock state.
5. Client ad event intake is only for analytics and should not unlock content by itself.
6. The admin console can reassign content files, so the UI exposes assignment state to reduce mistakes.

## Current Gaps and Future Work

These are notable areas that still need expansion:

- richer user auth beyond the current placeholders
- deeper series and episode publishing workflows in the admin app
- homepage section management UI
- ad slot management UI
- stronger admin auth model than the bootstrap token
- browser/runtime verification pass on both Next.js frontends
- Android client implementation
- shared package extraction when the frontend grows

## Recommended Reading Order for New Contributors

If someone is onboarding, this is the best order:

1. `README.md`
2. `PRODUCT_PLAN.md`
3. `ROADMAP.md`
4. `docs/api/API_SPEC.md`
5. `supabase/schema.sql`
6. `apps/api/app/main.py`
7. `apps/api/app/api/v1/router.py`
8. `apps/api/app/repositories/catalog.py`
9. `apps/api/app/repositories/downloads.py`
10. `apps/api/app/repositories/ads.py`
11. `apps/api/app/repositories/admin.py`
12. `apps/web/app/page.js`
13. `apps/admin/app/page.js`

That order usually makes the system click much faster than reading frontend files first.
