# Movimap — Estado del proyecto y funcionalidades completadas

> Documento vivo que resume **todo lo construido hasta el momento** en Movimap,
> separado por capa (backend / frontend). Sirve como inventario de entregables.

---

## 1. Resumen del proyecto

**Movimap** es una plataforma de **reportes de incidencias de accesibilidad urbana**
(veredas, rampas, iluminación, ascensores, etc.) en la **comuna de Providencia**.
Permite a los ciudadanos reportar, confirmar/rechazar y denunciar incidencias,
y a los administradores moderarlas. Como **producto de datos**, la información
geo-referenciada se exporta a herramientas de BI externas (p. ej. **Power BI**).

### Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS, Leaflet (`react-leaflet`), Supabase JS, `react-hook-form`/zod, `recharts`, `jspdf`/`html2canvas`, `lucide-react` |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime + PostgREST) |
| Datos | Esquema normalizado en PostgreSQL, capa BI (`bi` + `public.analytics_*`), rol de solo lectura `bi_reader` |

### Arquitectura y repositorio

```
movimap/
├── backend/migraciones/   # scripts SQL organizados por esquema
│   ├── legacy/            # esquema antiguo (ya aplicado, NO re-ejecutar)
│   └── nuevo/             # esquema actual normalizado (votos, denuncias, BI)
├── frontend/              # app React (Vite + Supabase)
├── docs/                  # documentación (datos, BI, estado)
└── README.md
```

### Historial de migraciones aplicado en producción (orden)

En producción se aplicó:
1. `legacy/01` … `legacy/07` (esquema previo + fix intermedio)
2. `nuevo/09_normalize_votes_and_reports.sql` (normalización votos/denuncias)
3. Capa BI: `nuevo/10_bi_export.sql`, `nuevo/12_expose_bi_schema.sql`,
   `nuevo/13_analytics_view.sql`, `nuevo/14_bi_reader_role.sql`
4. Ampliación BI (D8): `nuevo/15_expand_bi_views.sql`

> Para un proyecto nuevo desde cero se usa `nuevo/00_esquema_actual.sql`
> y luego `nuevo/01_seed_demo.sql`. No mezclar con `legacy/`.

---

## 2. Backend (Supabase)

### 2.1 Modelo de datos normalizado

- **`profiles`** — extensiones de `auth.users`. Campos: `display_name`, `role`
  (`'user' | 'admin'`), `organization_name`, timestamps.
- **`incidents`** — incidencias reportadas. Campos: categoría, descripción
  (100–500 chars), lat/lng, severidad (1–3), fecha de observación, duración
  estimada (`temporal | permanente`), estado, `image_url`, `resuelto_threshold`
  (umbral configurable por incidencia, por defecto 3), `created_by`,
  `resolved_at`, `resolved_by`. **Sin** columnas denormalizadas `score` /
  `confirmation_count`.
- **`incident_votes`** — votos de la comunidad (3 opciones: `up`, `down`,
  `resuelta`). Restricción `unique(incident_id, user_id)` → **un voto por
  usuario e incidencia**; cambiar de opción es un `UPDATE`, no un `INSERT`.
- **`incident_reports`** — denuncias de incidencias (desacopladas de los votos),
  con `status` (`pendiente | resuelto | rechazado`) y `unique(incident_id, reported_by)`.
- **`audit_log`** — auditoría de eventos (cambios de estado, votos).
- **Índices** en las columnas más consultadas (ubicación, estado, categoría,
  `created_at`, votos, denuncias).

### 2.2 Funciones y triggers automáticos

- **`handle_new_user()`** — crea automáticamente el perfil al registrarse un usuario.
- **`log_status_change()`** — registra en `audit_log` los cambios de estado de incidencia.
- **`log_vote_action()`** — registra en `audit_log` la creación/cambio de votos
  (`incident_upvoted`, `incident_downvoted`, `incident_voted_resolved`).

### 2.3 Score / confirmaciones dinámicos (vistas)

- **`incidents_with_stats`** — todos los datos de incidencias **más** `votes_up`,
  `votes_down`, `votes_resuelta`, `score` (up − down) y `confirmation_count`
  (up) calculados en tiempo real desde `incident_votes`. Se usa para **admin**.
- **`incidents_public`** — vista para el usuario final: filtra las incidencias
  con `votes_resuelta >= resuelto_threshold` (ocultas por umbral) y las
  `rechazado` / `expirado`. Se usa en el mapa y lista pública.

### 2.4 RPC

- **`get_heatmap_data(start, end)`** — devuelve puntos (lat/lng/weight) para el
  **mapa de calor**, con margen temporal parametrizado y excluyendo incidencias
  ocultas por umbral y con estado `rechazado`/`expirado`.

### 2.5 Seguridad (RLS)

- RLS habilitado en **todas** las tablas (`profiles`, `incidents`,
  `incident_votes`, `incident_reports`, `audit_log`).
- Operaciones de usuario resueltas con **RLS nativo** (sin `security definer`):
  - Ver votos: cualquiera (público).
  - Crear/actualizar/borrar: **solo los propios** votos.
  - Crear/actualizar: **solo propias** denuncias; ver/actualizar/borrar denuncias:
    **solo admin**.
  - Incidencias: cualquiera ve; autenticado crea la propia; admin puede
    actualizar/eliminar cualquier.
  - `audit_log`: solo admin puede leer.
- Vistas con `security_invoker = true` para que respeten el RLS de las tablas base.

### 2.6 Storage

- **Bucket `incident-photos`** (público) para subir evidencia fotográfica.
- Políticas: cualquiera ve fotos; el usuario sube/actualiza/elimina **sus** fotos;
  el admin puede eliminar cualquier foto.

### 2.7 Capa de Business Intelligence (producto de datos)

- **Esquema `bi`** con la vista **`bi.incident_daily`**: una fila por incidencia
  con categoría, severidad, estado, descripción, fechas (`observed_date`,
  `report_date`, `updated_at`, `resolved_at`), `has_resolved_by`, ubicación,
  `image_url`, `resolution_days`, `resuelto_threshold`, votos por tipo,
  `score` y conteos de denuncias por estado (`reports_total/pending/resolved/rejected`).
- **`bi.incident_reports_daily`** — vista de **denuncias anonimizadas**
  (sin `reported_by`): una fila por denuncia con `reason`, estado y contexto.
- **`public.analytics_incident_daily`** y **`public.analytics_incident_reports_daily`**
  — vistas espejo en `public` (PostgREST no refleja el esquema `bi`), para exportación **CSV**.
- **Exportación CSV vía PostgREST** con `Accept: text/csv`.
- **Rol `bi_reader`** de solo lectura para **Power BI** (conector Postgres vía
  **session pooler**), con `SELECT` únicamente sobre las vistas de datos.
- **Seguridad**: el producto de datos se lee **solo** con `service_role` /
  `bi_reader`; `anon` y `authenticated` están revocados. Datos **sin PII**.
- **Onboarding y distribución**: `docs/data-dictionary.md` (diccionario),
  `docs/bi-client-onboarding.md` (conexión + certificado CA) y
  `docs/terms-of-use.md` (licencia del dato).

### 2.8 Limpieza / decisiones de negocio

- **Eliminado el rol `institution`** y reasignados sus perfiles a `'user'`.
- **Eliminadas** la RPC obsoleta `get_dashboard_stats` y la página/web de
  dashboard institucional.
- **Eliminada** la tabla `incident_actions` (sustituida por `incident_votes`).

### 2.9 Datos de prueba

- **`01_seed_demo.sql`** — inserta 8 incidencias demo en varias categorías y un
  voto de ejemplo (requiere el usuario `admin@movimap.cl` con rol admin).

---

## 3. Frontend (React + Vite + Supabase)

### 3.1 Autenticación y perfil

- **Registro** de usuario con email/contraseña + nombre (`signUp`), con pantalla
  de confirmación de email.
- **Inicio de sesión / cierre de sesión** (`signIn` / `signOut`).
- Carga automática del **perfil** (`getProfile`) y reactividad del estado de
  sesión (sesión activa ↔ perfil).
- Rutas protegidas según **rol**: `/report` y `/activity` requieren sesión;
  `/admin` requiere rol `admin`.

### 3.2 Exploración en el mapa (Home)

- **Mapa interactivo** con Leaflet (OpenStreetMap).
- **Marcadores por categoría** con colores y **popups** de detalle (severidad,
  confirmaciones, imagen, enlace a detalle completo).
- **Búsqueda de dirección/ubicación** vía **Nominatim** (OpenStreetMap), con
  autocompletado y selección de resultado.
- **Filtros** por categoría y por estado en el listado.
- **Lista lateral** de incidencias (desktop) y **lista tipo bottom-sheet** (móvil).
- **Contadores** en el pie (activas, resueltas, categorías).
- Botón flotante (FAB) para **reportar** desde el mapa (móvil).
- **Actualización en tiempo real** (Supabase Realtime) al crear/actualizar/borrar
  incidencias; refresca desde la vista pública.
- **Formulario de login inline** (desktop) sobre el mapa.

### 3.3 Geolocalización y zona piloto

- `useGeolocation` hook: obtener posición actual, seguimiento (watch), stop,
  y manejo de errores (permiso, no disponible, timeout).
- Control GPS en el mapa: **centrar/actualizar ubicación**, **seguir en tiempo
  real**, e indicador **dentro/fuera de zona piloto**.
- **Límites de zona** de Providencia (`ZONE_BOUNDS`) para validar reportes.

### 3.4 Reporte de incidencia

- Formulario completo con **validación (zod)**: categoría, descripción
  (100–500 caracteres), severidad (1–3), fecha de observación, duración,
  ubicación y foto opcional.
- Selección de ubicación por **GPS** o por **punto en el mapa** (con selector
  interactivo y fullscreen en móvil).
- **Validación de zona piloto**: solo se aceptan reportes dentro de Providencia.
- **Subida de evidencia fotográfica** con validación de tipo (JPG/PNG/WebP) y
  tamaño (máx. 2MB).
- Guarda la incidencia con estado `nuevo` y muestra pantalla de éxito.

### 3.5 Detalle de incidencia (modal)

- Muestra descripción, imagen, estado, severidad, **score y confirmaciones**.
- **Votación** con 3 opciones: **Confirmar** (up), **Rechazar** (down),
  **Marcar resuelta** (resuelta). Resalta el voto activo del usuario.
- **Cambio de voto** (de una opción a otra) sin duplicados.
- **Denunciar incidencia** (reporte), con confirmación y manejo de duplicados
  ("ya denunciada").
- Refresca el **score** desde la vista del servidor tras votar.

### 3.6 Actividad del usuario

- Pestañas **Mis reportes**, **Mis acciones** y **General**.
- **Mis reportes**: incidencias creadas por el usuario (con estado y score).
- **Mis acciones**: votos del usuario (confirmado/rechazado/marcada resuelta).
- **General**: incidencias populares ordenadas por **score**.
- Modal de detalle reutilizable.

### 3.7 Panel de administración

- Listado de **todas** las incidencias (incluidas las ocultas por umbral),
  con filtros por estado y categoría.
- Detalle con severidad, duración, estado, score, confirmaciones y evidencia.
- **Cambiar estado** de incidencia (`nuevo`, `confirmado`, `en_revision`,
  `resuelto`, `rechazado`, `expirado`) con registro en auditoría.
- **Gestión de denuncias**: lista de reportes con contador de pendientes,
  datos del denunciante, y acciones **marcar resuelta / rechazar**.

### 3.8 Diseño y navegación

- **Responsive**: barra de navegación superior (desktop) y **barra inferior**
  (móvil) con iconos.
- Enlace **Admin** solo visible para usuarios `admin`.
- Componentes compartidos: `NavBar`, `MapView`, `LocationControls`,
  `IncidentDetailModal`.

### 3.9 Utilidades y tipos

- **Tipos** compartidos (`Incident`, `Profile`, `VoteAction`, `IncidentReport`,
  `AuditLog`, `HeatmapPoint`, etc.).
- **Constantes** de categorías, severidades, duraciones, colores, límites de zona
  y validaciones.
- **Helpers** de formato de fecha, categoría, severidad, duración, y utilidades
  de zona/categoría.

---

## 4. Pendientes conocidos (backlog futuro)

- [ ] Verificar el ocultamiento por umbral (D3) en el mapa/detalle con una
      incidencia que supere el umbral.
- [ ] Pruebas end-to-end: votar, cambiar voto, denunciar y ocultamiento por umbral.
- [ ] Aplicar `15_expand_bi_views.sql` en Supabase y verificar las vistas BI ampliadas.
- [ ] Emitir credenciales/roles por cliente para la venta formal del dato (multi-cliente).
```
