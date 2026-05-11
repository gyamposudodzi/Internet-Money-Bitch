-- Singleton row for public / admin-editable web + Telegram delivery copy.
create table if not exists public.platform_settings (
  id smallint primary key default 1 check (id = 1),
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id, settings)
values (
  1,
  jsonb_build_object(
    'telegram_bot_username',
    '',
    'public_site_url',
    '',
    'rewarded_ad_duration_seconds',
    5,
    'download_help_text',
    'Open Telegram, watch the short sponsored clip (~5 seconds), then the bot sends your file.',
    'visitor_param_hint',
    'Visitor links from Telegram should include user_id or telegram_user_id in the query string.',
    'telegram_demo_deep_link',
    'https://t.me/demo_bot?start=demo-token'
  )
)
on conflict (id) do nothing;
