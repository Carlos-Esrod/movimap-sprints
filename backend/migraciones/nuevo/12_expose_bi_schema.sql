-- ============================================
-- 12_expose_bi_schema.sql
-- Expone el esquema `bi` a PostgREST.
-- ------------------------------------------------------------
-- PostgREST se conecta como rol `authenticator` (que ejecuta
-- SET ROLE al rol solicitante). Sin USAGE sobre `bi` para
-- `authenticator`, PostgREST no enruta /rest/v1/bi/* (PGRST125).
-- Se mantiene el producto comercial con lectura SOLO para
-- `service_role` (anon/authenticated no pueden leer la vista).
-- ============================================

grant usage on schema bi to authenticator;
grant usage on schema bi to service_role;

grant select on bi.incident_daily to service_role;

-- Seguridad: el producto de datos NO es legible por roles de producto
revoke select on bi.incident_daily from public, anon, authenticated;
