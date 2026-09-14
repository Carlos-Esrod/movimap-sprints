-- ============================================
-- 10_bi_export.sql
-- Capa de Business Intelligence (D5): esquema
-- `bi` con vista agregada para exportación CSV.
-- ------------------------------------------------------------
-- Producto comercial de datos. Acceso SOLO para el rol de
-- integración `service_role` (no anon / no authenticated).
-- Exportación: curl -H "Accept: text/csv" -H "Authorization:
-- Bearer $SERVICE_ROLE" "$SUPABASE_URL/rest/v1/bi/incident_daily"
-- ============================================

create schema if not exists bi;

-- Vista analítica: un registro por incidencia con métricas agregadas
create or replace view bi.incident_daily
with (security_invoker = true) as
select
  i.id               as incident_id,
  i.category,
  i.severity,
  i.status,
  i.created_at::date as report_date,
  i.latitude,
  i.longitude,
  i.resuelto_threshold,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
  coalesce(v.votes_up, 0) - coalesce(v.votes_down, 0) as score,
  (select count(*) from public.incident_reports r
    where r.incident_id = i.id and r.status = 'pendiente') as reports_pending
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')       as votes_up,
         count(*) filter (where vote_type = 'down')     as votes_down,
         count(*) filter (where vote_type = 'resuelta') as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id;

-- ---- Acceso / seguridad -------------------------------
-- Solo `service_role` (integración / exportación BI).
-- Se revoca explícitamente a public, anon y authenticated
-- (por si alguna migración previa los concedió).
revoke usage on schema bi from public, anon, authenticated;
revoke all on bi.incident_daily from public, anon, authenticated;

grant usage on schema bi to service_role;
grant select on bi.incident_daily to service_role;

-- ============================================
-- Exportación a CSV (Power BI / integración)
-- ============================================
-- 1) Vía PostgREST:
--    curl -H "Accept: text/csv" \
--         -H "Authorization: Bearer $SERVICE_ROLE" \
--         "$SUPABASE_URL/rest/v1/bi/incident_daily?select=*&order=report_date.desc"
-- 2) Conector Postgres (Direct Query / Import) apuntando a `bi.incident_daily`.
-- 3) SQL Editor -> "Download CSV" sobre la vista.
