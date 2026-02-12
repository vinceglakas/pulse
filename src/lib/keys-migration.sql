-- Migration: API Keys table for Ultron
-- Run this in your Supabase SQL editor

create table if not exists api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  encrypted_key text not null,
  key_hint text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_api_keys_user_id on api_keys (user_id);

alter table api_keys enable row level security;

create policy "Users can view own keys"
  on api_keys for select
  using (user_id = auth.uid()::text);

create policy "Users can insert own keys"
  on api_keys for insert
  with check (user_id = auth.uid()::text);

create policy "Users can delete own keys"
  on api_keys for delete
  using (user_id = auth.uid()::text);
