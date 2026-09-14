-- ============================================
-- 14_bi_reader_role.sql
-- Rol de SOLO LECTURA para Business Intelligence
-- ------------------------------------------------------------
-- Usuario de base de datos dedicado para Power BI / clientes
-- Postgres. No puede escribir datos ni alterar el esquema.
-- NO usar el usuario `postgres` (superusuario) para BI.
--
-- IMPORTANTE: antes de ejecutar, reemplaza '__CAMBIAME__' por
-- una contraseña fuerte y anótala (es la que usarás en Power BI).
-- ============================================

-- 1) Crear el rol (LOGIN + sin privilegios de escritura/DDL)
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bi_reader') then
    create role bi_reader
      login
      nosuperuser nocreatedb nocreaterole nobypassrls
      password 'bimovimap2026';
  else
    alter role bi_reader
      login nosuperuser nocreatedb nocreaterole nobypassrls
      password 'bimovimap2026';
  end if;
end $$;

-- 2) Acceso de solo lectura a las vistas analíticas (producto de datos)
grant usage on schema bi to bi_reader;
grant select on bi.incident_daily to bi_reader;

grant usage on schema public to bi_reader;
grant select on public.analytics_incident_daily to bi_reader;

-- 3) Las vistas de BI se ejecutan como su dueño (security definer),
--    de modo que bi_reader NO necesita (ni puede) acceder a las
--    tablas base (incident_reports, profiles, incidents, etc.):
--    solo ve la vista agregada.
alter view bi.incident_daily set (security_invoker = false);

-- ------------------------------------------------------------------
-- Verificación rápida (opcional, en SQL Editor):
--   select * from bi.incident_daily;          -- como postgres funciona
-- El rol bi_reader NO puede hacer DML/DDL en ninguna tabla.
-- ------------------------------------------------------------------
