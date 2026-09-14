-- ============================================
-- 02_create_triggers_and_functions.sql
-- Triggers y funciones automáticas
-- ============================================

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', 'Usuario'),
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: recalcular score tras votación
create or replace function public.recalculate_incident_score()
returns trigger as $$
begin
  update public.incidents
  set
    score = (
      (select count(*) from public.incident_actions where incident_id = new.incident_id and action_type = 'confirmar') -
      (select count(*) from public.incident_actions where incident_id = new.incident_id and action_type = 'rechazar')
    ),
    updated_at = now()
  where id = new.incident_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_incident_action_insert on public.incident_actions;
create trigger on_incident_action_insert
  after insert on public.incident_actions
  for each row execute function public.recalculate_incident_score();

-- Trigger: auditoría de acciones
create or replace function public.log_incident_action()
returns trigger as $$
begin
  insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
  values (
    new.user_id,
    case new.action_type
      when 'confirmar' then 'incident_confirmed'
      when 'rechazar' then 'incident_downvoted'
      when 'marcar_resuelta' then 'incident_marked_resolved'
    end,
    'incident',
    new.incident_id,
    json_build_object('action_type', new.action_type)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_incident_action_audit on public.incident_actions;
create trigger on_incident_action_audit
  after insert on public.incident_actions
  for each row execute function public.log_incident_action();

-- Trigger: auditoría de cambios de estado
create or replace function public.log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.audit_log (user_id, event_type, entity_type, entity_id, metadata)
    values (
      auth.uid(),
      'incident_status_changed',
      'incident',
      new.id,
      json_build_object('from_status', old.status, 'to_status', new.status)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_incident_status_change on public.incidents;
create trigger on_incident_status_change
  after update on public.incidents
  for each row when (old.status is distinct from new.status)
  execute function public.log_status_change();
