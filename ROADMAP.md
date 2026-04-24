# IMB Roadmap

This file is the project's progress tracker.

Use it to answer:

- Where are we now?
- What is already done?
- What is next?
- What is blocked or still undefined?

## Current Status

Current phase: `Backend foundation`

Overall progress:

- Product plan: done
- Database schema draft: done
- API spec draft: done
- Repo structure scaffold: done
- Runtime app setup: in progress
- Backend implementation: in progress
- Web app implementation: in progress
- Admin dashboard implementation: not started
- Telegram bot integration: in progress
- Ads and points implementation: in progress
- Android preparation docs: partial

## Progress Legend

- `[x]` Done
- `[~]` In progress
- `[ ]` Not started
- `[!]` Blocked / needs decision

## Phase Roadmap

## Phase 0: Product Definition

- [x] Write the master product plan
- [x] Define the core user flow for movies
- [x] Define the audio flow
- [x] Define the Telegram handoff concept
- [x] Define the points and ad reward concept
- [x] Define admin dashboard scope
- [x] Define Android-ready backend direction

Exit condition:

- The team agrees on the MVP and the main business logic

## Phase 1: Architecture and Contracts

- [x] Create initial database schema draft
- [x] Create initial API specification
- [x] Create base monorepo folder structure
- [x] Choose final backend framework
- [ ] Choose final frontend framework/runtime details
- [ ] Choose ad provider strategy
- [ ] Choose external storage provider
- [x] Define environment variable strategy

Exit condition:

- We have enough technical decisions to start coding without reworking the foundation

## Phase 2: Backend Foundation

- [x] Set up backend app scaffold
- [x] Set up config and environment loading
- [~] Set up database connection
- [~] Add migrations workflow
- [~] Add authentication foundation
- [x] Add error handling and response format
- [ ] Add logging and audit helpers
- [x] Add health check endpoint

Exit condition:

- Backend starts locally and can talk to Supabase/Postgres correctly

## Phase 3: Catalog and Content Management

- [ ] Build movie CRUD
- [ ] Build series CRUD
- [ ] Build seasons and episodes CRUD
- [ ] Build audio CRUD
- [ ] Build genre management
- [ ] Build content file management
- [ ] Build publish/unpublish flow
- [~] Build search/filter endpoints

Exit condition:

- Admins can create and manage media records and the public API can serve them

## Phase 4: Public Web App

- [~] Set up web app scaffold
- [ ] Build homepage
- [ ] Build browse/search pages
- [ ] Build movie details page
- [ ] Build series details page
- [ ] Build audio details page
- [ ] Build download CTA flow
- [ ] Build points display UI
- [ ] Build responsive mobile layout

Exit condition:

- Users can browse published content and reach the download handoff flow

## Phase 5: Telegram Delivery

- [ ] Create Telegram bot
- [~] Set up webhook handling
- [ ] Implement Telegram account linking
- [~] Implement session-token deep links
- [~] Validate download sessions in bot flow
- [ ] Send delivery instructions or file access
- [~] Record Telegram delivery completion

Exit condition:

- A user can start on the web app and complete delivery through Telegram

## Phase 6: Ads and Rewards

- [ ] Integrate rewarded ad provider
- [~] Implement ad event ingestion
- [~] Implement server-side verification
- [~] Award points on valid completion
- [ ] Implement points spending for ad bypass
- [ ] Add anti-abuse checks
- [ ] Add user points history

Exit condition:

- Ad completion and points bypass work reliably and safely

## Phase 7: Admin Dashboard

- [ ] Set up admin app scaffold
- [ ] Build content publishing UI
- [ ] Build file/quality assignment UI
- [ ] Build user monitoring tools
- [ ] Build points adjustment tools
- [ ] Build analytics overview
- [ ] Build ad slot and homepage section management
- [ ] Build audit log view

Exit condition:

- Operators can manage the platform without touching the database directly

## Phase 8: Security and Hardening

- [ ] Add Supabase RLS policies
- [~] Add permission enforcement for admin routes
- [ ] Add rate limiting
- [ ] Add signed URL generation rules
- [ ] Add abuse detection heuristics
- [ ] Add monitoring and alerting
- [ ] Add backup and recovery plan

Exit condition:

- The platform is safe enough for controlled real-world usage

## Phase 9: Android Readiness

- [ ] Finalize versioned API contracts
- [ ] Write mobile integration notes
- [ ] Confirm auth flow works for mobile
- [ ] Confirm Telegram deep links work for mobile clients
- [ ] Optimize payloads for app usage

Exit condition:

- Backend is ready for Android development to begin

## Current Priorities

These are the best next tasks from where the repo is today:

1. Wire remaining route groups to database repositories
2. Add a simple local seed/run workflow for Postgres or Supabase
3. Start the admin dashboard scaffold against the live API
4. Strengthen admin auth beyond shared-token bootstrap mode
5. Expand the public web app into routed pages and real user auth

## Open Decisions

- [x] Backend framework: `FastAPI`
- [!] Frontend app setup: `Next.js` or plain React/Vite
- [!] External media storage provider
- [!] Rewarded ad provider
- [!] Telegram delivery style: bot-first only or bot + channel hybrid
- [!] Auth model details for admin users

## Working Notes

Keep this file updated whenever:

- a phase starts
- a milestone is completed
- architecture decisions change
- blockers appear

Recommended update rule:

- Update this file in the same pull request as the actual work whenever possible.
