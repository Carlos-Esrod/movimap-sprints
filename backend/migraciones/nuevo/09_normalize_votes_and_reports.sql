-- ============================================
-- 09_normalize_votes_and_reports.sql
-- Normalización: tabla de votos dedicada, umbral
-- de "resuelta" por incidencia, score dinámico
-- mediante vistas y capa de Business Intelligence.
-- ============================================

-- ============================================
-- 1) TABLA incident_votes (up / down / resuelta)
-- ============================================
create table if not exists public.incident_votes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  vote_type   text not null check (vote_type in ('up', 'down', 'resuelta')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, user_id)
);

create index if not exists idx_votes_incident on public.incident_votes (incident_id);
create index if not exists idx_votes_user on public.incident_votes (user_id);

alter table public.incident_votes enable row level security;

-- ============================================
-- 2) UMBRAL "resuelta" CONFIGURABLE POR INCIDENCIA
-- ============================================
alter table public.incidents
  add column if not exists resuelto_threshold int not null default 3
    check (resuelto_threshold >= 1);

-- ============================================
-- 3) MIGRAR incident_actions -> incident_votes
-- ============================================
insert into public.incident_votes (incident_id, user_id, vote_type, created_at, updated_at)
select
  incident_id,
  user_id,
  case action_type
    when 'confirmar' then 'up'
    when 'rechazar' then 'down'
    when 'marcar_resuelta' then 'resuelta'
  end,
  created_at,
  now()
from public.incident_actions
on conflict (incident_id, user_id) do nothing;

-- ============================================
-- 4) ELIMINAR COLUMNAS DENORMALIZADAS
-- ============================================
alter table public.incidents drop column if exists score;
alter table public.incidents drop column if exists confirmation_count;

-- ============================================
-- 5) VISTAS (score/confirmaciones dinámicos)
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

-- Vista para el usuario final: oculta por umbral y por estado
create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where votes_resuelta < resuelto_threshold
  and status not in ('rechazado', 'expirado');

-- ============================================
-- 6) AUDITORÍA DE VOTOS
-- ============================================
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
-- 7) ELIMINAR incident_actions (y sus triggers)
-- ============================================
drop trigger if exists on_incident_action_upsert on public.incident_actions;
drop trigger if exists on_incident_action_audit on public.incident_actions;
drop trigger if exists on_incident_action_insert on public.incident_actions;
drop table if exists public.incident_actions;

-- ============================================
-- 8) POLÍTICAS RLS PARA incident_votes
-- ============================================
drop policy if exists "Anyone can view votes" on public.incident_votes;
create policy "Anyone can view votes"
on public.incident_votes for select to public using (true);

drop policy if exists "Users can create own votes" on public.incident_votes;
create policy "Users can create own votes"
on public.incident_votes for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own votes" on public.incident_votes;
create policy "Users can update own votes"
on public.incident_votes for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own votes" on public.incident_votes;
create policy "Users can delete own votes"
on public.incident_votes for delete to authenticated
using (auth.uid() = user_id);

-- ============================================
-- 9) CAPA DE BUSINESS INTELLIGENCE (export CSV)
-- ============================================
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
-- 10) MAPA DE CALOR: excluir ocultas por umbral
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
    jsonb_build_object(
      'lat', latitude,
      'lng', longitude,
      'weight', case severity when 1 then 1 when 2 then 2 when 3 then 3 end
    )
  ) into result
  from public.incidents i
  where i.created_at >= p_start_date and i.created_at <= p_end_date
    and i.status not in ('rechazado', 'expirado')
    and coalesce((
      select count(*)
      from public.incident_votes v
      where v.incident_id = i.id and v.vote_type = 'resuelta'
    ), 0) < i.resuelto_threshold;
  return result;
end;
$$ language plpgsql security definer;
