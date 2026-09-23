# Movimap — Diseño y decisiones de datos (votos, denuncias y BI)

> Documento vivo. Fuente de trabajo para la reestructuración del modelo de datos
> y el nuevo enfoque de negocio de Movimap.

---

## 1. Contexto y objetivo

Movimap es una plataforma de reportes de incidencias de accesibilidad urbana
(veredas, rampas, iluminación, etc.) en la comuna de Providencia.

### Problemas detectados en la operación actual

1. **Voto (up/down) roto al cambiar de opinión.** El `upsert` de PostgREST en
   `incident_actions` chocaba con las políticas RLS → error
   `new row violates row-level security policy for table "incident_actions"`.
2. **Score no se propagaba correctamente** al cambiar de voto porque:
   - el score era una columna denormalizada recalculada por trigger, y
   - el frontend solo hacía un ajuste local `±1` sin reflejar el valor real
     devuelto por el servidor.
3. **Denuncia ("reportar") sin efecto real.** El botón insertaba en una tabla
   `incident_reports` que **no existía** en el esquema → fallo silencioso.
4. **Acoplamiento semántico.** Votos (up/down) y denuncias convivían de forma
   confusa; el usuario pedía desacoplar "denunciar" de los votos.

### Cambio estratégico de negocio

- Se **descarta el rol `institution`**.
- Se abandona la idea de **construir dashboards desde cero en el frontend**.
- El modelo de negocio pasa a ser **vender información** a partir de los datos
  recopilados (geo-referenciados), consumidos por herramientas de BI externas
  (p. ej. **Power BI**) mediante exportación **CSV**.

---

## 2. Decisiones de diseño (resumen)

| # | Decisión |
|---|----------|
| D1 | Normalizar los votos en una tabla dedicada `incident_votes` con 3 opciones (`up`, `down`, `resuelta`). |
| D2 | El score se **calcula en el frontend** (`votes_up − votes_down`). El backend y la capa BI sólo entregan **conteos** (`votes_up / votes_down / votes_resuelta`). No hay columnas denormalizadas en `incidents`. |
| D3 | Los votos de "resuelta" ocultan la incidencia al usuario final al superar un **umbral configurable por incidencia**. |
| D4 | Las denuncias/reportes se guardan en una tabla `incident_reports` **dedicada** a BI. |
| D5 | Capa de datos para **Business Intelligence**, exportable a **CSV** para Power BI. |
| D6 | **Eliminar el rol `institution`** y la página/web de dashboard del frontend. |
| D7 | **No bypasear RLS** con `security definer` para operaciones de usuario; solo se permite el RLS correcto. |
| D8 | **Ampliar el producto de datos BI** (más atributos de negocio + vista de denuncias anonimizadas) y **canal de entrega solo-lectura `bi_reader`** vía session pooler, con documentación de onboarding y términos para el cliente. |
| D9 | **Deduplicar reportes al crear** (Fase 1): RPC `find_nearby_incidents` (haversine, 100 m) + `place_name`/`address` vía reverse-geocoding Nominatim. La capa BI incluye estas columnas para que crezca con la feature. |
| D10 | **Ocultamiento automático por votos negativos.** Umbral `downvote_threshold` configurable por incidencia (default **4**). Al superarlo, el reporte se oculta **inmediatamente** de la vista pública. **Sin "revivir" manual**: el ocultamiento es 100% automático y el reporte sigue en BI / vista de admin para análisis. Esto permite que nadie revise reportes uno a uno; la moderación manual queda reservada para **denuncias de peso** (p. ej. imágenes inapropiadas, validación NSFW). |
---

## 3. Decisión D1 — Tabla `incident_votes`

Sustituye a `incident_actions` como tabla de votos. Un usuario emite **un** voto
por incidencia (hasta 3 opciones), definido por el constraint `unique`.

```sql
create table public.incident_votes (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  vote_type   text not null check (vote_type in ('up', 'down', 'resuelta')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(incident_id, user_id)
);

create index idx_votes_incident on public.incident_votes (incident_id);
create index idx_votes_user on public.incident_votes (user_id);
```

### Semántica de los 3 votos

| `vote_type` | Significado | Efecto en score | Efecto en visibilidad |
|-------------|-------------|-----------------|-----------------------|
| `up`        | Confirmar que la incidencia existe | `+1` | — |
| `down`      | Rechazar / considerarla falsa | `-1` | Ocultarla automáticamente al superar `downvote_threshold` |
| `resuelta`  | Votar que la incidencia ya no debe mostrarse | `0` | Ocultarla al superar `resuelto_threshold` |

> Importante: `resuelta` **no** afecta el score up/down. Es un voto de tercera
> opción. "Ocultar" no borra el registro: solo deja de mostrarse al usuario final.

### Flujo de cambio de voto (sin `upsert`, sin `security definer`)

El cluster de votar se resuelve en el **cliente** con una consulta previa:

1. `getMyVote(incident_id)` → consulta `incident_votes` con `auth.uid()`.
2. Si **no existe** voto → `INSERT`.
3. Si existe y es distinto → `UPDATE` (cambio de opción).
4. Si es igual → no-op.

Las políticas RLS permiten ambas operaciones de forma natural (ver §6), por lo
que **no** se requiere `ON CONFLICT DO UPDATE` ni funciones `security definer`.

---

## 4. Decisión D2 — Score/confirmaciones calculados en el frontend

Se **eliminan** de `incidents` las columnas denormalizadas
`score` y `confirmation_count`. El backend y la capa BI sólo entregan
**conteos** (`votes_up / votes_down / votes_resuelta`); el **score** y las
**confirmaciones** se calculan en el **cliente**:

- `score = votes_up - votes_down` → helper `computeScore()` en `frontend/src/lib/utils.ts`
- `confirmaciones = votes_up` → helper `confirmationCount()`
- `votes_up / votes_down / votes_resuelta` como totales por incidencia.

### Vista `public.incidents_with_stats` (todos los datos, para admin)

```sql
create or replace view public.incidents_with_stats
with (security_invoker = true) as
select
  i.*,
  coalesce(v.votes_up, 0)        as votes_up,
  coalesce(v.votes_down, 0)      as votes_down,
  coalesce(v.votes_resuelta, 0)  as votes_resuelta
from public.incidents i
left join (
  select incident_id,
         count(*) filter (where vote_type = 'up')        as votes_up,
         count(*) filter (where vote_type = 'down')      as votes_down,
         count(*) filter (where vote_type = 'resuelta')  as votes_resuelta
  from public.incident_votes
  group by incident_id
) v on v.incident_id = i.id;
```

### Vista `public.incidents_public` (usuario final, filtra por umbral)

```sql
create or replace view public.incidents_public
with (security_invoker = true) as
select *
from public.incidents_with_stats
where votes_resuelta < coalesce(i.resuelto_threshold, 3)
  and status not in ('rechazado', 'expirado');
```

> Nota: en `incidents_public` debe referenciarse el umbral de cada incidencia.
> Ver §5 (D3). La vista final debe leer `i.resuelto_threshold` desde `incidents`.

---

## 5. Decisión D3 — Umbral de "resuelta" configurable

El número de votos `resuelta` que ocultan una incidencia al usuario final es
**configurable por incidencia** mediante una nueva columna en `incidents`:

```sql
alter table public.incidents
  add column if not exists resuelto_threshold int not null default 3
    check (resuelto_threshold >= 1);
```

- Valor por defecto: `3`.
- Se puede modificar por incidencia (admin / negocio).
- La vista `incidents_public` excluye incidencias con
  `votes_resuelta >= resuelto_threshold`.

---

## 5.bis Decisión D10 — Umbral de votos negativos (`downvote_threshold`)

El ocultamiento por **votos negativos** sigue el mismo patrón que `resuelta`,
con un umbral **configurable por incidencia**:

```sql
alter table public.incidents
  add column if not exists downvote_threshold int not null default 4
    check (downvote_threshold >= 1);
```

- Valor por defecto: **4** (definido en `backend/migraciones/nuevo/16_umbral_downvotes.sql`
  y en `frontend/src/lib/constants.ts` → `DEFAULT_DOWNVOTE_THRESHOLD`).
- La vista `incidents_public` oculta al instante cuando
  `votes_down >= downvote_threshold` **o** `votes_resuelta >= resuelto_threshold`
  (además del estado `rechazado`/`expirado`).
- **No existe "revivir" manual.** El flujo es 100% automático para que nadie
  revise reportes uno a uno. El reporte oculto **no se borra**: sigue completo
  en `incidents_with_stats` (admin) y en la capa BI con sus conteos.
- La moderación manual del admin queda reservada para **denuncias de peso**
  (tabla `incident_reports`): contenido inapropiado / imágenes NSFW (feature
  planificada aparte, ver §14).
- Cambiar los umbrales por reporte (si a futuro se necesita) se hace vía SQL
  o UI de admin; al superarse se vuelven a ocultar automáticamente.

---

## 6. RLS (Decisión D7) — sin `security definer` para acciones de usuario

### `incident_votes`

```sql
alter table public.incident_votes enable row level security;

-- cualquier persona puede ver los votos
create policy "Anyone can view votes"
on public.incident_votes for select to public using (true);

-- insertar un voto propio
create policy "Users can create own votes"
on public.incident_votes for insert to authenticated
with check (auth.uid() = user_id);

-- cambiar el voto propio
create policy "Users can update own votes"
on public.incident_votes for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- borrar el voto propio
create policy "Users can delete own votes"
on public.incident_votes for delete to authenticated
using (auth.uid() = user_id);
```

> La unicidad `unique(incident_id, user_id)` impide votos duplicados, por lo que
> **no** se necesita ningún `not exists` en la política de insert (esta fue la
> causa raíz del bug original de RLS).

### `incident_reports` (denuncias)

```sql
alter table public.incident_reports enable row level security;

create policy "Users can create own reports"
on public.incident_reports for insert to authenticated
with check (auth.uid() = reported_by);

create policy "Users can update own reports"
on public.incident_reports for update to authenticated
using (auth.uid() = reported_by)
with check (auth.uid() = reported_by);

create policy "Only admin can view reports"
on public.incident_reports for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin can update reports"
on public.incident_reports for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admin can delete reports"
on public.incident_reports for delete to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
```

`security_invoker = true` en las vistas hace que respeten el RLS de las tablas base.

---

## 7. Decisión D4 y D5 — Capa de Business Intelligence

### Tablas transaccionales (fuente de verdad)

- `incidents`
- `incident_votes` (votos up/down/resuelta)
- `incident_reports` (denuncias)
- `audit_log`
- `profiles`

### Capa BI dedicada

Se crea un **esquema `bi`** (o vistas `analytics_*`) con datos agregados/planos,
pensados para **lectura y exportación CSV**. Ejemplo de vista de análisis:

```sql
create schema if not exists bi;

create or replace view bi.incident_daily as
select
  i.id as incident_id,
  i.category,
  i.severity,
  i.status,
  i.created_at::date as report_date,
  i.latitude,
  i.longitude,
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
```

### Exportación a CSV (Power BI)

> Guía práctica de consumo (conector Postgres + CSV) en `docs/bi-powerbi-guia.md`.

- Toda tabla/vista es accesible vía **PostgREST** (Supabase Data API), que soporta
  `Accept: text/csv` → `curl -H "Accept: text/csv" .../rest/v1/bi/incident_daily`.
- Alternativas: export del **Supabase SQL Editor**, `pg_dump`, o import directo a
  Power BI vía conector Postgres/Supabase.

#### Opción A — vía PostgREST (API REST → CSV)

Supabase expone la Data API de PostgREST. Añadiendo la cabecera `Accept: text/csv`
se obtiene directamente CSV, ideal para `Power BI` (conector *Web / OData*) o
exportación programática.

```bash
# CSV con vista analítica (requiere token de sesión o service_role)
curl -H "Accept: text/csv" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$SUPABASE_URL/rest/v1/bi/incident_daily?select=*&order=report_date.desc"
```

- `?select=*` → todas las columnas.
- Puedes filtrar con el formato de PostgREST: `?status=eq.confirmado`,
  `?report_date=gte.2025-01-01`.
- Para datos del producto (sin restricciones de RLS), usar `service_role` y
  habilitar la vista para ese rol.

#### Opción B — Power BI vía conector Postgres

- Direct Query o Import con el conector **PostgreSQL/Supabase**.
- Conexión a la vista `bi.incident_daily` (o tabla) con credenciales de lectura
  del esquema `bi`.

#### Opción C — Export desde Supabase

- SQL Editor → `Download CSV` sobre la consulta de la vista.
- `pg_dump --data-only --table=bi.incident_daily`.

#### Consideraciones de seguridad para el producto de datos

- Las vistas `bi.*` no deben ser accesibles a usuarios `anon`.
- Habilitar select solo a `service_role` / un rol de integración dedicado
  (otorgado como en `09`): `grant select on bi.incident_daily to service_role`.
- Los datos exportados son el **producto comercial**; revisar qué columnas se
  exponen (ubicación GPS, denunciantes anonimizados, etc.).

### Acceso

- Las vistas `bi.*` se habilitan para **lectura** a un rol de integración/BI
  (o `authenticated`/`service_role` para la exportación controlada).
- Las exportaciones de datos de negocio son el **producto** a vender.

---

## 8. Decisión D6 — Eliminar rol `institution` y dashboard de frontend

- `UserRole` pasa de `'user' | 'admin' | 'institution'` a **`'user' | 'admin'`**.
- Backend: `profiles.role check (role in ('user', 'admin'))`.
- Frontend:
  - Eliminar `DashboardPage.tsx` y la ruta `/dashboard`.
  - Eliminar el enlace "Dashboard" de `NavBar.tsx`.
  - Eliminar las RPC `get_dashboard_stats` (y tipos/datos asociados del dashboard).
- Se mantiene `get_heatmap_data` (se usa en el mapa de la app pública). Opcional:
  excluir incidencias ocultas por umbral de `resuelta`.

---

## 9. Decisión D8 — Ampliación del producto de datos y entrega al cliente

### Objetivo
Vender la información recopilada a instituciones/municipalidades. Para ello, la
capa BI se amplía con atributos de negocio útiles para el análisis urbano y se
define un **canal de entrega comercial** de solo lectura, seguro y reutilizable
por cada cliente.

### Ampliación de la capa BI (`00_esquema_actual.sql`)
- **`bi.incident_daily`** se expande: añade `description`, `observed_date`,
  `updated_at`, `resolved_at`, `has_resolved_by` (sin identidad), `image_url`,
  **`resolution_days`**, y conteos de denuncias por estado
  (`reports_total / pending / resolved / rejected`).
- **Nuevo `bi.incident_reports_daily`**: una fila por denuncia, **anonimizada**
  (sin `reported_by`), con `reason`, estado y contexto de la incidencia.
- **Vistas espejo** `public.analytics_incident_daily` y
  `public.analytics_incident_reports_daily` para exportación vía PostgREST.
- **Grants**: `SELECT` solo a `service_role` y `bi_reader`; `usage` en `bi` a
  `authenticator`; revoke a `public`/`anon`/`authenticated`.

### Canal de entrega (solo lectura)
- **Canal principal**: conexión PostgreSQL de solo lectura con el rol
  `bi_reader` a través del **session pooler** de Supabase (puerto 5432),
  soportando *Import* y *DirectQuery*.
  - Conexiones Session pooler → usuario `bi_reader.<project_ref>` (formato
    `rol.project_ref`); región del proyecto: `us-west-2`.
  - El error "remote certificate is invalid" se resuelve confiando la **CA de
    Supabase** (Settings → Database → SSL Configuration → Download Certificate)
    en la máquina que corre la conexión (PC para Desktop, o el **gateway** para
    Power BI Service).
- **Canal alternativo**: exportación CSV/JSON vía PostgREST (conector Web) con
  una **clave de lectura dedicada** (no la `service_role`, para no filtrar el
  secreto maestro si se comparte el reporte).
- **Multi-cliente (MVP)**: un único rol `bi_reader` para todos los clientes. Para
  la venta formal, aprovisionar un **rol por cliente** (o un servicio de
  emisión de credenciales/snapshots).

### Entregables de documentación
- `docs/data-dictionary.md` — diccionario de columnas de las vistas BI.
- `docs/bi-client-onboarding.md` — guía de conexión Power BI + CA + gateway.
- `docs/terms-of-use.md` — plantilla de términos de uso/licencia del dato.

---

## 10. Cambios de frontend

| Archivo | Cambio |
|---------|--------|
| `lib/supabase.ts` | `voteOnIncident` → getMyVote + insert/update (3 opciones, sin RPC). `getMyVote`/`getUserActions` → `incident_votes`. `getIncidents` → `incidents_public`. Nueva `getAdminIncidents` → `incidents_with_stats`. `reportIncident` → insert/update sin RPC. |
| `components/IncidentDetailModal.tsx` | Botones Confirmar/Rechazar/Marcar resuelta → votos up/down/resuelta; resaltar voto activo; refrescar score desde la vista. |
| `pages/HomePage.tsx` | `handleVoteSuccess` aplica la incidencia actualizada. |
| `pages/ActivityPage.tsx` | Adaptar a `vote_type` (up/down/resuelta) en "Mis acciones". |
| `types/index.ts` | `VoteAction = 'up' | 'down' | 'resuelta'`; `UserRole` sin `institution`; nueva interfaz para votos/analytics. |
| `pages/AdminPage.tsx` | Consultar todas las incidencias (incluidas ocultas) y gestionar denuncias. |

---

## 11. Inventario de archivos SQL

Los scripts se organizan en `backend/migraciones/nuevo/`. Ver
`backend/migraciones/README.md`.

| Archivo | Estado | Acción |
|---------|--------|--------|
| `00_esquema_actual.sql` | Creado | Esquema canónico completo del estado actual (proyecto nuevo desde cero, idempotente). |
| `01_seed_demo.sql` | Creado | Seed del esquema nuevo (votos en `incident_votes`). |
| `14_bi_reader_role.sql` | Creado | Rol read-only `bi_reader` para Power BI. |

### Orden de aplicación (proyecto nuevo)

`00_esquema_actual.sql` → `14_bi_reader_role.sql` → `01_seed_demo.sql`.

> Los archivos restantes (anteriores migraciones del esquema legacy) se retiraron
> del repositorio junto con la carpeta `legacy/`; todo el estado final vive en
> `00` + `14` + `15` + `16`.

### Rollback

- Conservar `incident_reports` y `incident_votes` son aditivos (no destructivos
  respecto a `incidents`), salvo el `drop` de `score`/`confirmation_count`.
- Antes de dropear columnas, crear un backup.
- Si se necesita revertir, se puede recrear las columnas de `score` desde
  `incident_votes` con un `update ... from (select ...)`.

---

## 12. Edge cases y consideraciones

- **Un usuario, un voto:** cambiar de `up` a `down` es un `UPDATE`, no un `INSERT`.
- **Tres opciones no intercambiables:** votar `resuelta` no descuenta el score
  up/down.
- **Migración de datos:** datos legados de `incident_actions` deben mapearse.
- **Terminología:** "reportar" pasa a ser **"denunciar"** (acción de usuario).
  "Reporte" queda reservado para la incidencia creada.
- **Umbral por incidencia:** usarlo SIEMPRE en `incidents_public` (no un valor
  global) para que cada incidencia tenga su propio umbral.
- **RLS en vistas:** usar `security_invoker = true` para que respeten el RLS de
  las tablas base y no expongan columnas indebidas.
- **Seguridad de exportación:** las vistas `bi.*` deben exponer los datos del
  producto; revisar quién las lee.

---

## 13. Pendientes / siguientes pasos

- [x] Normalizar votos/denuncias (consolidado en `nuevo/00_esquema_actual.sql`; el script `09` se retiró del repo).
- [x] Implementar cambios de frontend (§9).
- [x] Eliminar `DashboardPage`, ruta `/dashboard` y `get_dashboard_stats`.
- [x] Eliminar rol `institution` (tipos, NavBar, seed).
- [x] Fix denuncia: `reportIncident` ya no pide el retorno de la fila con `.select()` (RLS solo-admin en `incident_reports`) → insert simple sin SELECT; se trata el duplicado (`23505`) como "ya denunciada".
- [x] Corregir realtime de `HomePage` para refrescar desde `incidents_public` (columnas desnormalizadas eliminadas en D2).
- [x] Capa BI (esquema `bi`, vistas, grants `authenticator`/`service_role` y `public.analytics_incident_daily`) — consolidado en `nuevo/00` y `nuevo/15` (los scripts `10`–`13` se retiraron del repo).
- [x] Crear `backend/migraciones/nuevo/14_bi_reader_role.sql` (rol read-only `bi_reader` para Power BI).
- [x] BI funcional vía PostgREST: `public.analytics_incident_daily` exportable a CSV (`Accept: text/csv`) con `service_role`; anon/authenticated bloqueados. Esquema `bi` no se exige exponer en el dashboard (PostgREST no lo refleja).
- [x] Exportar CSV con Power BI (conector Postgres con rol `bi_reader` a `bi.incident_daily`, o `curl -H "Accept: text/csv"` con `service_role`).
- [x] **D8** — Ampliar la capa BI en `backend/migraciones/nuevo/00_esquema_actual.sql` (`bi.incident_daily` + `bi.incident_reports_daily` anonimizada).
- [x] **D8** — Documentos de producto: `docs/data-dictionary.md`, `docs/bi-client-onboarding.md` (con resolución del certificado CA) y `docs/terms-of-use.md`.
- [x] **D8** — Actualizar `docs/bi-powerbi-guia.md` con las vistas ampliadas y el fix de certificado.
- [ ] Verificar en Supabase `16_umbral_downvotes.sql` y que `bi.incident_daily` / `bi.incident_reports_daily` queden correctas.
- [x] **D10** — Implementar umbral de votos negativos (`downvote_threshold`, default 4) y ocultamiento automático en `backend/migraciones/nuevo/16_umbral_downvotes.sql` (vistas, BI, RPCs). Ocultamiento 100% automático, **sin revive**.
- [x] Mover el cálculo de `score`/`confirmation_count` al frontend (`computeScore` / `confirmationCount`); el backend y BI entregan solo conteos.
- [ ] Emitir credenciales por cliente (rol `bi_reader` o claves de lectura dedicadas) para la venta formal.
- [ ] Pruebas end-to-end: votar, cambiar voto, denunciar y ocultamiento automático por umbral de downvotes y de resuelta.
- [ ] (Siguiente paso, fuera de este hito) Revisión **NSFW** de imágenes antes del upload (frontend con `nsfwjs` o backend con edge function) y flujo de moderación denuncias de contenido inapropiado.

---

## 14. Feature planificada — revisión NSFW (fuera de este hito)

Para que el rol admin se limite a **denuncias de peso** (contenido inapropiado)
y no a encuestas de votos, se planifica una **revisión NSFW automática** de las
imágenes al momento de subirlas:

- **Frontend:** validación con `nsfwjs`/`tensorflow` en `ReportPage.tsx` antes
  de subir a storage; bloqueo del upload si la imagen es `Porn`/`Hentai`/`Nsfw`.
- **Backend (alternativa/refuerzo):** revisión server-side (edge function) que
  rechaza o etiqueta la imagen antes de guardarla en el bucket `incident-photos`.
- Las imágenes rechazadas quedan registradas en la capa BI como métrica de
  contenido inapropiado, junto al conteo de denuncias.

> No se implementa en este hito; queda documentado como siguiente paso.
