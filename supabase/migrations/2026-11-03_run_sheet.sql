-- Run sheet (2026-11-03). Run once in the Supabase SQL editor.
-- Safe to re-run: every statement is create-if-missing / replace.
--
-- 1. mn_chefs gets a delivery address and a position on the route.
-- 2. mn_orders records when each delivery was ticked off, and by whom.
-- 3. mn_drivers: one row per driver, each with their own private link.
-- 4. mn_run_sheet / mn_run_set_delivered: the only things a driver's link
--    can do. Drivers have no login, so these are security definer and take
--    the link's token instead. No prices come back, nothing older than today
--    can be read, and only orders due by today can be ticked off.

-- 1 ---------------------------------------------------------------------
alter table public.mn_chefs add column if not exists address text;
alter table public.mn_chefs add column if not exists route_order integer;

-- 2 ---------------------------------------------------------------------
alter table public.mn_orders add column if not exists delivered_at timestamptz;
alter table public.mn_orders add column if not exists delivered_by text;

-- 3 ---------------------------------------------------------------------
create table if not exists public.mn_drivers (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  token      uuid        not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
alter table public.mn_drivers enable row level security;
drop policy if exists "drivers: staff only" on public.mn_drivers;
create policy "drivers: staff only" on public.mn_drivers
  for all to authenticated
  using (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()))
  with check (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()));

-- 4 ---------------------------------------------------------------------
-- Returns null when the link isn't valid (driver removed). p_date null, or
-- outside today..+14 days, means the next day with deliveries on it.
create or replace function public.mn_run_sheet(p_token uuid, p_date date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Australia/Melbourne')::date;
  v_date  date := p_date;
begin
  if not exists (select 1 from mn_drivers where token = p_token) then
    return null;
  end if;

  if v_date is null or v_date < v_today or v_date > v_today + 14 then
    select min(requested_date) into v_date
    from mn_orders
    where status <> 'cancelled'
      and requested_date between v_today and v_today + 14;
  end if;

  return jsonb_build_object(
    'driver', (select name from mn_drivers where token = p_token),
    'today', v_today,
    'date', v_date,
    'dates', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'stops', n) order by d)
      from (
        select requested_date as d, count(distinct chef_id) as n
        from mn_orders
        where status <> 'cancelled'
          and requested_date between v_today and v_today + 14
        group by requested_date
      ) t
    ), '[]'::jsonb),
    'orders', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'chef_id', o.chef_id,
        'status', o.status,
        'notes', o.notes,
        'delivered_at', o.delivered_at,
        'delivered_by', o.delivered_by,
        'business_name', c.business_name,
        'contact_name', c.contact_name,
        'phone', c.phone,
        'address', c.address,
        'delivery_notes', c.delivery_notes,
        'delivery_zone', c.delivery_zone,
        'route_order', c.route_order,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object('species', i.species, 'qty_kg', i.qty_kg, 'note', i.note))
          from mn_order_items i where i.order_id = o.id
        ), '[]'::jsonb)
      ))
      from mn_orders o
      join mn_chefs c on c.id = o.chef_id
      where o.requested_date = v_date and o.status <> 'cancelled'
    ), '[]'::jsonb)
  );
end;
$$;

-- Ticks a stop off, or takes the tick back (a mis-tap on the road). Returns
-- how many orders changed. Future orders can't be ticked off, and cancelled
-- ones are never touched.
create or replace function public.mn_run_set_delivered(p_token uuid, p_order_ids uuid[], p_delivered boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Australia/Melbourne')::date;
  v_driver text;
  v_count  integer;
begin
  select name into v_driver from mn_drivers where token = p_token;
  if v_driver is null then
    raise exception 'This link is no longer active';
  end if;

  if p_delivered then
    update mn_orders
    set status = 'fulfilled', delivered_at = now(), delivered_by = v_driver, updated_at = now()
    where id = any(p_order_ids)
      and requested_date between v_today - 7 and v_today
      and status in ('pending', 'confirmed');
  else
    update mn_orders
    set status = 'confirmed', delivered_at = null, delivered_by = null, updated_at = now()
    where id = any(p_order_ids)
      and requested_date between v_today - 7 and v_today
      and status = 'fulfilled';
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Drivers have no login, so the anon role needs these two (and nothing else).
revoke all on function public.mn_run_sheet(uuid, date) from public;
revoke all on function public.mn_run_set_delivered(uuid, uuid[], boolean) from public;
grant execute on function public.mn_run_sheet(uuid, date) to anon, authenticated;
grant execute on function public.mn_run_set_delivered(uuid, uuid[], boolean) to anon, authenticated;
