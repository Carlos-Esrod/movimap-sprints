-- ============================================================
-- migraciones/nuevo/00_esquema_actual.sql
-- ESQUEMA ACTUAL (normalizado) — versión canónica
-- ------------------------------------------------------------
-- Este archivo representa el estado final del modelo de datos
-- tras la normalización votos/denuncias (ver 09).
-- Úsalo para:
--   * documentar/referenciar el esquema vigente, o
--   * preparar un proyecto Supabase nuevo desde cero.
--
-- NO combinar con las migraciones de ../legacy (esquema previo).
-- El historial aplicado en producción fue: legacy/01..07 + nuevo/09.
-- ============================================================

-- ============================================
-- TABLAS
-- ============================================

-- profiles (extiende auth.users)
create table if not exists public.profiles (
  id                uuid references auth.users on delete cascade primary key,
  email             text,
  display_name      text not null,
  role              text not null default 'user' check (role in ('user', 'admin')),
  organization_name text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- incidents (sin score/confirmation_count denormalizados)
create table if not exists public.incidents (
  id                 uuid primary key default gen_random_uuid(),
  category           text not null check (category in (
                        'vereda_cortada', 'vereda_deteriorada', 'rampa_bloqueada',
                        'rampa_inexistente', 'obstaculo_fisico', 'ascensor_fuera_servicio',
                        'falta_iluminacion', 'otro'
                      )),
  description        text not null check (length(description) between 100 and 500),
  latitude           numeric not null,
  longitude          numeric not null,
  severity           int not null check (severity between 1 and 3),
  observed_at        date not null check (observed_at <= current_date),
  estimated_duration text not null check (estimated_duration in ('temporal', 'permanente')),
  status             text not null default 'nuevo' check (status in (
                        'nuevo', 'confirmado', 'en_revision', 'resuelto', 'rechazado', 'expirado'
                      )),
  image_url          text,
  resuelto_threshold int not null default 3 check (resuelto_threshold >= 1),
  created_by         uuid not null references public.profiles(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  resolved_at        timestamptz,
  resolved_by        uuid references public.profiles(id)
);

-- votos (up / down / resuelta), un voto por usuario e incidencia
create table if not exists public.incident_votes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  vote_type   text not null check (vote_type in ('up', 'down', 'resuelta')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, user_id)
);

-- denuncias / reportes (capa BI)
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

-- auditoría
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- ============================================
-- ÍNDICES
-- ============================================
create index if not exists idx_incidents_location on public.incidents (latitude, longitude);
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_incidents_category on public.incidents (category);
create index if not exists idx_incidents_created_at on public.incidents (created_at);
create index if not exists idx_votes_incident on public.incident_votes (incident_id);
create index if not exists idx_votes_user on public.incident_votes (user_id);
create index if not exists idx_reports_incident on public.incident_reports (incident_id);
create index if not exists idx_reports_status on public.incident_reports (status);
create index if not exists idx_audit_created_at on public.audit_log (created_at);

-- ============================================
-- TRIGGERS / FUNCIONES AUTOMÁTICAS
-- ============================================

-- crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', 'Usuario'), 'user');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- auditoría de cambios de estado de incidencia
create or replace function public.log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
    values (auth.uid(), 'incident_status_changed', 'incident', new.id,
            json_build_object('from_status', old.status, 'to_status', new.status));
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_incident_status_change on public.incidents;
create trigger on_incident_status_change
  after update on public.incidents
  for each row when (old.status is distinct from new.status)
  execute function public.log_status_change();

-- auditoría de votos
create or replace function public.log_vote_action()
returns trigger as $$
begin
  insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
  values (
    new.user_id,
    case new.vote_type
      when 'up'       then 'incident_upvoted'
      when 'down'     then 'incident_downvoted'
      when 'resuelta' then 'incident_voted_resolved'
    end,
    'incident',
    new.incident_id,
    json_build_object('vote_type', new.vote_type)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_vote_audit on public.incident_votes;
create trigger on_vote_audit
  after insert or update on public.incident_votes
  for each row execute function public.log_vote_action();

-- ============================================
-- RLS (habilitar en todas las tablas)
-- ============================================
alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_votes enable row level security;
alter table public.incident_reports enable row level security;
alter table public.audit_log enable row level security;

-- profiles
create policy "Anyone can view profiles" on public.profiles for select to public using (true);
create policy "Users can update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "Admin can update any profile" on public.profiles for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Trigger can insert profiles" on public.profiles for insert to service_role with check (true);

-- incidents
create policy "Anyone can view incidents" on public.incidents for select to public using (true);
create policy "Authenticated users can create incidents" on public.incidents for insert to authenticated
  with check (auth.uid() = created_by);
create policy "Creator can update own incident" on public.incidents for update to authenticated
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Admin can update any incident" on public.incidents for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin can delete incidents" on public.incidents for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- incident_votes
create policy "Anyone can view votes" on public.incident_votes for select to public using (true);
create policy "Users can create own votes" on public.incident_votes for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users can update own votes" on public.incident_votes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own votes" on public.incident_votes for delete to authenticated
  using (auth.uid() = user_id);

-- incident_reports
create policy "Users can create own reports" on public.incident_reports for insert to authenticated
  with check (auth.uid() = reported_by);
create policy "Users can update own reports" on public.incident_reports for update to authenticated
  using (auth.uid() = reported_by) with check (auth.uid() = reported_by);
create policy "Only admin can view reports" on public.incident_reports for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin can update reports" on public.incident_reports for update to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
create policy "Admin can delete reports" on public.incident_reports for delete to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- audit_log
create policy "System can insert audit log" on public.audit_log for insert to authenticated with check (true);
create policy "Only admin can view audit log" on public.audit_log for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ============================================
-- VISTAS (score/confirmaciones dinámicos) + BI
-- ============================================
create or replace view public.incidents_with_stats
with (security_invoker = true) as
select
  i.id, i.category, i.description, i.latitude, i.longitude, i.severity,
  i.observed_at, i.estimated_duration, i.status, i.image_url,
  i.created_by, i.created_at, i.updated_at, i.resolved_at, i.resolved_by,
  i.resuelto_threshold,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta,
  coalesce(v.votes_up, 0) - coalesce(v.votes_down, 0) as score,
  coalesce(v.votes_up, 0)        as confirmation_count
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
where votes_resuelta < resuelto_threshold
  and status not in ('rechazado', 'expirado');

create schema if not exists bi;

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

grant usage on schema bi to authenticated, service_role;
grant select on bi.incident_daily to authenticated, service_role;

-- ============================================
-- RPC: mapa de calor (excluye ocultas por umbral)
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
                  where v.incident_id = i.id and v.vote_type = 'resuelta'), 0) < i.resuelto_threshold;
  return result;
end;
$$ language plpgsql security definer;

-- ============================================
-- STORAGE (bucket fotos)
-- ============================================
insert into storage.buckets (id, name, public)
values ('incident-photos', 'incident-photos', true)
on conflict do nothing;

create policy "Anyone can view incident photos" on storage.objects for select
  to public using ( bucket_id = 'incident-photos' );
create policy "Authenticated users can upload incident photos" on storage.objects for insert
  to authenticated with check ( bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "Users can update own incident photos" on storage.objects for update
  to authenticated using ( bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text )
  with check ( bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "Users can delete own incident photos" on storage.objects for delete
  to authenticated using ( bucket_id = 'incident-photos' and (storage.foldername(name))[1] = auth.uid()::text );
create policy "Admin can delete any photo" on storage.objects for delete
  to authenticated using ( bucket_id = 'incident-photos'
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );
