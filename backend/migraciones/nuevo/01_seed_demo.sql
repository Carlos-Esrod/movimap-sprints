-- ============================================================
-- migraciones/nuevo/01_seed_demo.sql
-- Datos de ejemplo para el esquema normalizado
-- ------------------------------------------------------------
-- Requisitos previos:
--   1. Crear el usuario admin en Authentication → Users:
--      Email: admin@movimap.cl | Auto Confirm: SI
--   2. Darle rol admin:
--      update public.profiles set role = 'admin' where email = 'admin@movimap.cl';
--   3. (Opcional) Más usuarios de prueba en Authentication.
-- ============================================================

do $$
declare
  admin_id uuid;
  user_id  uuid;
begin
  select id into admin_id from public.profiles where email = 'admin@movimap.cl';
  if admin_id is null then
    raise exception 'ERROR: El usuario admin@movimap.cl no existe. Créalo primero (ver comentarios del archivo).';
  end if;

  -- 1) incidencias demo
  insert into public.incidents (category, description, latitude, longitude, severity, observed_at, estimated_duration, status, created_by, created_at)
  select category, description, latitude, longitude, severity, observed_at, estimated_duration, status, admin_id, now() from (values
    ('vereda_cortada', 'Vereda cortada a la altura de Apoquindo con Eléctra. No permite el paso de sillas de ruedas ni andadores. Se necesita reparación urgente para garantizar la accesibilidad peatonal en esta zona comercial de alta concurrencia.', -33.4180, -70.6007, 3, current_date - 2, 'permanente', 'nuevo'),
    ('rampa_bloqueada', 'Rampa bloqueada por contenedores de basura abandonados desde hace varios días. Esta situación impide el acceso accesible al edificio comercial ubicado en esta dirección de la comuna de Providencia.', -33.4293, -70.6213, 2, current_date - 5, 'temporal', 'nuevo'),
    ('obstaculo_fisico', 'Árbol caído bloqueando completamente la vereda en la intersección de Avenida Providencia con Manuel Montt. Representa un riesgo significativo para personas con movilidad reducida y visitantes.', -33.4267, -70.6159, 3, current_date - 1, 'temporal', 'nuevo'),
    ('ascensor_fuera_servicio', 'Ascensor del centro comercial de la comuna fuera de servicio desde hace aproximadamente 3 días según reporte de ciudadanos. Esto afecta gravemente la accesibilidad del nivel subterráneo.', -33.4285, -70.6196, 3, current_date - 3, 'permanente', 'confirmado'),
    ('falta_iluminacion', 'Sección sin iluminación adecuada en la vereda de San Martín con O''Higgins durante la noche. Este problema representa un riesgo de accidentes para todos los peatones y personas con discapacidad visual.', -33.4373, -70.6352, 2, current_date - 7, 'permanente', 'nuevo'),
    ('vereda_deteriorada', 'Vereda con grietas profundas y desniveles considerables en el tramo entre Eléctra y Nueva de Lyon. El estado del pavimento dificulta notablemente el desplazamiento de personas con andadores y sillas de ruedas.', -33.4267, -70.6159, 2, current_date - 4, 'permanente', 'confirmado'),
    ('rampa_inexistente', 'No existe rampa de accesibilidad en la intersección de Apoquindo con Manuel Montt. Solo hay escalones que impiden el acceso a personas con movilidad reducida que necesitan utilizar esta vía peatonal.', -33.4311, -70.6188, 3, current_date - 10, 'permanente', 'nuevo'),
    ('otro', 'Hueco grande y profundo en la acera a la altura del metro Manuel Montt. Representa un peligro considerable para peatones y personas con movilidad reducida que transitan por esta zona de alta circulación.', -33.4285, -70.6196, 2, current_date - 1, 'temporal', 'nuevo')
  ) as t(category, description, latitude, longitude, severity, observed_at, estimated_duration, status)
  where not exists (
    select 1
    from public.incidents i
    where i.created_by = admin_id
      and i.category = t.category
      and i.latitude = t.latitude
      and i.longitude = t.longitude
      and i.description = t.description
  );

  -- 2) votos demo (usuario admin sobre la vereda cortada)
  --    El constraint unique(incident_id, user_id) evita duplicados.
  insert into public.incident_votes (incident_id, user_id, vote_type, created_at)
  select i.id, admin_id, 'up', now()
  from public.incidents i
  where i.category = 'vereda_cortada'
    and not exists (select 1 from public.incident_votes v
                    where v.incident_id = i.id and v.user_id = admin_id);

  raise notice 'Datos de prueba insertados (8 incidencias + 1 voto).';
end $$;
