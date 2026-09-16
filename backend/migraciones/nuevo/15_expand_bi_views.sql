-- ============================================================
-- 15_expand_bi_views.sql
-- Ampliación del producto de datos (D8): capa BI más completa.
-- ------------------------------------------------------------
-- 1) Expande `bi.incident_daily` con más atributos de negocio.
-- 2) Crea `bi.incident_reports_daily` (denuncias anonimizadas).
-- 3) Recrea las vistas espejo `public.analytics_*` (export CSV).
-- 4) Otorga lectura a `service_role` y `bi_reader`.
--
-- No expone identidad del denunciante (sin PII).
-- ============================================================

-- ============================================
-- 0) ELIMINAR VISTAS EXISTENTES ANTES DE RECREAR
--    Create or replace no permite reordenar/renombrar columnas
--    (error 42P16) cuando la vista ya existe con otro set de columnas.
--    Los grants se vuelven a otorgar más abajo.
-- ============================================
drop view if exists public.analytics_incident_daily;
drop view if exists public.analytics_incident_reports_daily;
drop view if exists bi.incident_daily;
drop view if exists bi.incident_reports_daily;

-- ============================================
-- 1) VISTA AMPLIADA: bi.incident_daily
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

-- ============================================
-- 2) NUEVA VISTA: bi.incident_reports_daily
--    Denuncias anonimizadas (sin reported_by / sin PII)
-- ============================================
create or replace view bi.incident_reports_daily
with (security_invoker = false) as
select
  r.id                as report_id,
  r.incident_id,
  i.category,
  i.severity,
  i.status            as incident_status,
  i.latitude,
  i.longitude,
  r.status            as report_status,
  r.reason,
  r.created_at::date  as report_date,
  r.updated_at
from public.incident_reports r
left join public.incidents i on i.id = r.incident_id;

-- ============================================
-- 3) VISTAS ESPEJO EN `public` (export vía PostgREST)
-- ============================================
create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

create or replace view public.analytics_incident_reports_daily
with (security_invoker = true) as
select * from bi.incident_reports_daily;

-- ============================================
-- 4) GRANTS / SEGURIDAD
-- ============================================
-- Esquema bi: autenticador (PostgREST) + rol de lectura + integration
grant usage on schema bi to authenticator, service_role, bi_reader;

-- Producto de datos: SOLO lectura para service_role / bi_reader
grant select on bi.incident_daily           to service_role, bi_reader;
grant select on bi.incident_reports_daily   to service_role, bi_reader;

revoke all on bi.incident_daily           from public, anon, authenticated;
revoke all on bi.incident_reports_daily   from public, anon, authenticated;

-- Vistas espejo públicas: solo service_role (exportación programática)
grant select on public.analytics_incident_daily          to service_role;
grant select on public.analytics_incident_reports_daily  to service_role;

revoke all on public.analytics_incident_daily           from public, anon, authenticated;
revoke all on public.analytics_incident_reports_daily   from public, anon, authenticated;

-- ============================================
-- 5) VERIFICACIÓN (opcional, en SQL Editor)
-- ============================================
-- select count(*) from bi.incident_daily;
-- select count(*) from bi.incident_reports_daily;
-- select count(*) from public.analytics_incident_reports_daily;
