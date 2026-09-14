-- ============================================
-- FUNCIONES RPC PARA DASHBOARD
-- ============================================

-- Función: obtener estadísticas del dashboard
create or replace function public.get_dashboard_stats(
  p_start_date date default date_trunc('month', current_date)::date,
  p_end_date date default current_date
)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'total_incidents', (select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date),
    'active_incidents', (select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status in ('nuevo', 'confirmado', 'en_revision')),
    'resolved_incidents', (select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'resuelto'),
    'by_category', (
      select jsonb_build_object(
        'vereda_cortada', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'vereda_cortada'), 0),
        'vereda_deteriorada', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'vereda_deteriorada'), 0),
        'rampa_bloqueada', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'rampa_bloqueada'), 0),
        'rampa_inexistente', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'rampa_inexistente'), 0),
        'obstaculo_fisico', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'obstaculo_fisico'), 0),
        'ascensor_fuera_servicio', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'ascensor_fuera_servicio'), 0),
        'falta_iluminacion', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'falta_iluminacion'), 0),
        'otro', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and category = 'otro'), 0)
      )
    ),
    'by_severity', (
      select jsonb_build_object(
        '1', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and severity = 1), 0),
        '2', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and severity = 2), 0),
        '3', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and severity = 3), 0)
      )
    ),
    'by_status', (
      select jsonb_build_object(
        'nuevo', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'nuevo'), 0),
        'confirmado', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'confirmado'), 0),
        'en_revision', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'en_revision'), 0),
        'resuelto', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'resuelto'), 0),
        'rechazado', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'rechazado'), 0),
        'expirado', coalesce((select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and status = 'expirado'), 0)
      )
    ),
    'weekly_trend', (
      select jsonb_agg(row_to_json(t)) from (
        select
          date_trunc('week', created_at)::date as week,
          count(*) as count
        from public.incidents
        where created_at >= p_start_date and created_at <= p_end_date
        group by date_trunc('week', created_at)
        order by week
      ) t
    ),
    'photo_percentage', (
      select round(
        (select count(*) from public.incidents where created_at >= p_start_date and created_at <= p_end_date and image_url is not null)::numeric /
        nullif(count(*), 0) * 100, 2
      ) from public.incidents where created_at >= p_start_date and created_at <= p_end_date
    )
  ) into result;
  return result;
end;
$$ language plpgsql security definer;

-- Función: obtener datos para mapa de calor
create or replace function public.get_heatmap_data(
  p_start_date date default date_trunc('month', current_date)::date,
  p_end_date date default current_date
)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'lat', latitude,
      'lng', longitude,
      'weight', case severity when 1 then 1 when 2 then 2 when 3 then 3 end
    )
  ) into result
  from public.incidents
  where created_at >= p_start_date and created_at <= p_end_date
  and status not in ('rechazado', 'expirado');
  return result;
end;
$$ language plpgsql security definer;
