-- Retail Box (2026-11-03). Run once in the Supabase SQL editor, after
-- 2026-11-03b_run_legs.sql. Safe to re-run: it won't undo changes made since
-- in the Prices tab.
--
-- mn_price_list.unit_label says how an item is sold. Anything other than 'kg'
-- is counted, not weighed: its order lines keep the count in qty_kg and the
-- price each in unit_price_per_kg, and kg_per_unit says how much stock each
-- one uses. hubs_only items can only be ordered by customers with is_hub set.

alter table public.mn_price_list add column if not exists kg_per_unit numeric;
alter table public.mn_price_list add column if not exists hubs_only boolean not null default false;
alter table public.mn_chefs add column if not exists is_hub boolean not null default false;

insert into public.mn_price_list (species, unit_price_per_kg, unit_label, special_only, on_special, kg_per_unit, hubs_only)
select 'Retail Box', 15, 'box', false, false, 0.3, true
where not exists (select 1 from public.mn_price_list where species = 'Retail Box');

-- For a Retail Box row made before these columns existed.
update public.mn_price_list
set unit_label = 'box',
    unit_price_per_kg = coalesce(unit_price_per_kg, 15),
    hubs_only = case when kg_per_unit is null then true else hubs_only end,
    kg_per_unit = coalesce(kg_per_unit, 0.3)
where species = 'Retail Box';

-- Same as 2026-11-03b_run_legs.sql, plus each item's unit, because the
-- driver's page has no price list to look it up in.
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
      where o.requested_date = v_date and o.status <> 'cancelled'
    ), '[]'::jsonb)
  );
end;
$$;
