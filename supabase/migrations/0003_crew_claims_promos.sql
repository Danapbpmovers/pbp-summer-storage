-- Crew intake, claims workflow and promo admin. Run after 0001 and 0002.

-- ------------------------------------------------------------ delivery date (starts the claim window)
alter table public.orders add column if not exists delivered_at timestamptz;

create or replace function public.stamp_delivered() returns trigger
language plpgsql as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' and new.delivered_at is null then
    new.delivered_at := now();
  end if;
  return new;
end $$;

drop trigger if exists orders_stamp_delivered on public.orders;
create trigger orders_stamp_delivered before update on public.orders
  for each row execute function public.stamp_delivered();

-- ------------------------------------------------------------ intake exceptions logged by crew
alter table public.order_items add column if not exists exceptions text[] not null default '{}';
alter table public.order_items add column if not exists intake_note text;

-- ------------------------------------------------------------ claims workflow
alter table public.claims add column if not exists approved_cents int;
alter table public.claims add column if not exists resolution text;
alter table public.claims add column if not exists reviewed_by uuid references public.profiles;
alter table public.claims add column if not exists updated_at timestamptz not null default now();
alter table public.claims add column if not exists filed_by uuid references public.profiles;
create index if not exists claims_status_idx on public.claims (status, created_at);

-- Claims are created by the server after it checks access and the claim window,
-- so customers no longer insert directly.
drop policy if exists "file own claim" on public.claims;

-- ------------------------------------------------------------ promo usage visibility for staff
create index if not exists promo_codes_code_idx on public.promo_codes (upper(code));

-- ------------------------------------------------------------ claim photos bucket
insert into storage.buckets (id, name, public) values ('claim-photos', 'claim-photos', false)
on conflict (id) do nothing;

-- Path convention for both buckets: <order_id>/<...>. Customers may upload claim photos
-- for orders they can see; staff can see everything.
create policy "customers upload claim photos" on storage.objects for insert
  with check (bucket_id = 'claim-photos' and exists (
    select 1 from public.orders o where o.id::text = split_part(name, '/', 1) and public.can_view_customer(o.customer_id)));
create policy "view claim photos" on storage.objects for select
  using (bucket_id = 'claim-photos' and (public.is_staff() or exists (
    select 1 from public.orders o where o.id::text = split_part(name, '/', 1) and public.can_view_customer(o.customer_id))));
