-- KissanShakti farm labor and equipment rental platform schema.
-- Run this in Supabase SQL Editor to cleanly recreate the schema and seed mock data.

-- ==========================================
-- 1. CLEAN SLATE: Drop existing tables to clear type conflicts
-- ==========================================
drop table if exists public.sync_logs cascade;
drop table if exists public.sync_queue cascade;
drop table if exists public.workers cascade;
drop table if exists public.advisories cascade;
drop table if exists public.inquiries cascade;
drop table if exists public.draft_listings cascade;
drop table if exists public.listings cascade;
drop table if exists public.engagements cascade;
drop table if exists public.voice_sessions cascade;
drop table if exists public.blacklist cascade;
drop table if exists public.notifications cascade;
drop table if exists public.workdays cascade;
drop table if exists public.applications cascade;
drop table if exists public.jobs cascade;
drop table if exists public.rentals cascade;
drop table if exists public.equipment cascade;
drop table if exists public.profiles cascade;

-- ==========================================
-- 2. FRESH TABLE CREATION (All IDs as TEXT)
-- ==========================================
create table public.profiles (
  id text primary key,
  email text unique,
  full_name text not null,
  phone text,
  role text not null check (role in ('FARMER', 'LABORER', 'ADMIN', 'BUYER')),
  state text,
  skills text[] default '{}',
  buyer_type text,
  preferences text[] default '{}',
  daily_rate numeric,
  experience_yrs integer,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'BLACKLISTED')),
  blacklist_reason text,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.equipment (
  id text primary key,
  owner_id text references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  daily_rate numeric not null check (daily_rate > 0),
  available boolean default true,
  location text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.rentals (
  id text primary key,
  equipment_id text references public.equipment(id) on delete cascade,
  renter_id text references public.profiles(id) on delete cascade,
  owner_id text references public.profiles(id) on delete cascade,
  status text default 'REQUESTED' check (status in ('REQUESTED', 'ACCEPTED', 'ACTIVE', 'COMPLETED', 'REJECTED', 'CANCELLED')),
  start_date date not null,
  end_date date not null,
  days integer not null default 1,
  total_cost numeric not null default 0,
  message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.jobs (
  id text primary key,
  farmer_id text references public.profiles(id) on delete cascade,
  laborer_id text references public.profiles(id) on delete set null,
  title text not null,
  description text not null,
  location text,
  required_skill text,
  daily_wage numeric not null check (daily_wage > 0),
  planned_days integer default 1,
  start_date date,
  status text default 'OPEN' check (status in ('OPEN', 'ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists one_active_job_per_laborer
  on public.jobs(laborer_id)
  where laborer_id is not null and status in ('ASSIGNED', 'ACTIVE');

create table public.applications (
  id text primary key,
  job_id text references public.jobs(id) on delete cascade,
  laborer_id text references public.profiles(id) on delete cascade,
  status text default 'PENDING' check (status in ('PENDING', 'ACCEPTED', 'REJECTED')),
  message text,
  created_at timestamptz default now(),
  unique(job_id, laborer_id)
);

create table public.workdays (
  id text primary key,
  job_id text references public.jobs(id) on delete cascade,
  laborer_id text references public.profiles(id) on delete cascade,
  date date not null,
  present boolean default true,
  note text,
  created_at timestamptz default now(),
  unique(job_id, date)
);

create table public.notifications (
  id text primary key,
  user_id text references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean default false,
  link text,
  created_at timestamptz default now()
);

create table public.blacklist (
  id text primary key,
  email text,
  phone text,
  reason text not null,
  created_at timestamptz default now()
);

create table public.voice_sessions (
  id text primary key,
  user_id text references public.profiles(id) on delete set null,
  session_id text not null,
  transcript text not null,
  language text default 'en-IN',
  translated_text text,
  source text default 'intern4-ai-transcriber',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table public.engagements (
  id text primary key,
  farmer_id text references public.profiles(id) on delete cascade,
  worker_id text references public.profiles(id) on delete cascade,
  job_id text references public.jobs(id) on delete cascade,
  cost_per_laborer numeric not null check (cost_per_laborer >= 0),
  working_days integer default 1 check (working_days > 0),
  duration text,
  assigned_tasks text[] default '{}',
  status text default 'ACTIVE' check (status in ('ACTIVE', 'ASSIGNED', 'COMPLETED', 'CANCELLED')),
  total_cost numeric not null default 0 check (total_cost >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.listings (
  id text primary key,
  farmer_id text references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  quantity_kg numeric not null default 0 check (quantity_kg >= 0),
  price_per_kg numeric not null default 0 check (price_per_kg >= 0),
  location text,
  description text,
  status text default 'active' check (status in ('active', 'draft', 'flagged')),
  flag_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.draft_listings (
  id text primary key,
  farmer_id text references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  quantity_kg numeric not null default 0 check (quantity_kg >= 0),
  price_per_kg numeric not null default 0 check (price_per_kg >= 0),
  location text,
  description text,
  status text default 'draft' check (status in ('draft', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.inquiries (
  id text primary key,
  buyer_id text references public.profiles(id) on delete cascade,
  farmer_id text references public.profiles(id) on delete cascade,
  listing_id text references public.listings(id) on delete cascade,
  message text,
  quantity_kg numeric check (quantity_kg >= 0),
  status text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  commission_rate numeric default 0.03 check (commission_rate >= 0),
  expected_commission numeric default 0 check (expected_commission >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.advisories (
  id text primary key,
  farmer_id text references public.profiles(id) on delete cascade,
  input_type text not null check (input_type in ('image', 'voice', 'text')),
  input_reference text,
  description text,
  language text default 'en-IN',
  diagnosis text,
  probability numeric check (probability >= 0 AND probability <= 1),
  recommendation text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.workers (
  id text primary key,
  name text not null,
  phone text,
  state text default 'Maharashtra',
  skills text[] default '{}',
  daily_rate numeric not null check (daily_rate > 0),
  status text not null default 'active' check (status in ('active', 'inactive', 'pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  sync_status text default 'pending_create'
);

create table public.sync_queue (
  id text primary key,
  action text not null check (action in ('create', 'update', 'delete')),
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

create table public.sync_logs (
  id text primary key,
  status text not null check (status in ('pending', 'completed', 'failed')),
  message text,
  records_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==========================================
-- 3. SEED DATA GENERATION
-- ==========================================
insert into public.profiles (id, email, full_name, phone, role, state, skills, buyer_type, preferences, daily_rate, experience_yrs, status, blacklist_reason, admin_note, created_at, updated_at)
values
  ('user_admin', 'admin@kissan.com', 'Platform Admin', '+91 90000 00000', 'ADMIN', NULL, '{}', NULL, '{}', NULL, NULL, 'APPROVED', NULL, '749f09bade8aca755660eeb17792da880218d4fbdc4e25fbec279d7fe9f65d70|Internal administrator', now(), now()),
  ('user_farmer_ramesh', 'ramesh@kissan.in', 'Vikas Patil', '9855667788', 'FARMER', 'Maharashtra', '{}', NULL, '{}', NULL, NULL, 'APPROVED', NULL, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f|Land records and phone verified.', now(), now()),
  ('user_farmer_anita', 'anita@kissan.in', 'Anita Kaur', '+91 98765 43210', 'FARMER', 'Punjab', '{}', NULL, '{}', NULL, NULL, 'APPROVED', NULL, 'Approved farmer.', now(), now()),
  ('user_buyer_vijay', 'vijay@kissan.in', 'Vijay Traders', '9876543210', 'BUYER', 'Maharashtra', '{}', 'trader', ARRAY['Wheat','Rice']::text[], NULL, NULL, 'APPROVED', NULL, 'e547bd13228250dfb4c7df1d1ebb78cfd9f2ada56ebb0c425d35829dd3ac4ae8|Verified buyer profile.', now(), now()),
  ('user_labor_suresh', 'suresh@kissan.in', 'Suresh Pawar', '9988776655', 'LABORER', 'Maharashtra', ARRAY['Harvesting','Sowing']::text[], NULL, '{}', 450, 6, 'APPROVED', NULL, 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f|Identity verified.', now(), now()),
  ('user_labor_amit', 'amit@kissan.in', 'Amit Pawar', '+91 92222 22222', 'LABORER', 'Maharashtra', ARRAY['Tractor Driving','Soil Tilling']::text[], NULL, '{}', 650, 4, 'APPROVED', NULL, 'Approved worker.', now(), now()),
  ('user_labor_priya', 'priya@kissan.in', 'Priya Verma', '+91 93333 33333', 'LABORER', 'Punjab', ARRAY['Weeding','Irrigation']::text[], NULL, '{}', 380, 2, 'PENDING', NULL, 'Awaiting admin verification.', now(), now());

insert into public.equipment (id, owner_id, name, category, description, daily_rate, available, location, created_at, updated_at)
values
  ('eq_tractor_575', 'user_farmer_ramesh', 'Mahindra Tractor 575 DI', 'Tractor', '47 HP tractor with trolley. Ideal for tilling and haulage.', 1800, true, 'Nashik, Maharashtra', now(), now()),
  ('eq_rotavator', 'user_farmer_ramesh', 'Rotavator (6 feet)', 'Tillage', 'Heavy-duty rotavator for seedbed preparation.', 700, true, 'Nashik, Maharashtra', now(), now()),
  ('eq_thresher', 'user_farmer_ramesh', 'Thresher Machine', 'Thresher', 'Multi-crop thresher, tractor driven.', 1200, false, 'Sinnar, Maharashtra', now(), now()),
  ('eq_harvester', 'user_farmer_anita', 'Combine Harvester', 'Harvester', 'Self-propelled combine harvester for wheat and paddy.', 6500, true, 'Ludhiana, Punjab', now(), now());

insert into public.jobs (id, farmer_id, laborer_id, title, description, location, required_skill, daily_wage, planned_days, start_date, status, created_at, updated_at)
values
  ('job_wheat', 'user_farmer_ramesh', NULL, 'Wheat Harvesting - 4 acres', 'Manual and machine harvesting of wheat over 4 acres near Sinnar. Lunch provided.', 'Sinnar, Maharashtra', 'Harvesting', 550, 3, '2026-06-19', 'OPEN', now(), now()),
  ('job_sugarcane', 'user_farmer_ramesh', 'user_labor_suresh', 'Sugarcane Loading Labor', 'Loading harvested sugarcane onto trucks. Heavy work, daily wage paid same day.', 'Nashik, Maharashtra', 'Weeding', 480, 5, '2026-06-22', 'ASSIGNED', now(), now());

insert into public.applications (id, job_id, laborer_id, status, message, created_at)
values
  ('app_suresh_sugarcane', 'job_sugarcane', 'user_labor_suresh', 'ACCEPTED', 'I can start this week.', now()),
  ('app_priya_paddy', 'job_wheat', 'user_labor_priya', 'PENDING', 'Experienced in harvesting and field work.', now());

insert into public.engagements (id, farmer_id, worker_id, job_id, cost_per_laborer, working_days, duration, assigned_tasks, status, total_cost, created_at, updated_at)
values
  ('eng_sugarcane', 'user_farmer_ramesh', 'user_labor_suresh', 'job_sugarcane', 480, 3, '3 days', ARRAY['Loading harvested cane','Stacking bundles']::text[], 'ACTIVE', 1440, now(), now());

insert into public.rentals (id, equipment_id, renter_id, owner_id, status, start_date, end_date, days, total_cost, message, created_at, updated_at)
values
  ('rent_thresher', 'eq_thresher', 'user_farmer_anita', 'user_farmer_ramesh', 'ACCEPTED', '2026-06-17', '2026-06-17', 1, 1200, 'Need it for one day.', now(), now());

insert into public.listings (id, farmer_id, name, category, quantity_kg, price_per_kg, location, description, status, created_at, updated_at)
values
  ('list_wheat_01', 'user_farmer_ramesh', 'Fresh Wheat', 'Grain', 2000, 24.0, 'Sinnar, Maharashtra', 'Premium quality wheat, freshly harvested.', 'active', now(), now()),
  ('list_rice_01', 'user_farmer_anita', 'Organic Rice', 'Grain', 1200, 38.5, 'Ludhiana, Punjab', 'Organic paddy rice delivered dry.', 'active', now(), now());

insert into public.draft_listings (id, farmer_id, name, category, quantity_kg, price_per_kg, location, description, status, created_at, updated_at)
values
  ('draft_01', 'user_farmer_ramesh', 'Draft Mustard Seeds', 'Oilseed', 300, 55.0, 'Sinnar, Maharashtra', 'Awaiting confirmation on moisture content.', 'draft', now(), now());

insert into public.inquiries (id, buyer_id, farmer_id, listing_id, message, quantity_kg, status, commission_rate, expected_commission, created_at, updated_at)
values
  ('inq_01', 'user_buyer_vijay', 'user_farmer_ramesh', 'list_wheat_01', 'Interested in 500 kg, please confirm availability.', 500, 'pending', 0.03, 360, now(), now());

insert into public.advisories (id, farmer_id, input_type, input_reference, description, language, diagnosis, probability, recommendation, created_at, updated_at)
values
  ('adv_01', 'user_farmer_ramesh', 'text', NULL, 'Leaf spots and yellowing on wheat plants.', 'en-IN', 'Fungal infection', 0.72, 'Apply a copper-based fungicide and improve drainage.', now(), now());

insert into public.workdays (id, job_id, laborer_id, date, present, note, created_at)
values
  ('workday_01', 'job_sugarcane', 'user_labor_suresh', '2026-06-18', true, 'On schedule', now());

insert into public.notifications (id, user_id, type, title, message, read, link, created_at)
values
  ('note_job_application', 'user_farmer_ramesh', 'JOB_APPLICATION', 'New job application', 'Priya Verma applied for Wheat Harvesting - 4 acres.', false, 'labor-hiring', now()),
  ('note_rental_request', 'user_farmer_ramesh', 'RENTAL_REQUEST', 'New rental request', 'Anita Kaur requested to rent Thresher Machine.', false, 'my-rentals', now()),
  ('note_inquiry_received', 'user_farmer_ramesh', 'INQUIRY_RECEIVED', 'New buyer inquiry', 'Vijay Traders asked about Fresh Wheat.', false, 'marketplace-inquiries', now()),
  ('note_labor_assigned', 'user_labor_suresh', 'JOB_ASSIGNED', 'Application accepted', 'Ramesh Patil accepted your application for Sugarcane Loading Labor.', false, 'my-job', now());

insert into public.blacklist (id, email, phone, reason, created_at)
values
  ('blacklist_badactor', 'badactor@kissan.in', '+91 99999 99999', 'Previously reported for equipment misuse and defaulting on rental payment.', now());

insert into public.voice_sessions (id, user_id, session_id, transcript, language, translated_text, source, metadata, created_at)
values
  ('voice_demo', 'user_farmer_ramesh', 'session_intern4_demo', 'Need two laborers for wheat harvesting and tractor tilling near Sinnar.', 'en-IN', 'गेहूं की कटाई और ट्रैक्टर जुताई के लिए दो मजदूर चाहिए।', 'intern4-ai-transcriber', '{}'::jsonb, now());

-- ==========================================
-- 4. ENABLE SECURITY
-- ==========================================
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.rentals enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.workdays enable row level security;
alter table public.notifications enable row level security;
alter table public.blacklist enable row level security;
alter table public.voice_sessions enable row level security;
alter table public.engagements enable row level security;
alter table public.listings enable row level security;
alter table public.draft_listings enable row level security;
alter table public.inquiries enable row level security;
alter table public.advisories enable row level security;