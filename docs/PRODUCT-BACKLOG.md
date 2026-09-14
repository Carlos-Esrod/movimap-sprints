# Movimap — Product Backlog (completado)

> Backlog de **historias de usuario ya completadas** por el proyecto Movimap,
> listas para publicar. Convención de puntos: **Fibonacci** (1, 2, 3, 5, 8).
> Cada historia está redactada como historia de usuario con criterios de
> aceptación para facilitar el seguimiento y la trazabilidad.

---

## Tabla resumen

| ID | Historia | Épica | Puntos | Estado |
|----|----------|-------|--------|--------|
| UH-01 | Registro de usuarios | Autenticación | 3 | ✅ Completado |
| UH-02 | Inicio de sesión / cierre | Autenticación | 2 | ✅ Completado |
| UH-03 | Perfil automático al registrarse | Autenticación | 2 | ✅ Completado |
| UH-04 | Mapa interactivo de incidencias | Exploración | 5 | ✅ Completado |
| UH-05 | Búsqueda de dirección | Exploración | 3 | ✅ Completado |
| UH-06 | Filtros por categoría y estado | Exploración | 3 | ✅ Completado |
| UH-07 | Actualización en tiempo real | Exploración | 3 | ✅ Completado |
| UH-08 | Geolocalización y seguimiento | Geolocalización | 3 | ✅ Completado |
| UH-09 | Validación de zona piloto | Geolocalización | 2 | ✅ Completado |
| UH-10 | Reportar incidencia | Reportes | 5 | ✅ Completado |
| UH-11 | Subir evidencia fotográfica | Reportes | 3 | ✅ Completado |
| UH-12 | Ver detalle de incidencia | Incidentes | 2 | ✅ Completado |
| UH-13 | Votar (confirmar/rechazar/resuelta) | Votación | 5 | ✅ Completado |
| UH-14 | Cambiar de voto sin duplicados | Votación | 3 | ✅ Completado |
| UH-15 | Score/confirmaciones dinámicos | Votación | 5 | ✅ Completado |
| UH-16 | Ocultar por umbral de "resuelta" | Votación | 5 | ✅ Completado |
| UH-17 | Denunciar incidencia | Denuncias | 3 | ✅ Completado |
| UH-18 | Actividad del usuario (mis reportes/acciones) | Actividad | 3 | ✅ Completado |
| UH-19 | Panel admin: gestión de incidencias | Administración | 5 | ✅ Completado |
| UH-20 | Panel admin: gestión de denuncias | Administración | 3 | ✅ Completado |
| UH-21 | Auditoría de cambios (estado y votos) | Administración | 3 | ✅ Completado |
| UH-22 | Capa de datos para BI (`bi.incident_daily`) | BI / Datos | 5 | ✅ Completado |
| UH-23 | Exportación CSV vía PostgREST | BI / Datos | 3 | ✅ Completado |
| UH-24 | Rol de solo lectura para Power BI | BI / Datos | 3 | ✅ Completado |
| UH-25 | Eliminación del rol "institution" | Refactor | 3 | ✅ Completado |
| UH-26 | Normalización del modelo de datos | Refactor | 8 | ✅ Completado |
| UH-27 | Diseño responsive (nav superior/inferior) | UI/UX | 3 | ✅ Completado |

**Total puntos (completados): 97**

### Subtotal por épica

| Épica | Puntos |
|-------|--------|
| Autenticación | 7 |
| Exploración | 14 |
| Geolocalización | 5 |
| Reportes | 8 |
| Incidentes | 2 |
| Votación | 18 |
| Denuncias | 3 |
| Actividad | 3 |
| Administración | 11 |
| BI / Datos | 11 |
| Refactor | 11 |
| UI/UX | 3 |

---

## Épica: Autenticación

---

### UH-01 — Registro de usuarios  `⏱ 3`

**Como** ciudadano,
**quiero** crear una cuenta con email, contraseña y nombre,
**para que** pueda participar en la plataforma y reportar incidencias.

**Criterios de aceptación:**
- Formulario de registro con email, contraseña (mín. 6 caracteres) y nombre.
- Validación de email y contraseña mediante zod.
- Confirmación de email al registrarse (pantalla de verificación).
- Manejo y visualización de errores de registro.

---

### UH-02 — Inicio de sesión / cierre de sesión  `⏱ 2`

**Como** usuario,
**quiero** iniciar y cerrar sesión,
**para que** mi estado quede autenticado en la aplicación.

**Criterios de aceptación:**
- Pantalla de login con email y contraseña.
- Botón para cerrar sesión en la barra de navegación.
- Redirección al inicio tras el login y al salir.

---

### UH-03 — Perfil automático al registrarse  `⏱ 2`

**Como** usuario,
**quiero** que mi perfil de usuario se cree automáticamente,
**para que** no tenga que completar datos de forma manual.

**Criterios de aceptación:**
- Trigger `handle_new_user` crea el registro en `profiles` al registrarse.
- El rol por defecto es `user`.

---

## Épica: Exploración

---

### UH-04 — Mapa interactivo de incidencias  `⏱ 5`

**Como** visitante,
**quiero** ver las incidencias en un mapa interactivo,
**para que** pueda ubicarlas geográficamente de forma visual.

**Criterios de aceptación:**
- Mapa Leaflet/OpenStreetMap.
- Marcadores coloreados por categoría con popups (severidad, confirmaciones, imagen).
- Enlace a detalle completo desde el popup.
- Lista lateral de incidencias (desktop) y bottom-sheet (móvil).
- Los marcadores excluyen incidencias `rechazado`/`expirado`.

---

### UH-05 — Búsqueda de dirección  `⏱ 3`

**Como** visitante,
**quiero** buscar una dirección o lugar,
**para que** pueda navegar rápido a una zona de interés.

**Criterios de aceptación:**
- Búsqueda con autocompletado vía Nominatim (OpenStreetMap, país Chile).
- Selección de un resultado y visualización en el mapa.

---

### UH-06 — Filtros por categoría y estado  `⏱ 3`

**Como** visitante,
**quiero** filtrar las incidencias por categoría y estado,
**para que** pueda enfocarme en lo que me interesa.

**Criterios de aceptación:**
- Selector de categoría y de estado.
- El listado y el mapa se actualizan según el filtro.

---

### UH-07 — Actualización en tiempo real  `⏱ 3`

**Como** usuario,
**quiero** ver las incidencias nuevas o actualizadas al instante,
**para que** el mapa se mantenga actualizado sin recargar.

**Criterios de aceptación:**
- Suscripción a cambios (INSERT/UPDATE/DELETE) vía Supabase Realtime.
- Refresco desde la vista pública `incidents_public` al recibir eventos.
- Manejo de error/desconexión del canal.

---

## Épica: Geolocalización

---

### UH-08 — Geolocalización y seguimiento  `⏱ 3`

**Como** usuario,
**quiero** usar mi ubicación GPS en el mapa,
**para que** pueda centrar el mapa y ver mi posición.

**Criterios de aceptación:**
- Obtener posición actual (con manejo de errores: permiso, no disponible, timeout).
- Seguimiento en tiempo real (watch) y stop.
- Controles GPS en el mapa (actualizar / seguir / centrar).

---

### UH-09 — Validación de zona piloto  `⏱ 2`

**Como** usuario,
**quiero** saber si mi ubicación está dentro del área piloto,
**para que** pueda confirmar que mi reporte es válido.

**Criterios de aceptación:**
- Definición de límites de zona de Providencia.
- Indicador dentro/fuera de zona en el mapa y en el formulario.
- Bloqueo de reportes fuera de la zona piloto.

---

## Épica: Reportes

---

### UH-10 — Reportar incidencia  `⏱ 5`

**Como** ciudadano,
**quiero** reportar una incidencia con su ubicación,
**para que** quede registrada para su revisión por la comunidad y la autoridad.

**Criterios de aceptación:**
- Formulario con categoría, descripción (100–500 caracteres), severidad (1–3),
  fecha de observación, duración (temporal/permanente) y ubicación.
- Validación completa con zod.
- Selección de ubicación por **GPS** o por **punto en el mapa**.
- Guardado con estado inicial `nuevo` y pantalla de éxito.

---

### UH-11 — Subir evidencia fotográfica  `⏱ 3`

**Como** ciudadano,
**quiero** adjuntar una foto a mi reporte,
**para que** la evidencia respalde la incidencia.

**Criterios de aceptación:**
- Subida opcional de imagen (JPG/PNG/WebP, máx. 2MB).
- Validación de tipo y tamaño con mensajes claros.
- Persistencia en el bucket `incident-photos` y almacenamiento de la URL.

---

## Épica: Incidentes

---

### UH-12 — Ver detalle de incidencia  `⏱ 2`

**Como** visitante,
**quiero** ver el detalle completo de una incidencia,
**para que** pueda entender su estado, severidad y evidencia.

**Criterios de aceptación:**
- Modal con descripción, imagen, estado, severidad, score, confirmaciones y tipo.
- Acceso desde el mapa (popup → "Ver detalle completo") y lista.

---

## Épica: Votación

---

### UH-13 — Votar (confirmar/rechazar/resuelta)  `⏱ 5`

**Como** usuario,
**quiero** confirmar, rechazar o marcar una incidencia como resuelta,
**para que** la comunidad valide la incidencia.

**Criterios de aceptación:**
- Tres botones de voto: Confirmar (up), Rechazar (down), Marcar resuelta.
- Resaltado del voto activo del usuario.
- Un solo voto por usuario e incidencia (`unique`).
- Manejo de estados de carga y errores.

---

### UH-14 — Cambiar de voto sin duplicados  `⏱ 3`

**Como** usuario,
**quiero** cambiar mi voto en una incidencia,
**para que** pueda corregir mi opinión sin errores.

**Criterios de aceptación:**
- Detección del voto previo y `UPDATE` (no `INSERT`) al cambiar de opción.
- Sin violaciones de RLS ni filas duplicadas.

---

### UH-15 — Score/confirmaciones dinámicos  `⏱ 5`

**Como** usuario,
**quiero** ver score = confirmaciones − rechazos calculados dinámicamente,
**para que** la métrica siempre sea correcta sin datos inconsistentes.

**Criterios de aceptación:**
- Vista `incidents_with_stats` calcula `score`, `votes_up/down/resuelta` y
  `confirmation_count` desde `incident_votes`.
- Eliminadas las columnas denormalizadas `score`/`confirmation_count`.
- El frontend refresca el score desde el servidor tras votar.

---

### UH-16 — Ocultar por umbral de "resuelta"  `⏱ 5`

**Como** usuario,
**quiero** que las incidencias votadas como resueltas dejen de mostrarse cuando
superan un umbral,
**para que** el mapa muestre solo incidencias vigentes.

**Criterios de aceptación:**
- Columna `resuelto_threshold` configurable por incidencia (por defecto 3).
- La vista `incidents_public` excluye incidencias con `votes_resuelta >= threshold`.
- `get_heatmap_data` también excluye esas incidencias.

---

## Épica: Denuncias

---

### UH-17 — Denunciar incidencia  `⏱ 3`

**Como** usuario,
**quiero** denunciar una incidencia,
**para que** el administrador la revise por separado de los votos.

**Criterios de aceptación:**
- Botón "Denunciar" en el detalle de la incidencia.
- Registro en `incident_reports` con estado `pendiente`.
- Manejo de duplicados ("ya denunciada") y confirmación al usuario.
- Denuncias visibles solo para admin (RLS).

---

## Épica: Actividad

---

### UH-18 — Actividad del usuario (mis reportes/acciones)  `⏱ 3`

**Como** usuario,
**quiero** ver mis reportes y mis acciones,
**para que** tenga visibilidad sobre mi participación.

**Criterios de aceptación:**
- Tab de **Mis reportes** (incidencias creadas).
- Tab de **Mis acciones** (votos: confirmado/rechazado/marcada resuelta).
- Tab **General** con incidencias más populares (por score).

---

## Épica: Administración

---

### UH-19 — Panel admin: gestión de incidencias  `⏱ 5`

**Como** administrador,
**quiero** ver y gestionar todas las incidencias,
**para que** pueda moderar su estado.

**Criterios de aceptación:**
- Listado de todas las incidencias (incluidas las ocultas por umbral) con filtros.
- Detalle con severidad, duración, estado, score y evidencia.
- Cambiar estado (`nuevo`, `confirmado`, `en_revision`, `resuelto`, `rechazado`, `expirado`).
- Registro del cambio en `audit_log`.

---

### UH-20 — Panel admin: gestión de denuncias  `⏱ 3`

**Como** administrador,
**quiero** revisar y gestionar las denuncias de incidencias,
**para que** pueda resolverlas o rechazarlas.

**Criterios de aceptación:**
- Lista de denuncias con contador de pendientes.
- Datos del denunciante y motivo.
- Acciones "Marcar resuelta" y "Rechazar".

---

### UH-21 — Auditoría de cambios (estado y votos)  `⏱ 3`

**Como** administrador,
**quiero** registrar los cambios de estado y los votos,
**para que** exista trazabilidad de las acciones.

**Criterios de aceptación:**
- Trigger `log_status_change` para cambios de estado.
- Trigger `log_vote_action` para votos.
- Tabla `audit_log` y RLS solo-admin.

---

## Épica: BI / Datos

---

### UH-22 — Capa de datos para BI (`bi.incident_daily`)  `⏱ 5`

**Como** equipo de datos/cliente,
**quiero** una vista analítica agregada por incidencia,
**para que** pueda consumir el producto de datos.

**Criterios de aceptación:**
- Esquema `bi` con vista `bi.incident_daily` (una fila por incidencia).
- Columnas: categoría, severidad, estado, fecha, ubicación, umbral, votos,
  score y denuncias pendientes.
- Acceso restringido a `service_role` (no anon/authenticated).

---

### UH-23 — Exportación CSV vía PostgREST  `⏱ 3`

**Como** integración,
**quiero** exportar la vista analítica a CSV,
**para que** pueda ingestar los datos en herramientas externas.

**Criterios de aceptación:**
- Vista `public.analytics_incident_daily` accesible vía PostgREST.
- Soporte de cabecera `Accept: text/csv` y filtros por fecha/estado.

---

### UH-24 — Rol de solo lectura para Power BI  `⏱ 3`

**Como** analista de BI,
**quiero** conectar Power BI con un usuario de solo lectura,
**para que** pueda consultar datos sin privilegios de escritura.

**Criterios de aceptación:**
- Rol `bi_reader` con `LOGIN` y sin DDL/DML.
- `SELECT` solo sobre las vistas de datos.
- No usar el usuario superusuario `postgres`.

---

## Épica: Refactor

---

### UH-25 — Eliminación del rol "institution"  `⏱ 3`

**Como** equipo de producto,
**quiero** eliminar el rol institucional,
**para que** no existan roles obsoletos (negocio: reventa de datos).

**Criterios de aceptación:**
- Rol `profiles.role` limitado a `('user', 'admin')`.
- Perfiles `institution` reasignados a `user`.
- Eliminadas RPC `get_dashboard_stats` y la página dashboard del frontend.

---

### UH-26 — Normalización del modelo de datos  `⏱ 8`

**Como** equipo de datos,
**quiero** normalizar votos y denuncias en tablas dedicadas,
**para que** el modelo sea consistente y aditivo.

**Criterios de aceptación:**
- Tabla `incident_votes` y `incident_reports` dedicadas.
- Migración de `incident_actions` → `incident_votes` (mapeo opciones).
- Eliminación de `incident_actions` y de columnas denormalizadas.
- Vistas de score dinámicas y RLS sin `security definer`.
- Script de esquema canónico (`00_esquema_actual.sql`) y seed demo.

---

## Épica: UI/UX

---

### UH-27 — Diseño responsive (nav superior/inferior)  `⏱ 3`

**Como** usuario,
**quiero** una navegación adaptable a móvil y escritorio,
**para que** la experiencia sea cómoda en cualquier dispositivo.

**Criterios de aceptación:**
- Barra de navegación superior en desktop.
- Barra inferior con iconos en móvil.
- Enlace Admin solo para admin; regiones del mapa/listado responsivas.

---

## Backlog futuro (no estimado)

- [ ] Verificar de forma automatizada el ocultamiento por umbral (D3) en el mapa/detalle.
- [ ] Pruebas end-to-end: votar, cambiar voto, denunciar y ocultamiento por umbral.
- [ ] Definir el modelo de **venta de datos** (plan de suscripción, permisos de lectura por cliente).
- [ ] Revisar/anonimizar columnas sensibles expuestas en la capa BI (ubicación GPS, denunciantes).
- [ ] Notificaciones y flujo de seguimiento por el usuario.
