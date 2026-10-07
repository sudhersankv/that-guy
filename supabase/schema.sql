-- That Guy schema. Paste into Supabase > SQL editor and run once.

create table if not exists guys (
  id text primary key,
  name text not null,
  lat double precision,
  lng double precision
);

create table if not exists providers (
  id text primary key, -- Google place id
  name text not null,
  trade text,
  phone text,
  email text,
  website text,
  address text,
  rating double precision,
  reviews integer,
  lat double precision,
  lng double precision,
  updated_at timestamptz default now()
);

-- The agent-to-agent network: what actually happened.
create table if not exists reviews (
  id text primary key default gen_random_uuid()::text,
  guy_id text references guys(id),
  provider_id text references providers(id),
  outcome text check (outcome in ('great','ok','bad','no_show')),
  quote text,
  price integer,
  date date default current_date,
  rating integer
);

create table if not exists problems (
  id text primary key,
  status text not null,
  data jsonb not null,   -- the Problem object the UI renders
  meta jsonb not null default '{}'::jsonb, -- input text, location, timings
  session_id text,       -- Agent37 session
  created_at timestamptz default now()
);

-- Last agent result per area+trade: fallback when Agent37 is slow.
create table if not exists agent_cache (
  key text primary key,
  result jsonb not null,
  updated_at timestamptz default now()
);

-- Me + 8 simulated neighbors (disclosed in the demo), around the Mission, SF.
insert into guys (id, name, lat, lng) values
  ('me', 'Me', 37.7599, -122.4148),
  ('leo', 'Leo''s guy', 37.7620, -122.4160),
  ('priya', 'Priya''s guy', 37.7570, -122.4120),
  ('dana', 'Dana''s guy', 37.7640, -122.4190),
  ('sam', 'Sam''s guy', 37.7555, -122.4200),
  ('ana', 'Ana''s guy', 37.7660, -122.4100),
  ('raj', 'Raj''s guy', 37.7530, -122.4090),
  ('wen', 'Wen''s guy', 37.7680, -122.4220),
  ('marco', 'Marco''s guy', 37.7510, -122.4240)
on conflict (id) do nothing;
