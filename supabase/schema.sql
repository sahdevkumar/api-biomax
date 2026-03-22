-- BioMax Cloud — full database schema
-- Run this in Supabase SQL editor

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── TABLES ──────────────────────────────────────────────────────────────────

create table if not exists devices (
  id              uuid default uuid_generate_v4() primary key,
  device_id       varchar(50) unique not null,
  name            varchar(100),
  ip_address      varchar(15),
  location        varchar(100),
  status          varchar(20) default 'OFFLINE' check (status in ('ONLINE','OFFLINE','ERROR')),
  last_seen       timestamptz,
  firmware_version varchar(50),
  serial_number   varchar(100),
  max_users       int default 1000,
  max_fingerprints int default 3000,
  max_faces       int default 500,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists users (
  id              uuid default uuid_generate_v4() primary key,
  employee_code   varchar(50) unique not null,
  full_name       varchar(100) not null,
  email           varchar(100),
  department      varchar(50),
  phone           varchar(20),
  role            varchar(20) default 'USER' check (role in ('ADMIN','MANAGER','USER')),
  photo_url       text,
  created_at      timestamptz default now()
);

create table if not exists device_users (
  id               uuid default uuid_generate_v4() primary key,
  device_id        uuid references devices(id) on delete cascade,
  user_id          uuid references users(id) on delete cascade,
  device_uid       int not null,
  fingerprint_count int default 0,
  face_enrolled    boolean default false,
  card_number      varchar(50),
  password_hash    varchar(255),
  enrolled_at      timestamptz default now(),
  last_sync_at     timestamptz,
  unique(device_id, device_uid),
  unique(device_id, user_id)
);

create table if not exists attendance_logs (
  id              uuid default uuid_generate_v4() primary key,
  device_id       uuid references devices(id),
  user_id         uuid references users(id),
  device_uid      int,
  punch_time      timestamptz not null,
  record_type     varchar(20) default 'CHECK_IN' check (record_type in ('CHECK_IN','CHECK_OUT','BREAK_OUT','BREAK_IN','OVERTIME_IN','OVERTIME_OUT')),
  verify_mode     varchar(30) default 'FINGERPRINT',
  temperature     decimal(4,2),
  mask_worn       boolean,
  photo_url       text,
  processed       boolean default false,
  raw_data        jsonb,
  created_at      timestamptz default now()
);

create table if not exists device_commands (
  id              uuid default uuid_generate_v4() primary key,
  device_id       uuid references devices(id) on delete cascade,
  command         varchar(50) not null,
  params          jsonb default '{}',
  status          varchar(20) default 'PENDING' check (status in ('PENDING','SENT','SUCCESS','FAILED')),
  result          jsonb,
  executed_at     timestamptz,
  created_at      timestamptz default now()
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────

create index if not exists idx_attendance_user_time    on attendance_logs(user_id, punch_time desc);
create index if not exists idx_attendance_device_time  on attendance_logs(device_id, punch_time desc);
create index if not exists idx_attendance_punch_time   on attendance_logs(punch_time desc);
create index if not exists idx_commands_device_status  on device_commands(device_id, status);
create index if not exists idx_commands_status         on device_commands(status);
create index if not exists idx_device_users_device     on device_users(device_id);
create index if not exists idx_device_users_user       on device_users(user_id);
create index if not exists idx_devices_device_id       on devices(device_id);
create index if not exists idx_devices_status          on devices(status);

-- ── REALTIME ─────────────────────────────────────────────────────────────────

alter publication supabase_realtime add table attendance_logs;
alter publication supabase_realtime add table device_commands;
alter publication supabase_realtime add table devices;

-- ── AUTO-UPDATE updated_at ────────────────────────────────────────────────────

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_devices_updated_at on devices;
create trigger trg_devices_updated_at
  before update on devices
  for each row execute function update_updated_at();

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────────

alter table devices         enable row level security;
alter table users           enable row level security;
alter table device_users    enable row level security;
alter table attendance_logs enable row level security;
alter table device_commands enable row level security;

-- Service role bypasses RLS (used by API routes)
-- Dashboard/app policies (adjust to your auth setup)

create policy "service_role_all_devices"         on devices         for all using (true);
create policy "service_role_all_users"           on users           for all using (true);
create policy "service_role_all_device_users"    on device_users    for all using (true);
create policy "service_role_all_attendance"      on attendance_logs for all using (true);
create policy "service_role_all_commands"        on device_commands for all using (true);

-- ── SAMPLE DATA (optional, comment out for production) ──────────────────────

-- insert into devices (device_id, name, location, status) values
--   ('DEMO001', 'Main entrance', 'Head office', 'OFFLINE'),
--   ('DEMO002', 'Back entrance', 'Head office', 'OFFLINE');

-- insert into users (employee_code, full_name, email, department, role) values
--   ('1', 'Demo Admin', 'admin@company.com', 'Management', 'ADMIN'),
--   ('2', 'Test Employee', 'emp@company.com', 'Engineering', 'USER');
