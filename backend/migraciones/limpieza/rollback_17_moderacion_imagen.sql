-- ============================================================
-- ROLLBACK de la migración 17_moderacion_imagen.sql
-- ------------------------------------------------------------
-- Deshace el registro de eventos de moderación (imagen/texto)
-- que se aplicó previamente. EJECUTAR UNA SOLA VEZ.
--
-- 1) Revoca grants de la vista BI.
-- 2) Elimina la vista y la tabla.
-- ============================================================

revoke all on public.analytics_moderation_daily from service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'bi_reader') then
    revoke all on public.analytics_moderation_daily from bi_reader;
  end if;
end $$;

drop view if exists public.analytics_moderation_daily;
drop table if exists public.incident_moderation_log;
