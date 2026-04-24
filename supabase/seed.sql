insert into public.users (
  id,
  telegram_user_id,
  telegram_username,
  telegram_first_name,
  points_balance,
  role
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    900000001,
    'imb_admin',
    'IMB',
    250,
    'admin'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    900000002,
    'imb_viewer',
    'Viewer',
    30,
    'user'
  )
on conflict (id) do nothing;

insert into public.admin_roles (
  user_id,
  can_manage_content,
  can_manage_users,
  can_manage_rewards,
  can_view_analytics
)
values (
  '11111111-1111-1111-1111-111111111111',
  true,
  true,
  true,
  true
)
on conflict (user_id) do nothing;

insert into public.genres (id, name, slug)
values
  ('33333333-3333-3333-3333-333333333331', 'Action', 'action'),
  ('33333333-3333-3333-3333-333333333332', 'Drama', 'drama'),
  ('33333333-3333-3333-3333-333333333333', 'Soundtrack', 'soundtrack')
on conflict (id) do nothing;

insert into public.movies (
  id,
  title,
  slug,
  synopsis,
  poster_url,
  backdrop_url,
  release_year,
  duration_minutes,
  language,
  country,
  imdb_rating,
  publication_status,
  featured_rank,
  published_at,
  created_by
)
values (
  '44444444-4444-4444-4444-444444444441',
  'Heatline',
  'heatline',
  'A courier outruns a citywide blackout while carrying evidence that could collapse a syndicate.',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
  2026,
  118,
  'en',
  'US',
  7.9,
  'published',
  1,
  now(),
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.movie_genres (movie_id, genre_id)
values
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333331'),
  ('44444444-4444-4444-4444-444444444441', '33333333-3333-3333-3333-333333333332')
on conflict do nothing;

insert into public.audio_items (
  id,
  title,
  slug,
  artist,
  album,
  synopsis,
  cover_url,
  language,
  duration_seconds,
  publication_status,
  featured_rank,
  published_at,
  created_by
)
values (
  '55555555-5555-5555-5555-555555555551',
  'Night Drive',
  'night-drive',
  'Sora Vale',
  'City Afterlight',
  'A synth-heavy track used for testing the audio discovery flow.',
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=800&q=80',
  'en',
  219,
  'published',
  1,
  now(),
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.content_files (
  id,
  content_kind,
  content_id,
  label,
  quality,
  format,
  file_size_bytes,
  storage_provider,
  storage_bucket,
  storage_key,
  mime_type,
  delivery_mode,
  requires_ad,
  points_cost,
  is_active,
  created_by
)
values
  (
    '66666666-6666-6666-6666-666666666661',
    'movie',
    '44444444-4444-4444-4444-444444444441',
    'Heatline 720p',
    '720p',
    'mp4',
    1572864000,
    'r2',
    'movies',
    'heatline/heatline-720p.mp4',
    'video/mp4',
    'telegram_bot',
    true,
    10,
    true,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '66666666-6666-6666-6666-666666666662',
    'movie',
    '44444444-4444-4444-4444-444444444441',
    'Heatline 1080p',
    '1080p',
    'mp4',
    2147483648,
    'r2',
    'movies',
    'heatline/heatline-1080p.mp4',
    'video/mp4',
    'telegram_bot',
    true,
    15,
    true,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '66666666-6666-6666-6666-666666666663',
    'audio',
    '55555555-5555-5555-5555-555555555551',
    'Night Drive MP3',
    '320kbps',
    'mp3',
    10485760,
    'r2',
    'audio',
    'night-drive/night-drive-320.mp3',
    'audio/mpeg',
    'telegram_bot',
    true,
    5,
    true,
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

insert into public.ad_slots (id, key, title, location, is_active, config)
values
  (
    '77777777-7777-7777-7777-777777777771',
    'home-inline',
    'Home Inline',
    'home_feed',
    true,
    '{"format":"banner","provider":"house"}'::jsonb
  ),
  (
    '77777777-7777-7777-7777-777777777772',
    'detail-inline',
    'Detail Inline',
    'movie_detail',
    true,
    '{"format":"reward-prompt","provider":"house"}'::jsonb
  )
on conflict (id) do nothing;

insert into public.ad_providers (id, name, callback_secret, is_active)
values
  (
    '88888888-8888-8888-8888-888888888881',
    'house_ads',
    'local-dev-secret',
    true
  )
on conflict (id) do nothing;
