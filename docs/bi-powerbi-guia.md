# Movimap — Guía de uso de datos para Power BI (capa BI)

> Documento de soporte para consumir el producto de datos de Movimap
> en Power BI. Complementa `docs/arquitectura-datos-decisiones.md` (D5/D8),
> `docs/data-dictionary.md` (diccionario) y `docs/bi-client-onboarding.md`
> (guía de onboarding para clientes + resolución del certificado CA).

---

## 1. Fuentes de datos disponibles

| Objeto | Descripción | Acceso |
|--------|-------------|--------|
| `bi.incident_daily` | Vista analítica (una fila por incidencia) con métricas agregadas | Solo lectura `service_role` / `bi_reader` |
| `bi.incident_reports_daily` | Vista de **denuncias anonimizadas** (una fila por denuncia, sin identidad) | Solo lectura `service_role` / `bi_reader` |
| `public.analytics_incident_daily` | Espejo de `bi.incident_daily` expuesto vía PostgREST (export CSV) | Solo `service_role` |
| `public.analytics_incident_reports_daily` | Espejo de `bi.incident_reports_daily` vía PostgREST (export CSV) | Solo `service_role` |

> Definiciones canónicas en `backend/migraciones/nuevo/15_expand_bi_views.sql`.

### Columnas de `bi.incident_daily`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `incident_id` | uuid | Id de la incidencia |
| `category` | text | Categoría (vereda_cortada, rampa_bloqueada, …) |
| `severity` | int | Prioridad 1–3 |
| `status` | text | nuevo / confirmado / en_revision / resuelto / rechazado / expirado |
| `description` | text | Descripción del reporte |
| `observed_date` | date | Fecha de observación |
| `report_date` | date | Fecha de creación (series temporales) |
| `updated_at` / `resolved_at` | timestamptz | Última actualización / resolución |
| `has_resolved_by` | boolean | Si hay responsable registrado (sin revelar identidad) |
| `latitude` / `longitude` | numeric | Ubicación para mapas |
| `resuelto_threshold` | int | Umbral de votos "resuelta" |
| `image_url` | text | Evidencia fotográfica |
| `resolution_days` | numeric | Días hasta la resolución |
| `votes_up` / `votes_down` / `votes_resuelta` | int | Conteos por tipo de voto |
| `score` | int | `votes_up - votes_down` |
| `reports_total` / `reports_pending` / `reports_resolved` / `reports_rejected` | int | Conteos de denuncias por estado |

### Columnas de `bi.incident_reports_daily`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `report_id` / `incident_id` | uuid | Ids de la denuncia e incidencia |
| `category` / `severity` | — | Contexto de la incidencia denunciada |
| `incident_status` | text | Estado de la incidencia denunciada |
| `latitude` / `longitude` | numeric | Ubicación |
| `report_status` | text | pendiente / resuelto / rechazado |
| `reason` | text | Motivo de la denuncia (sin autor) |
| `report_date` / `updated_at` | date/timestamptz | Fechas |

> `bi.incident_reports_daily` **no** incluye `reported_by` (anonimizado).

---

## 2. Conexión directa desde Power BI (conector Postgres)

**NO** uses el usuario `postgres` (superusuario). Usa el rol de solo lectura
`bi_reader` (`backend/migraciones/nuevo/14_bi_reader_role.sql`).

1. **Obtener datos → PostgreSQL**.
2. Parámetros (de Supabase → Settings → Database → **Session pooler**):
   - *Host*: `aws-0-us-west-2.pooler.supabase.com` — puerto `5432`.
   - *Database*: `postgres`
   - *Username*: `bi_reader.teqxrkioyfphbezrlcdl`
   - *Password*: la del rol `bi_reader`.
3. En **Advanced options → SQL statement** (recomendado):
   ```sql
   select * from bi.incident_daily;
   ```
4. *Import* (default) para snapshots, o *DirectQuery* para siempre en vivo.

> **Por qué session pooler (5432) y no transaction (6543):** el session pooler
> soporta prepared statements y sesiones persistentes, que es lo que exige el
> conector de Power BI. El modo transacción no lo soporta y suele fallar.

### Error "remote certificate is invalid"

Ver `docs/bi-client-onboarding.md` §2. Resumen: instalar la **CA de Supabase**
(Settings → Database → **SSL Configuration → Download Certificate**) en el
almacén **Entidades de certificación raíz de confianza** de la máquina que corre
la conexión (tu PC para Desktop, o la máquina del **gateway** para Power BI
Service).

---

## 3. Exportación CSV (alternativa / orquestación)

Con `service_role` (o clave de lectura dedicada) vía PostgREST:

```bash
curl -s -H "Accept: text/csv" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://teqxrkioyfphbezrlcdl.supabase.co/rest/v1/public/analytics_incident_daily?select=*&order=report_date.desc"
```

Variantes útiles:

```bash
# Por rango de fechas
...?report_date=gte.2026-01-01&report_date=lte.2026-12-31

# Solo confirmadas
...?status=eq.confirmado

# Todos los registros
...?select=*
```

> ⚠️ Si se comparte el reporte con un cliente, **no** incrustar la `service_role`
> en el reporte. Emitir una clave de solo lectura o usar el conector Postgres con
> `bi_reader` (recomendado).

---

## 4. Seguridad del producto de datos

- No exponer `bi.*` ni `public.analytics_*` a roles `anon` / `authenticated`.
  Solo `service_role` (exportación programática) y `bi_reader` (solo lectura,
  Power BI) tienen `SELECT`.
- `public.analytics_*` delegan en `bi.*`; `anon` no puede leerlas.
- `bi_reader` solo lee las vistas BI; las vistas corren como su dueño, por lo
  que **no accede** a tablas base ni a datos de denunciantes.
- Datos **anonimizados**: sin identidad de denunciantes/usuarios (ver
  `docs/data-dictionary.md`).

---

## 5. Migraciones de la capa BI

En Supabase se ejecutaron (o deben ejecutarse) para esta capa:
`10_bi_export.sql`, `12_expose_bi_schema.sql`, `13_analytics_view.sql`,
`14_bi_reader_role.sql` y **`15_expand_bi_views.sql`** (ampliación D8).
