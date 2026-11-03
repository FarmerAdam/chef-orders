-- Run legs (2026-11-03). Run once in the Supabase SQL editor, after
-- 2026-11-03_run_sheet.sql. Safe to re-run.
--
-- A delivery day can split into legs, each with its own stops and load list.
-- mn_chefs.route_leg says which leg a customer is on (null = Main Run). The
-- list of legs lives in the app (RUN_LEGS in index.html).

alter table public.mn_chefs add column if not exists route_leg text;

-- Same as 2026-11-03_run_sheet.sql, plus route_leg on each order.
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
