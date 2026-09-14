-- ============================================
-- 07_fix_votes_and_reports.sql
-- Correcciones: tabla de denuncias (reports) y
-- arreglo del cambio de voto en incident_actions
-- ============================================

-- ============================================
-- 1) TABLA incident_reports (denuncias)
-- ============================================
create table if not exists public.incident_reports (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  reported_by uuid not null references public.profiles(id),
  reason      text,
  status      text not null default 'pendiente' check (status in ('pendiente', 'resuelto', 'rechazado')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, reported_by)
);

create index if not exists idx_reports_incident on public.incident_reports (incident_id);
create index if not exists idx_reports_status on public.incident_reports (status);

alter table public.incident_reports enable row level security;

-- ============================================
-- 2) POLÍTICAS RLS PARA incident_reports
-- ============================================

-- Usuarios autenticados pueden crear denuncias (solo para sí mismos)
drop policy if exists "Authenticated users can create reports" on public.incident_reports;
create policy "Authenticated users can create reports"
on public.incident_reports for insert
to authenticated
with check (auth.uid() = reported_by);
-- Si el usuario ya denunció ese incidente, el upsert hace un UPDATE,
-- y la política de update propia permite cambiar la razón.

-- Usuarios pueden actualizar sus propias denuncias
drop policy if exists "Users can update own reports" on public.incident_reports;
create policy "Users can update own reports"
on public.incident_reports for update
to authenticated
using (auth.uid() = reported_by)
with check (auth.uid() = reported_by);

-- Solo el admin puede ver las denuncias
drop policy if exists "Only admin can view reports" on public.incident_reports;
create policy "Only admin can view reports"
on public.incident_reports for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Solo el admin puede resolver/rechazar denuncias
drop policy if exists "Admin can update reports" on public.incident_reports;
create policy "Admin can update reports"
on public.incident_reports for update
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Admin puede eliminar denuncias
drop policy if exists "Admin can delete reports" on public.incident_reports;
create policy "Admin can delete reports"
on public.incident_reports for delete
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================
-- 3) ARREGLO DEL CAMBIO DE VOTO EN incident_actions
-- ============================================
-- PROBLEMA: la política de INSERT original tenía un `NOT EXISTS`
-- que rechaza la fila cuando ya existe un voto del mismo usuario
-- para ese incidente. Como PostgREST hace `upsert` (INSERT ... ON
-- CONFLICT DO UPDATE), al cambiar de voto el branch de INSERT se
-- evalúa y su WITH CHECK falla => "new row violates RLS policy".
-- La unicidad (incident_id, user_id) ya está garantizada por el
-- constraint UNIQUE de la tabla, así que podemos quitar el NOT EXISTS
-- y dejar solo la comprobación de que el usuario actúa sobre sí mismo.

drop policy if exists "Authenticated users can create actions" on public.incident_actions;
create policy "Authenticated users can create actions"
on public.incident_actions for insert
to authenticated
with check (auth.uid() = user_id);

-- Los usuarios deben poder actualizar su propia acción (cambiar Confirmar <-> Rechazar)
drop policy if exists "Users can update own actions" on public.incident_actions;
create policy "Users can update own actions"
on public.incident_actions for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================
-- 4) RECÁLCULO DEL SCORE TAMBIÉN AL ACTUALIZAR
-- ============================================
drop trigger if exists on_incident_action_insert on public.incident_actions;
drop trigger if exists on_incident_action_upsert on public.incident_actions;
create trigger on_incident_action_upsert
  after insert or update on public.incident_actions
  for each row execute function public.recalculate_incident_score();
