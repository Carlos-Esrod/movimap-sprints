-- ============================================
-- 11_drop_institution_role.sql
-- D6: Eliminar el rol `institution`.
-- ------------------------------------------------------------
-- - Los perfiles con role='institution' pasan a 'user'.
-- - Se fuerza el constraint role en ('user','admin').
-- - Se elimina la RPC obsoleta get_dashboard_stats.
-- ============================================

-- 1) Reasignar roles institucionales existentes (D6)
update public.profiles set role = 'user' where role = 'institution';

-- 2) Restringir los valores válidos del rol
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin'));

-- 3) Eliminar RPC / tablas obsoletas del dashboard institucional (D6)
drop function if exists public.get_dashboard_stats(date, date);
