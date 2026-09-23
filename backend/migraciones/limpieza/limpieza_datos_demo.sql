-- ============================================================
-- migraciones/limpieza/limpieza_datos_demo.sql
-- Limpieza de datos de prueba / demo (reportes antiguos de otras
-- versiones) para dejar la base lista para datos reales.
-- ------------------------------------------------------------
-- ⚠️  DESTRUCTIVO: borra TODOS los datos de la capa transaccional
--     (reportes, votos, denuncias, auditoría) y las imágenes del
--     bucket de evidencia. NO toca el esquema, las políticas RLS
--     ni los perfiles/usuarios.
--
-- Qué borra:
--   * public.incidents          → reportes (cascade a votos/denuncias)
--   * public.incident_votes     → votos up/down/resuelta
--   * public.incident_reports   → denuncias
--   * public.audit_log          → auditoría
--   * storage.objects           → archivos del bucket incident-photos
--   * Vista/recreación de las vistas BI (se actualizan automáticamente
--     al eliminar las incidencias; se refuerza con un recreate).
--
-- Qué conserva:
--   * public.profiles y usuarios de auth (identidad/roles)
--   * Las vistas del esquema `bi` y `public.analytics_*` (quedan vacías)
--   * La columna `downvote_threshold` y sus defaults (para datos nuevos)
--
-- Idempotente: no falla si ya hay datos limpios.
-- ============================================================

BEGIN;

-- Auditoría primero (sin dependencias de FK).
delete from public.audit_log;

-- Denuncias y votos (tienen FK a incidents; da igual el orden al ser
-- on delete cascade, pero las borramos explícitamente por claridad).
delete from public.incident_reports;
delete from public.incident_votes;

-- Reportes (los votos/denuncias ya no dependen de ellos).
delete from public.incidents;

-- Imágenes de evidencia del bucket de fotos.
-- Supabase bloquea el borrado directo de `storage.objects` mediante el
-- trigger `protect_objects_delete`, y el rol del SQL Editor a veces no es
-- dueño de esa tabla para deshabilitar triggers. Por eso esta parte es
-- "best-effort": si no hay permisos, la salta con un aviso (NO aborta la
-- limpieza del resto). Si queda fuera, limpia las fotos manualmente desde
-- Storage / Storage API.
do $$
begin
  -- intento 1: deshabilitar triggers y borrar
  begin
    execute (select
      string_agg('alter table storage.objects disable trigger ' || quote_ident(t.tgname), '; ')
      from pg_trigger t
      where t.tgrelid = 'storage.objects'::regclass and not t.tgisinternal);

    delete from storage.objects where bucket_id = 'incident-photos';

    execute (select
      string_agg('alter table storage.objects enable trigger ' || quote_ident(t.tgname), '; ')
      from pg_trigger t
      where t.tgrelid = 'storage.objects'::regclass and not t.tgisinternal);
  exception
    -- intento 2 (sin permisos para alterar triggers): borrado directo
    when others then
      begin
        delete from storage.objects where bucket_id = 'incident-photos';
      exception
        when others then
          raise notice 'AVISO: no se pudieron borrar las fotos automáticamente (%). Limpia bucket "incident-photos" desde Storage / Storage API.', sqlerrm;
      end;
  end;
end $$;

COMMIT;

-- ============================================
-- Refuerzo de la capa BI: las vistas se derivan de `incidents`,
-- por lo que al quedarse vacías ya no exponen filas. Para asegurar
-- consistencia con el esquema actual (sin `score`, con umbrales),
-- se regeneran con la misma definición que el script 16.
-- ============================================
drop view if exists public.incidents_public;
drop view if exists public.incidents_with_stats;
drop view if exists public.analytics_incident_daily;
drop view if exists bi.incident_daily;

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

create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where votes_down    < downvote_threshold
  and votes_resuelta < resuelto_threshold
  and status not in ('rechazado', 'expirado');

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

create or replace view public.analytics_incident_daily
with (security_invoker = true) as
select * from bi.incident_daily;

-- Re-aplicar grants (se pierden con el drop de las vistas).
grant usage on schema bi to authenticator, service_role;
grant select on bi.incident_daily to service_role;
grant select on public.analytics_incident_daily to service_role;
revoke all on bi.incident_daily from public, anon, authenticated;
revoke all on public.analytics_incident_daily from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'bi_reader') then
    grant usage on schema bi to bi_reader;
    grant select on bi.incident_daily to bi_reader;
  end if;
end $$;

-- ============================================
-- Verificación
-- ============================================
select 'incidents'             as tabla, count(*) as filas from public.incidents
union all select 'incident_votes', count(*) from public.incident_votes
union all select 'incident_reports', count(*) from public.incident_reports
union all select 'audit_log', count(*) from public.audit_log
union all select 'fotos storage', count(*) from storage.objects where bucket_id = 'incident-photos';
