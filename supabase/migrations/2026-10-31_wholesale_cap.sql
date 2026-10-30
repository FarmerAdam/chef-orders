-- Wholesale cap (2026-10-31). Run once in the Supabase SQL editor.
-- Safe to re-run: every statement is create-if-missing / replace.
--
-- 1. mn_weekly_forecast   - MAVIS writes her per-species kg projection for
--                           this week and next here every 5 min (same numbers
--                           as the Farm Panel), so Chef Orders, the panel and
--                           MAVIS all agree on what's coming.
-- 2. mn_order_settings    - staff-only settings; market_reserve_pct is the
--                           share of each week's projection kept back for
--                           markets (default 25).
-- 3. mn_week_commitments  - what's already ordered for a delivery week, all
--                           customers combined (totals only, no names), plus
--                           the forecast and reserve - one call for both the
--                           staff screens and, later, chefs' own board.
-- 4. Staff can add customers who have no login (phone/text orders).

-- 1 ---------------------------------------------------------------------
create table if not exists public.mn_weekly_forecast (
  week_start   date        not null,           -- Monday
  species      text        not null,
  total_kg     numeric     not null default 0, -- harvested + still projected
  harvested_kg numeric     not null default 0,
  projected_kg numeric     not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (week_start, species)
);
alter table public.mn_weekly_forecast enable row level security;
drop policy if exists "forecast readable by signed-in users" on public.mn_weekly_forecast;
create policy "forecast readable by signed-in users" on public.mn_weekly_forecast
  for select to authenticated using (true);
-- No insert/update policy: only MAVIS (service key, bypasses RLS) writes it.

-- 2 ---------------------------------------------------------------------
create table if not exists public.mn_order_settings (
  key   text primary key,
  value numeric not null
);
alter table public.mn_order_settings enable row level security;
drop policy if exists "order settings: staff read" on public.mn_order_settings;
create policy "order settings: staff read" on public.mn_order_settings
  for select to authenticated
  using (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()));
drop policy if exists "order settings: staff write" on public.mn_order_settings;
create policy "order settings: staff write" on public.mn_order_settings
  for all to authenticated
  using (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()))
  with check (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()));
insert into public.mn_order_settings (key, value) values ('market_reserve_pct', 25)
  on conflict (key) do nothing;

-- 3 ---------------------------------------------------------------------
-- Committed = every non-cancelled order delivering that Mon-Sun week, plus
-- active standing orders that haven't been turned into that week's order
-- yet (mn_place_standing_orders only creates them ~10 days ahead) and
-- aren't skipped that week. Bundles (Mixed Oyster, Farmers Selection) come
-- back under their own names; the app spreads them across species.
create or replace function public.mn_week_commitments(p_week_start date)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with wk as (
    select date_trunc('week', p_week_start)::date as s
  ),
  ordered as (
    select oi.species, oi.qty_kg
    from mn_order_items oi
    join mn_orders o on o.id = oi.order_id, wk
    where o.status <> 'cancelled'
      and o.requested_date >= wk.s and o.requested_date < wk.s + 7
  ),
  standing as (
    select soi.species, soi.qty_kg
    from mn_standing_orders so
    join mn_standing_order_items soi on soi.standing_order_id = so.id, wk
    where so.active
      and (so.skip_date is null or so.skip_date < wk.s or so.skip_date >= wk.s + 7)
      and not exists (
        select 1 from mn_orders o
        where o.chef_id = so.chef_id and o.order_source = 'standing'
          and o.requested_date >= wk.s and o.requested_date < wk.s + 7
      )
  )
  select jsonb_build_object(
    'week_start', (select s from wk),
    'reserve_pct', coalesce((select value from mn_order_settings where key = 'market_reserve_pct'), 25),
    'committed', coalesce((
      select jsonb_agg(jsonb_build_object('item', species, 'kg', kg) order by species)
      from (select species, sum(qty_kg) as kg from (select * from ordered union all select * from standing) x group by species) t
    ), '[]'::jsonb),
    'forecast', coalesce((
      select jsonb_agg(jsonb_build_object('species', f.species, 'total_kg', f.total_kg,
                                          'harvested_kg', f.harvested_kg, 'projected_kg', f.projected_kg,
                                          'updated_at', f.updated_at) order by f.species)
      from mn_weekly_forecast f, wk where f.week_start = wk.s
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.mn_week_commitments(date) from public, anon;
grant execute on function public.mn_week_commitments(date) to authenticated;

-- 4 ---------------------------------------------------------------------
drop policy if exists "staff can add customers" on public.mn_chefs;
create policy "staff can add customers" on public.mn_chefs
  for insert to authenticated
  with check (exists (select 1 from public.mn_staff_users s where s.user_id = auth.uid()));
