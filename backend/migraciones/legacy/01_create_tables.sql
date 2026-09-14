-- ============================================
-- 01_create_tables.sql
-- Tablas principales de Movimap
-- ============================================

-- Tabla: profiles (extiende auth.users de Supabase)
-- RLS se habilita en el paso 04 (políticas)
create table if not exists public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text,
  display_name text not null,
  role        text not null default 'user' check (role in ('user', 'admin', 'institution')),
  organization_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tabla: incidents
-- RLS se habilita en el paso 04 (políticas)
create table if not exists public.incidents (
  id                uuid primary key default gen_random_uuid(),
  category          text not null check (category in (
                      'vereda_cortada', 'vereda_deteriorada', 'rampa_bloqueada',
                      'rampa_inexistente', 'obstaculo_fisico', 'ascensor_fuera_servicio',
                      'falta_iluminacion', 'otro'
                    )),
  description       text not null check (length(description) between 100 and 500),
  latitude          numeric not null,
  longitude         numeric not null,
  severity          int not null check (severity between 1 and 3),
  observed_at       date not null check (observed_at <= current_date),
  estimated_duration text not null check (estimated_duration in ('temporal', 'permanente')),
  status            text not null default 'nuevo' check (status in (
                      'nuevo', 'confirmado', 'en_revision', 'resuelto', 'rechazado', 'expirado'
                    )),
  image_url         text,
  confirmation_count int not null default 0,
  score             int not null default 0,
  created_by        uuid not null references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  resolved_at       timestamptz,
  resolved_by       uuid references public.profiles(id)
);

-- Tabla: incident_actions
-- RLS se habilita en el paso 04 (políticas)
create table if not exists public.incident_actions (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  action_type text not null check (action_type in ('confirmar', 'rechazar', 'marcar_resuelta')),
  created_at  timestamptz not null default now(),
  unique(incident_id, user_id)
);

-- Tabla: audit_log
-- RLS se habilita en el paso 04 (políticas)
create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  event_type  text not null,
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

-- Índices
create index idx_incidents_location on public.incidents (latitude, longitude);
create index idx_incidents_status on public.incidents (status);
create index idx_incidents_category on public.incidents (category);
create index idx_incidents_created_at on public.incidents (created_at);
create index idx_actions_incident on public.incident_actions (incident_id);
create index idx_audit_created_at on public.audit_log (created_at);
