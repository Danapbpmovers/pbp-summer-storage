-- PackStoreShip — schema. Multi-campus from day one.
-- Apply with `supabase db push`, or paste into the Supabase SQL editor, then run 0002_seed.sql.

create extension if not exists "pgcrypto";

-- ============================================================ campuses & catalog

create table public.campuses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text not null,
  timezone text not null default 'America/New_York',
  active boolean not null default true,
  bookable boolean not null default false,
  service_radius_miles numeric(4,1) not null default 1,
  in_room_pickup boolean not null default false,
  official_partner_copy text,
  official_partner_confirmed boolean not null default false,   -- copy only shows when true
  seo_title text,
  seo_description text,
  extended_storage_month_cents int,                             -- NEEDS_OWNER: unpublished rate, no default
  sort int not null default 0
);

create type public.location_type as enum ('store', 'move_out_station', 'move_in_station', 'warehouse', 'curbside_zone');

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  type public.location_type not null,
  name text not null,
  address text,
  active boolean not null default true,
  sort int not null default 0
);

create table public.station_hours (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  date date not null,
  hours text not null,
  unique (campus_id, date)
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  category text not null,
  name text not null,
  price_cents int not null check (price_cents >= 0),
  note text,
  dimensions text,
  image_url text,
  service_types text[] not null default '{storage}',
  active boolean not null default true,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table public.fee_rules (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  code text not null,
  name text not null,
  amount_cents int not null check (amount_cents >= 0),
  unit text not null default 'flat' check (unit in ('flat', 'per_item', 'per_lb')),
  note text,
  active boolean not null default true,
  sort int not null default 0,
  unique (campus_id, code)
);

create table public.insurance_plans (
  campus_id uuid primary key references public.campuses on delete cascade,
  included_cents int not null default 30000,
  addon_cents_per_100 int not null default 300,
  max_per_box_cents int,
  max_per_order_cents int,
  claim_window_days int not null default 3
);

create table public.calendar_windows (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  key text not null,
  label text not null,
  starts_on date not null,
  ends_on date,
  confirmed boolean not null default false,
  unique (campus_id, key)
);

-- Capacity-limited appointment slots (station drop-off windows, curbside routes, deliveries).
create type public.slot_kind as enum ('station_dropoff', 'curbside_pickup', 'delivery');

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses on delete cascade,
  location_id uuid references public.locations on delete cascade,
  kind public.slot_kind not null,
  date date not null,
  window_label text not null,
  capacity int not null check (capacity >= 0),
  booked int not null default 0 check (booked >= 0),
  constraint slot_not_overbooked check (booked <= capacity)
);
create index on public.slots (campus_id, kind, date);

create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  campus_id uuid references public.campuses on delete cascade,   -- null = all campuses
  percent_off int check (percent_off between 1 and 100),
  amount_off_cents int check (amount_off_cents > 0),
  expires_on date,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true,
  check ((percent_off is null) <> (amount_off_cents is null))
);

-- ============================================================ people

create type public.user_role as enum ('customer', 'crew', 'campus_manager', 'finance', 'admin');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  first_name text not null default '',
  last_name text not null default '',
  phone text not null default '',
  student_id text,
  class_year text,
  campus_id uuid references public.campuses,
  account_type text not null default 'student' check (account_type in ('student', 'parent')),
  referral_source text,
  sms_consent boolean not null default false,
  sms_consent_at timestamptz,
  marketing_consent boolean not null default false,
  terms_accepted_at timestamptz,
  stripe_customer_id text,
  default_payment_method text check (default_payment_method in ('ach', 'card')),
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}');
begin
  insert into public.profiles (id, email, first_name, last_name, phone, student_id, class_year, campus_id,
                               account_type, referral_source, sms_consent, sms_consent_at, marketing_consent, terms_accepted_at)
  values (
    new.id, new.email,
    coalesce(m->>'first_name', ''), coalesce(m->>'last_name', ''), coalesce(m->>'phone', ''),
    nullif(m->>'student_id', ''), nullif(m->>'class_year', ''),
    (select id from public.campuses where slug = m->>'campus_slug'),
    coalesce(nullif(m->>'account_type', ''), 'student'),
    nullif(m->>'referral_source', ''),
    coalesce((m->>'sms_consent')::boolean, false),
    case when (m->>'sms_consent')::boolean then now() end,
    coalesce((m->>'marketing_consent')::boolean, false),
    case when (m->>'terms_accepted')::boolean then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.staff_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and role <> 'customer';
$$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.staff_role() is not null;
$$;

create function public.is_manager() returns boolean
language sql stable security definer set search_path = public as $$
  select public.staff_role() in ('campus_manager', 'admin');
$$;

create function public.protect_profile() returns trigger
language plpgsql as $$
begin
  if not public.is_manager() and (new.role is distinct from old.role or new.stripe_customer_id is distinct from old.stripe_customer_id) then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;

create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

-- ============================================================ orders

create sequence public.order_number_seq start 270001;

create type public.order_status as enum
  ('reserved', 'pending_payment', 'confirmed', 'scheduled', 'received',
   'in_storage', 'delivery_requested', 'out_for_delivery', 'completed', 'cancelled');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number int not null unique default nextval('public.order_number_seq'),
  customer_id uuid not null references public.profiles on delete restrict,
  campus_id uuid not null references public.campuses,
  service text not null check (service in ('storage', 'ship_ahead')),
  season text not null,
  status public.order_status not null default 'reserved',
  booked_by text not null default 'student' check (booked_by in ('student', 'parent')),
  declared_value_cents int not null default 30000,
  dropoff_method text not null default 'undecided' check (dropoff_method in ('station', 'curbside', 'undecided')),
  return_method text not null default 'undecided' check (return_method in ('on_campus', 'off_campus', 'ship', 'extended', 'undecided')),
  return_hall text,
  return_address text,
  proxy_name text,
  proxy_phone text,
  notes text,
  promo_code text,
  quoted_cents int not null default 0,
  paid_cents int not null default 0,
  delivery_hold boolean not null default false,
  early_withdrawal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.orders (customer_id);
create index on public.orders (campus_id, status);

-- Parent/student collaborators on an order owner's account.
create table public.collaborators (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  email text not null,
  user_id uuid references public.profiles on delete cascade,
  can_pay boolean not null default true,
  can_schedule boolean not null default true,
  can_edit_items boolean not null default false,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (owner_id, email)
);

create function public.can_view_customer(customer uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select customer = auth.uid()
      or public.is_staff()
      or exists (
        select 1 from public.collaborators c
        where c.owner_id = customer
          and (c.user_id = auth.uid() or lower(c.email) = lower(auth.jwt()->>'email'))
      );
$$;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  catalog_item_id uuid references public.catalog_items on delete set null,
  name text not null,                 -- snapshot
  category text,
  unit_price_cents int not null,      -- snapshot
  label_code text not null unique,    -- printed as QR + text
  actual_name text,                   -- set by crew if it differs
  weight_lbs numeric(5,1),
  warehouse_bin text,
  photos text[] not null default '{}',
  status text not null default 'expected' check (status in ('expected', 'received', 'in_storage', 'out', 'delivered', 'missing')),
  received_at timestamptz,
  received_by uuid references public.profiles,
  created_at timestamptz not null default now()
);
create index on public.order_items (order_id);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  kind public.slot_kind not null,
  slot_id uuid references public.slots,
  location_id uuid references public.locations,
  date date,
  window_label text,
  address text,
  hall text,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'completed', 'missed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);
create index on public.appointments (order_id);
create index on public.appointments (date, kind);

-- Charges and payments. One row per charge (booking, overage, fee, delivery…).
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  customer_id uuid not null references public.profiles,
  description text not null,
  amount_cents int not null,
  fee_code text,
  payment_method text check (payment_method in ('ach', 'card')),
  card_fee_cents int not null default 0,          -- dual pricing: card fee added on top of amount_cents
  status text not null default 'open' check (status in ('open', 'processing', 'paid', 'failed', 'refunded', 'void')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  refunded_cents int not null default 0,
  created_by uuid references public.profiles,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index on public.charges (order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  carrier text,
  tracking text,
  actual_cost_cents int,
  billed_cost_cents int,
  created_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders on delete cascade,
  customer_id uuid not null references public.profiles,
  order_item_id uuid references public.order_items,
  description text not null,
  amount_claimed_cents int,
  photos text[] not null default '{}',
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'approved', 'denied', 'paid')),
  created_at timestamptz not null default now()
);

create table public.message_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles on delete cascade,
  order_id uuid references public.orders on delete cascade,
  channel text not null check (channel in ('email', 'sms')),
  template text not null,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'logged_only')),
  provider_id text,
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table public.reminder_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  campus_slug text,
  created_at timestamptz not null default now()
);

-- ============================================================ booking a slot atomically

-- Called by the server (service role) when an order books a capacity slot.
create function public.book_slot(p_slot uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.slots set booked = booked + 1
   where id = p_slot and booked < capacity
  returning true into ok;
  return coalesce(ok, false);
end $$;
revoke execute on function public.book_slot(uuid) from public, anon, authenticated;

-- ============================================================ row level security

do $$
declare t text;
begin
  foreach t in array array['campuses','locations','station_hours','catalog_items','fee_rules','insurance_plans','calendar_windows','slots',
                           'promo_codes','profiles','orders','collaborators','order_items','appointments','charges','shipments',
                           'claims','message_log','audit_events','reminder_signups']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- Public reference data: everyone reads; managers write.
do $$
declare t text;
begin
  foreach t in array array['campuses','locations','station_hours','catalog_items','fee_rules','insurance_plans','calendar_windows','slots']
  loop
    execute format('create policy "public read" on public.%I for select using (true)', t);
    execute format('create policy "manager write" on public.%I for all using (public.is_manager()) with check (public.is_manager())', t);
  end loop;
end $$;

-- Promo codes are validated server-side; only managers see the table.
create policy "manager promos" on public.promo_codes for all using (public.is_manager()) with check (public.is_manager());

create policy "read profile" on public.profiles for select using (public.can_view_customer(id));
create policy "update own profile" on public.profiles for update using (id = auth.uid() or public.is_manager());

create policy "read orders" on public.orders for select using (public.can_view_customer(customer_id));
create policy "staff orders" on public.orders for all using (public.is_staff()) with check (public.is_staff());

create policy "owner collaborators" on public.collaborators for all using (owner_id = auth.uid() or public.is_staff()) with check (owner_id = auth.uid() or public.is_staff());
create policy "invitee sees invite" on public.collaborators for select using (user_id = auth.uid() or lower(email) = lower(auth.jwt()->>'email'));

create policy "read items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.can_view_customer(o.customer_id)));
create policy "staff items" on public.order_items for all using (public.is_staff()) with check (public.is_staff());

create policy "read appts" on public.appointments for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.can_view_customer(o.customer_id)));
create policy "staff appts" on public.appointments for all using (public.is_staff()) with check (public.is_staff());

create policy "read charges" on public.charges for select using (public.can_view_customer(customer_id));
create policy "staff charges" on public.charges for all using (public.is_staff()) with check (public.is_staff());

create policy "read shipments" on public.shipments for select using (
  exists (select 1 from public.orders o where o.id = order_id and public.can_view_customer(o.customer_id)));
create policy "staff shipments" on public.shipments for all using (public.is_staff()) with check (public.is_staff());

create policy "read claims" on public.claims for select using (public.can_view_customer(customer_id));
create policy "file own claim" on public.claims for insert with check (customer_id = auth.uid());
create policy "staff claims" on public.claims for all using (public.is_staff()) with check (public.is_staff());

create policy "read messages" on public.message_log for select using (public.can_view_customer(customer_id));
create policy "staff audit" on public.audit_events for select using (public.is_manager());
-- reminder_signups: inserted by the server only (service role); managers read.
create policy "manager reminders" on public.reminder_signups for select using (public.is_manager());

-- ============================================================ storage buckets

insert into storage.buckets (id, name, public) values ('intake-photos', 'intake-photos', false)
on conflict (id) do nothing;

create policy "staff upload intake photos" on storage.objects for insert
  with check (bucket_id = 'intake-photos' and public.is_staff());
create policy "view intake photos" on storage.objects for select
  using (bucket_id = 'intake-photos' and (public.is_staff() or exists (
    select 1 from public.orders o where o.id::text = split_part(name, '/', 1) and public.can_view_customer(o.customer_id))));
