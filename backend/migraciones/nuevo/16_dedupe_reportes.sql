-- ============================================================
-- 16_dedupe_reportes.sql
-- Deduplicación de reportes al crear (Fase 1).
-- ------------------------------------------------------------
-- 1) Añade contexto de lugar (place_name / address) a incidents.
-- 2) RPC find_nearby_incidents: devuelve incidencias activas
--    dentro de un radio (haversine, con bounding box index).
-- 3) Sincroniza la capa BI (bi.incident_daily + espejo público)
--    con las nuevas columnas (la capa BI crece junto a la feature).
--
-- Idempotente: usa create or replace / add column if not exists.
-- ============================================================

-- ============================================
-- 1) COLUMNAS DE CONTEXTO DE LUGAR
-- ============================================
alter table public.incidents
  add column if not exists place_name text,
  add column if not exists address   text;

-- ============================================
-- 2) RPC: INCIDENCIAS CERCANAS (HAVERSINE + BOUNDING BOX)
--    Excluye rechazado/expirado y ocultas por umbral.
--    Punto clave para la deduplicación (100 m por defecto).
--
--    Nota: se hace DROP previo porque `create or replace` no puede
--    cambiar el tipo de retorno (OUT params) de una función existente
--    (error 42P13). Idempotente: drop + create.
-- ============================================
drop function if exists public.find_nearby_incidents(numeric, numeric, numeric, text);

create or replace function public.find_nearby_incidents(
  p_lat      numeric,
  p_lng      numeric,
  p_radius_m numeric default 100,
  p_category text default null
)
returns table (
  id                uuid,
  category          text,
  description       text,
  latitude          numeric,
  longitude         numeric,
  severity          int,
  status            text,
  place_name        text,
  address           text,
  distance_m        integer,
  score             bigint,
  confirmation_count bigint,
  votes_up          bigint,
  votes_down        bigint,
  votes_resuelta    bigint
)
language plpgsql security definer
as $$
declare
  v_radius_deg numeric;
  v_min_lat numeric;
  v_max_lat numeric;
  v_min_lng numeric;
  v_max_lng numeric;
begin
  v_radius_deg := p_radius_m / 111320.0;
  v_min_lat := p_lat - v_radius_deg;
  v_max_lat := p_lat + v_radius_deg;
  v_min_lng := p_lng - (p_radius_m / (111320.0 * cos(radians(p_lat))));
  v_max_lng := p_lng + (p_radius_m / (111320.0 * cos(radians(p_lat))));

  return query
  select
    i.id,
    i.category,
    i.description,
    i.latitude,
    i.longitude,
    i.severity,
    i.status,
    i.place_name,
    i.address,
    round(
      6371000.0 * 2 * asin(sqrt(
        power(sin(radians(i.latitude - p_lat) / 2), 2) +
        cos(radians(p_lat)) * cos(radians(i.latitude)) *
        power(sin(radians((i.longitude - p_lng) / 2)), 2)
      ))
    )::int as distance_m,
    coalesce(v.votes_up, 0) - coalesce(v.votes_down, 0) as score,
    coalesce(v.votes_up, 0) as confirmation_count,
    coalesce(v.votes_up, 0) as votes_up,
    coalesce(v.votes_down, 0) as votes_down,
    coalesce(v.votes_resuelta, 0) as votes_resuelta
  from public.incidents i
  left join (
    select incident_id,
           count(*) filter (where vote_type = 'up')       as votes_up,
           count(*) filter (where vote_type = 'down')     as votes_down,
           count(*) filter (where vote_type = 'resuelta') as votes_resuelta
    from public.incident_votes
    group by incident_id
  ) v on v.incident_id = i.id
  where i.latitude between v_min_lat and v_max_lat
    and i.longitude between v_min_lng and v_max_lng
    and i.status not in ('rechazado', 'expirado')
    and coalesce(v.votes_resuelta, 0) < i.resuelto_threshold
    and (p_category is null or i.category = p_category)
    and 6371000.0 * 2 * asin(sqrt(
          power(sin(radians(i.latitude - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(i.latitude)) *
          power(sin(radians((i.longitude - p_lng) / 2)), 2)
        )) <= p_radius_m
  order by distance_m asc;
end;
$$;

grant execute on function public.find_nearby_incidents(numeric, numeric, numeric, text) to authenticated, anon;

-- ============================================
-- 3) VISTAS: sincronizar place_name / address
--    Drop previo porque create or replace no puede
--    cambiar el set de columnas de una vista existente.
-- ============================================
drop view if exists public.incidents_public;
drop view if exists public.incidents_with_stats;

create or replace view public.incidents_with_stats
with (security_invoker = true) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.status, i.image_url,
  i.place_name, i.address,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.resuelto_threshold,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
  coalesce(v.votes_up, 0) - coalesce(v.votes_down, 0) as score,
  coalesce(v.votes_up, 0)        as confirmation_count
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id;

create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where votes_resuelta < resuelto_threshold
  and status not in ('rechazado', 'expirado');

-- ============================================
-- 4) CAPA BI: crece con la feature (lugar del reporte)
-- ============================================
drop view if exists public.analytics_incident_daily;
drop view if exists bi.incident_daily;

create or replace view bi.incident_daily
with (security_invoker = false) as
select
  i.id                       as incident_id,
  i.category,
  i.severity,
  i.status,
  i.description,
  i.observed_at::date        as observed_date,
  i.created_at::date         as report_date,
  i.updated_at,
  i.resolved_at,
  i.resolved_by is not null  as has_resolved_by,
  i.latitude,
  i.longitude,
  i.place_name,
  i.address,
  i.resuelto_threshold,
  i.image_url,
  round(extract(epoch from (i.resolved_at - i.created_at)) / 86400.0, 2)
                             as resolution_days,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
  coalesce(v.votes_up, 0) - coalesce(v.votes_down, 0) as score,
  coalesce(r.reports_total, 0)   as reports_total,
  coalesce(r.reports_pending, 0) as reports_pending,
  coalesce(r.reports_resolved, 0) as reports_resolved,
  coalesce(r.reports_rejected, 0) as reports_rejected
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id
left join (
  select incident_id,
         count(*)                                          as reports_total,
         count(*) filter (where status = 'pendiente')      as reports_pending,
         count(*) filter (where status = 'resuelto')       as reports_resolved,
         count(*) filter (where status = 'rechazado')      as reports_rejected
  from public.incident_reports
  group by incident_id
) r on r.incident_id = i.id;

create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

-- Re-aplicar grants (los drop de vista los pierden)
grant usage on schema bi to authenticator, service_role, bi_reader;
grant select on bi.incident_daily to service_role, bi_reader;
revoke all on bi.incident_daily from public, anon, authenticated;
grant select on public.analytics_incident_daily to service_role;
revoke all on public.analytics_incident_daily from public, anon, authenticated;

-- ============================================
-- 5) VERIFICACIÓN (opcional, en SQL Editor)
-- ============================================
-- select count(*) from public.find_nearby_incidents(-33.4272, -70.6175, 100);
-- select id, category, place_name, address from public.incidents limit 5;
