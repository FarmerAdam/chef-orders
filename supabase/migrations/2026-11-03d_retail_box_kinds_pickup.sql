-- Two Retail Boxes, and customers who pick up (2026-11-03). Run once in the
-- Supabase SQL editor, after 2026-11-03c_retail_box.sql. Safe to re-run: it
-- won't undo changes made since in the app.
--
-- 1. The one Retail Box becomes two: 300g of Mixed Oyster or 300g of Lion's
--    Mane. draws_from names the stock each box comes out of.
-- 2. mn_chefs.is_pickup: no delivery charge and not on the driver's run.

alter table public.mn_price_list add column if not exists draws_from text;
alter table public.mn_chefs add column if not exists is_pickup boolean not null default false;

-- 1 ---------------------------------------------------------------------
insert into public.mn_price_list (species, unit_price_per_kg, unit_label, special_only, on_special, kg_per_unit, hubs_only, draws_from)
select b.species, 15, 'box', false, false, 0.3, true, b.draws_from
from (values
  ('Retail Box - Mixed Oyster', 'Mixed Oyster'),
  ('Retail Box - Lion''s Mane', 'Lion''s Mane')
) as b(species, draws_from)
where not exists (select 1 from public.mn_price_list p where p.species = b.species);

-- The single row from the last file, unless an order already uses it.
delete from public.mn_price_list p
where p.species = 'Retail Box'
  and not exists (select 1 from public.mn_order_items i where i.species = p.species)
  and not exists (select 1 from public.mn_standing_order_items i where i.species = p.species);

-- 2 ---------------------------------------------------------------------
-- Standing orders are placed by a database function, so the fee is settled
-- here for every order however it's made.
create or replace function public.mn_orders_pickup_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from mn_chefs where id = new.chef_id and is_pickup) then
    new.delivery_fee := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists mn_orders_pickup_fee on public.mn_orders;
create trigger mn_orders_pickup_fee
  before insert on public.mn_orders
  for each row execute function public.mn_orders_pickup_fee();

-- Same as 2026-11-03c_retail_box.sql, leaving out customers who pick up.
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
    select min(o.requested_date) into v_date
    from mn_orders o
    join mn_chefs c on c.id = o.chef_id
    where o.status <> 'cancelled'
      and not c.is_pickup
      and o.requested_date between v_today and v_today + 14;
  end if;

  return jsonb_build_object(
    'driver', (select name from mn_drivers where token = p_token),
    'today', v_today,
    'date', v_date,
    'dates', coalesce((
      select jsonb_agg(jsonb_build_object('date', d, 'stops', n) order by d)
      from (
        select o.requested_date as d, count(distinct o.chef_id) as n
        from mn_orders o
        join mn_chefs c on c.id = o.chef_id
        where o.status <> 'cancelled'
          and not c.is_pickup
          and o.requested_date between v_today and v_today + 14
        group by o.requested_date
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
        'route_leg', c.route_leg,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'species', i.species,
            'qty_kg', i.qty_kg,
            'note', i.note,
            'unit', coalesce((
              select p.unit_label from mn_price_list p
              where lower(trim(p.species)) = lower(trim(i.species))
              limit 1
            ), 'kg')
          ))
          from mn_order_items i where i.order_id = o.id
        ), '[]'::jsonb)
      ))
      from mn_orders o
      join mn_chefs c on c.id = o.chef_id
      where o.requested_date = v_date and o.status <> 'cancelled' and not c.is_pickup
    ), '[]'::jsonb)
  );
end;
$$;

-- Should list the two boxes. A plain "Retail Box" here means an order already
-- uses it, so it was kept: move that order to one of the two boxes.
select species, unit_price_per_kg as price, kg_per_unit, hubs_only, draws_from
from public.mn_price_list where species ilike 'retail box%' order by 1;
