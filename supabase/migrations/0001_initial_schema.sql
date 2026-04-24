create extension if not exists "pgcrypto";

create type public.app_role as enum ('user', 'admin', 'editor', 'moderator');
create type public.content_kind as enum ('movie', 'series', 'episode', 'audio');
create type public.publication_status as enum ('draft', 'scheduled', 'published', 'archived');
create type public.delivery_mode as enum ('telegram_bot', 'telegram_channel', 'external_link');
create type public.session_status as enum ('created', 'ad_pending', 'ad_verified', 'completed', 'expired', 'cancelled');
create type public.point_tx_type as enum ('earn', 'spend', 'adjustment', 'refund', 'bonus');
create type public.ad_event_type as enum ('impression', 'click', 'started', 'completed', 'rewarded', 'failed');
create type public.storage_provider as enum ('r2', 'b2', 's3', 'other');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint unique,
  telegram_username text,
  telegram_first_name text,
  telegram_last_name text,
  points_balance integer not null default 0 check (points_balance >= 0),
  role public.app_role not null default 'user',
  is_banned boolean not null default false,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  device_fingerprint text,
  platform text,
  app_version text,
  last_ip inet,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  synopsis text,
  poster_url text,
  backdrop_url text,
  trailer_url text,
  release_year integer,
  duration_minutes integer,
  language text,
  country text,
  imdb_rating numeric(3,1),
  publication_status public.publication_status not null default 'draft',
  featured_rank integer,
  published_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.movie_genres (
  movie_id uuid not null references public.movies(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (movie_id, genre_id)
);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  synopsis text,
  poster_url text,
  backdrop_url text,
  release_year integer,
  language text,
  country text,
  publication_status public.publication_status not null default 'draft',
  featured_rank integer,
  published_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.series_genres (
  series_id uuid not null references public.series(id) on delete cascade,
  genre_id uuid not null references public.genres(id) on delete cascade,
  primary key (series_id, genre_id)
);

create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  season_number integer not null,
  title text,
  synopsis text,
  release_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, season_number)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  title text not null,
  slug text not null unique,
  synopsis text,
  episode_number integer not null,
  duration_minutes integer,
  publication_status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, episode_number)
);

create table public.audio_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  artist text,
  album text,
  synopsis text,
  cover_url text,
  language text,
  duration_seconds integer,
  publication_status public.publication_status not null default 'draft',
  featured_rank integer,
  published_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.content_files (
  id uuid primary key default gen_random_uuid(),
  content_kind public.content_kind not null,
  content_id uuid not null,
  label text,
  quality text,
  format text,
  file_size_bytes bigint,
  storage_provider public.storage_provider not null,
  storage_bucket text,
  storage_key text not null,
  mime_type text,
  delivery_mode public.delivery_mode not null default 'telegram_bot',
  telegram_channel_id bigint,
  telegram_message_id bigint,
  requires_ad boolean not null default true,
  points_cost integer not null default 0 check (points_cost >= 0),
  is_active boolean not null default true,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telegram_channels (
  id uuid primary key default gen_random_uuid(),
  telegram_channel_id bigint not null unique,
  channel_username text,
  title text not null,
  is_active boolean not null default true,
  default_ad_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.download_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token uuid not null default gen_random_uuid() unique,
  user_id uuid not null references public.users(id) on delete cascade,
  content_file_id uuid not null references public.content_files(id) on delete cascade,
  telegram_channel_id uuid references public.telegram_channels(id),
  status public.session_status not null default 'created',
  ad_required boolean not null default true,
  ad_completed boolean not null default false,
  points_spent integer not null default 0 check (points_spent >= 0),
  unlocked_at timestamptz,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.ad_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  callback_secret text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ad_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  download_session_id uuid references public.download_sessions(id) on delete set null,
  provider_id uuid references public.ad_providers(id) on delete set null,
  external_event_id text,
  event_type public.ad_event_type not null,
  campaign text,
  reward_points integer not null default 0,
  verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  transaction_type public.point_tx_type not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  source text not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create table public.content_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.users(id) on delete set null,
  title text not null,
  content_kind public.content_kind not null,
  notes text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  can_manage_content boolean not null default false,
  can_manage_users boolean not null default false,
  can_manage_rewards boolean not null default false,
  can_view_analytics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ad_slots (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  location text not null,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_telegram_user_id on public.users(telegram_user_id);
create index idx_movies_publication_status on public.movies(publication_status, published_at desc);
create index idx_series_publication_status on public.series(publication_status, published_at desc);
create index idx_episodes_publication_status on public.episodes(publication_status, published_at desc);
create index idx_audio_publication_status on public.audio_items(publication_status, published_at desc);
create index idx_content_files_lookup on public.content_files(content_kind, content_id, is_active);
create index idx_download_sessions_user_id on public.download_sessions(user_id, created_at desc);
create index idx_download_sessions_token on public.download_sessions(session_token);
create index idx_ad_events_user_id on public.ad_events(user_id, created_at desc);
create index idx_point_transactions_user_id on public.point_transactions(user_id, created_at desc);
create index idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id, created_at desc);

comment on table public.content_files is 'Maps movies, episodes, series bundles, or audio items to externally stored files and Telegram delivery settings.';
comment on column public.content_files.content_id is 'Application layer must enforce that content_id matches the selected content_kind.';
comment on column public.download_sessions.session_token is 'Short-lived token passed to the Telegram bot or channel deep-link flow.';
comment on column public.users.telegram_user_id is 'Preferred stable identity key for Telegram-linked users.';
