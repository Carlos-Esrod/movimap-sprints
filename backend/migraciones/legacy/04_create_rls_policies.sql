-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_actions enable row level security;
alter table public.audit_log enable row level security;

-- ========================
-- POLÍTICAS PARA profiles
-- ========================

-- Anyone can view profiles (public info only)
create policy "Anyone can view profiles"
on public.profiles for select
to public
using (true);

-- Users can update own profile
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admin can update any profile
create policy "Admin can update any profile"
on public.profiles for update
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Auto-insert via trigger (allowed)
create policy "Trigger can insert profiles"
on public.profiles for insert
to service_role
with check (true);

-- ========================
-- POLÍTICAS PARA incidents
-- ========================

-- Anyone can view incidents
create policy "Anyone can view incidents"
on public.incidents for select
to public
using (true);

-- Authenticated users can create incidents
create policy "Authenticated users can create incidents"
on public.incidents for insert
to authenticated
with check (auth.uid() = created_by);

-- Creator can update own incident
create policy "Creator can update own incident"
on public.incidents for update
to authenticated
using (auth.uid() = created_by)
with check (auth.uid() = created_by);

-- Admin can update any incident
create policy "Admin can update any incident"
on public.incidents for update
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Admin can delete incidents
create policy "Admin can delete incidents"
on public.incidents for delete
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ========================
-- POLÍTICAS PARA incident_actions
-- ========================

-- Anyone can view incident actions
create policy "Anyone can view incident actions"
on public.incident_actions for select
to public
using (true);

-- Authenticated users can create actions (one per incident)
create policy "Authenticated users can create actions"
on public.incident_actions for insert
to authenticated
with check (
  auth.uid() = user_id
  and not exists (
    select 1 from public.incident_actions
    where incident_id = incident_actions.incident_id and user_id = auth.uid()
  )
);

-- Admin can delete actions
create policy "Admin can delete actions"
on public.incident_actions for delete
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ========================
-- POLÍTICAS PARA audit_log
-- ========================

-- System can insert audit log
create policy "System can insert audit log"
on public.audit_log for insert
to authenticated
with check (true);

-- Only admin can view audit log
create policy "Only admin can view audit log"
on public.audit_log for select
to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
