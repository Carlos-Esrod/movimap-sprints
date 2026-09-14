-- ============================================
-- 13_analytics_view.sql
-- Vista de exportación BI accesible vía PostgREST.
-- ------------------------------------------------------------
-- PostgREST no expone esquemas personalizados salvo que estén en
-- "Exposed schemas" del dashboard; el esquema `bi` no se refleja.
-- Como `public` sí está expuesto, se crea una vista de análisis
-- en `public` que delega en `bi.incident_daily`.
-- Seguridad: lectura SOLO para `service_role`.
-- ============================================

create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

-- El producto comercial solo lo lee service_role
revoke all on public.analytics_incident_daily from public, anon, authenticated;
grant select on public.analytics_incident_daily to service_role;
