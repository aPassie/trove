-- initial schema — users, cases, documents, agent steps, audit, notifications

create extension if not exists "pgcrypto";

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  identity_provider text not null,
  identity_subject text not null,
  created_at timestamptz not null default now(),
  unique (identity_provider, identity_subject)
);

create type case_type as enum ('tds_refund', 'pf_withdrawal', 'gst_credit');

create type case_status as enum (
  'opened',
  'pulling_documents',
  'analysing',
  'awaiting_approval',
  'drafting',
  'ready',
  'closed',
  'failed'
);

create table cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  case_type case_type not null default 'tds_refund',
  status case_status not null default 'opened',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  refund_estimate numeric(12, 2),
  refund_amount numeric(12, 2)
);

create index cases_user_id_idx on cases(user_id);
create index cases_status_idx on cases(status);

create type document_source as enum ('uploaded', 'pulled_setu', 'pulled_digilocker', 'generated');

create table documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  kind text not null,
  source document_source not null,
  r2_key text not null,
  content_hash text not null,
  parsed_data jsonb,
  created_at timestamptz not null default now()
);

create index documents_case_id_idx on documents(case_id);

create table agent_steps (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  step_name text not null,
  status text not null,
  llm_model text,
  input_redacted jsonb,
  output_redacted jsonb,
  latency_ms integer,
  cost_usd numeric(10, 6),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index agent_steps_case_id_idx on agent_steps(case_id);

create table audit_entries (
  id bigserial primary key,
  actor text not null,
  action text not null,
  target text not null,
  payload jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_entries_occurred_at_idx on audit_entries(occurred_at desc);
create index audit_entries_target_idx on audit_entries(target);

create type notification_channel as enum ('email', 'sms');

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  channel notification_channel not null,
  target text not null,
  payload jsonb not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications(user_id);
create index notifications_case_id_idx on notifications(case_id);
