-- ═══════════════════════════════════════════════════
-- SOLU — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Plans ────────────────────────────────────────────────
create table plans (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  monthly_budget numeric not null default 0,
  start_date text not null, -- format: YYYY-MM
  end_date text not null,   -- format: YYYY-MM
  status text not null default 'active' check (status in ('active', 'archived')),
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Goals ────────────────────────────────────────────────
create table goals (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references plans(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  amount numeric not null default 0,
  type text not null default 'debt' check (type in ('debt', 'savings')),
  priority integer not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Payments ─────────────────────────────────────────────
create table payments (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid references plans(id) on delete cascade not null,
  goal_id uuid references goals(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  month_key text not null,          -- format: YYYY-MM
  scheduled_amount numeric not null default 0,
  amount_paid numeric not null default 0,
  is_checked boolean not null default false,
  is_partial boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(goal_id, month_key)
);

-- ── Row Level Security ───────────────────────────────────
alter table plans enable row level security;
alter table goals enable row level security;
alter table payments enable row level security;

-- Plans: users can only see/edit their own
create policy "Users own their plans"
  on plans for all using (auth.uid() = user_id);

-- Goals: users can only see/edit their own
create policy "Users own their goals"
  on goals for all using (auth.uid() = user_id);

-- Payments: users can only see/edit their own
create policy "Users own their payments"
  on payments for all using (auth.uid() = user_id);

-- ── Updated_at triggers ──────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger plans_updated_at before update on plans
  for each row execute function update_updated_at();

create trigger goals_updated_at before update on goals
  for each row execute function update_updated_at();

create trigger payments_updated_at before update on payments
  for each row execute function update_updated_at();
