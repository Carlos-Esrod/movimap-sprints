-- ============================================================
-- migraciones/nuevo/16_umbral_downvotes.sql
-- Umbral automático de votos negativos (downvotes)
-- ------------------------------------------------------------
-- Agrega el ocultamiento automático por votos negativos:
--   * columna `downvote_threshold` configurable por incidencia
--     (default 4, igual criterio que `resuelto_threshold`),
--   * el reporte se oculta INMEDIATAMENTE al superar el umbral,
--   * NO existe "revivir" manual: es 100% automático para que
--     nadie revise reportes uno a uno. El reporte oculto sigue
--     existiendo y queda visible en BI y en la vista de admin.
--
-- Además centraliza el valor por defecto del umbral para que sea
-- fácil de cambiar en el futuro:
--   * En SQL: el `default 4` de la columna en la sentencia `alter table`.
--   * En frontend: `DEFAULT_DOWNVOTE_THRESHOLD` en `src/lib/constants.ts`.
--
-- Decisión: `score` y `confirmation_count` se calculan en el frontend;
-- este script los retira de las vistas. El backend sólo entrega conteos
-- (votes_up / votes_down / votes_resuelta).
--
-- IMPORTANTE: `create or replace view` NO permite eliminar columnas de una
-- vista existente, así que aquí se hace `drop view` (respetando el orden de
-- dependencias) antes de recrear, y se re-aplican los grants.
--
-- Idempotente: seguro de re-ejecutar.
-- ============================================================

-- ============================================
-- 1) COLUMNA `downvote_threshold`
-- ============================================
alter table public.incidents
  add column if not exists downvote_threshold int not null default 4
    check (downvote_threshold >= 1);

create schema if not exists bi;

-- ============================================
-- 2) DROP de vistas (orden de dependencias)
--    Necesario porque se eliminan columnas (`score`/`confirmation_count`).
-- ============================================
drop view if exists public.incidents_public;
drop view if exists public.incidents_with_stats;
drop view if exists public.analytics_incident_daily;
drop view if exists bi.incident_daily;

-- ============================================
-- 3) VISTA `public.incidents_with_stats`
--    Exposición: solo conteos (sin score/confirmation_count)
-- ============================================
create or replace view public.incidents_with_stats
with (security_invoker = true) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.status, i.image_url,
  i.place_name, i.address,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.resuelto_threshold, i.downvote_threshold,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id;

-- ============================================
-- 4) VISTA `public.incidents_public`
--    Ocultamiento automático por downvotes y resuelta
-- ============================================
create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where votes_down    < downvote_threshold
  and votes_resuelta < resuelto_threshold
  and status not in ('rechazado', 'expirado');

-- ============================================
-- 5) VISTA BI `bi.incident_daily`
--    Capa BI: solo conteos (sin score), con umbrales y denuncias
-- ============================================
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
  i.downvote_threshold,
  i.image_url,
  round(extract(epoch from (i.resolved_at - i.created_at)) / 86400.0, 2)
                             as resolution_days,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
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

-- Nota: `bi.incident_reports_daily` no cambia (denuncias anonimizadas).

-- ============================================
-- 6) VISTA espejo en `public` para exportación vía PostgREST
-- ============================================
create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

-- ============================================
-- 7) GRANTS (se perdieron con el `drop view`)
-- ============================================
grant usage on schema bi to authenticator, service_role;

grant select on bi.incident_daily to service_role;
grant select on public.analytics_incident_daily to service_role;

revoke all on bi.incident_daily from public, anon, authenticated;
revoke all on public.analytics_incident_daily from public, anon, authenticated;

-- Otorga acceso a `bi_reader` solo si el rol existe (se crea en 14).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'bi_reader') then
    grant usage on schema bi to bi_reader;
    grant select on bi.incident_daily to bi_reader;
  end if;
end $$;

-- ============================================
-- 8) RPC `find_nearby_incidents`
--    Filtra por downvote_threshold y devuelve solo conteos
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
  resuelto_threshold int,
  downvote_threshold int,
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
    i.resuelto_threshold,
    i.downvote_threshold,
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
    and coalesce(v.votes_down, 0) < i.downvote_threshold
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
-- 9) RPC `get_heatmap_data`
--    Excluye reportes ocultos por downvotes/resuelta
-- ============================================
create or replace function public.get_heatmap_data(
  p_start_date date default date_trunc('month', current_date)::date,
  p_end_date date default current_date
)
returns jsonb as $$
declare
  result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object('lat', latitude, 'lng', longitude,
                       'weight', case severity when 1 then 1 when 2 then 2 when 3 then 3 end)
  ) into result
  from public.incidents i
  where i.created_at >= p_start_date and i.created_at <= p_end_date
    and i.status not in ('rechazado', 'expirado')
    and coalesce((select count(*) from public.incident_votes v
                  where v.incident_id = i.id and v.vote_type = 'resuelta'), 0) < i.resuelto_threshold
    and coalesce((select count(*) from public.incident_votes v
                  where v.incident_id = i.id and v.vote_type = 'down'), 0) < i.downvote_threshold;
  return result;
end;
$$ language plpgsql security definer;
