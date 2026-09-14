# Movimap — Guía de uso de datos para Power BI (capa BI)

> Documento de soporte para consumir el producto de datos de Movimap
> en Power BI. Complementa `docs/arquitectura-datos-decisiones.md` (D5).

---

## 1. Fuentes de datos disponibles

| Objeto | Descripción | Acceso |
|--------|-------------|--------|
| `bi.incident_daily` | Vista analítica (una fila por incidencia) con métricas agregadas | Solo lectura para `service_role` / integración |
| `public.analytics_incident_daily` | La misma vista, expuesta vía PostgREST para export CSV | Solo `service_role` |

Columnas de `bi.incident_daily`:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `incident_id` | uuid | Id de la incidencia |
| `category` | text | Categoría (vereda_cortada, rampa_bloqueada, …) |
| `severity` | int | Prioridad 1–3 |
| `status` | text | nuevo / confirmado / en_revision / resuelto / rechazado / expirado |
| `report_date` | date | Fecha de creación (para series temporales) |
| `latitude`, `longitude` | numeric | Ubicación para mapas |
| `resuelto_threshold` | int | Umbral de votos "resuelta" definido por incidencia |
| `votes_up` / `votes_down` / `votes_resuelta` | int | Conteos por tipo de voto |
| `score` | int | `votes_up - votes_down` |
| `reports_pending` | int | Denuncias pendientes asociadas a la incidencia |

---

## 2. Conexión directa desde Power BI (conector Postgres)

**NO** uses el usuario `postgres` (superusuario). Crea el rol de solo
lectura `bi_reader` (`14_bi_reader_role.sql`) y conéctalo con él.

1. **Obtener datos → PostgreSQL**.
2. Parámetros de conexión (copiarlos de Supabase → Settings → Database → **Session pooler**):
   - *Host (Server)*: `aws-0-<region>.pooler.supabase.com` — puerto `5432`.
   - *Database*: `postgres`
   - *Username*: `bi_reader`
   - *Password*: la que definiste al crear el rol (la de `14_bi_reader_role.sql`).
3. En **Advanced options → SQL statement** (recomendado) o eligiendo la vista:
   ```sql
   select * from bi.incident_daily;
   ```
   - *Import* (modo por defecto) para snapshots periódicos.
   - *DirectQuery* si se quiere siempre en vivo.
4. Añadir filtros en el editor de consultas (Power Query), p. ej. por rango de fechas:
   ```sql
   select * from bi.incident_daily
   where report_date >= current_date - 90;
   ```

> El rol `bi_reader` solo tiene `SELECT` sobre las vistas BI y no puede
> escribir datos ni alterar el esquema.

---

## 3. Exportación CSV (alternativa / orquestación)

El producto de datos también puede consumirse como CSV vía PostgREST
solo con `service_role`:

```bash
curl -s -H "Accept: text/csv" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  "https://<PROJECT_REF>.supabase.co/rest/v1/public/analytics_incident_daily?select=*&order=report_date.desc"
```

Variantes útiles (formato de filtro PostgREST):

```bash
# Por rango de fechas
...?report_date=gte.2026-01-01&report_date=lte.2026-12-31

# Solo confirmadas
...?status=eq.confirmado

# Todos los registros
...?select=*
```

En Power BI se consume con el conector **Web / OData** (o importando el CSV),
usando la URL anterior con la cabecera `Accept: text/csv`. Para datos sin
restricciones de RLS se usa la «Secret Key / Service Role».

---

## 4. Seguridad del producto de datos

- **No** exponer `bi.*` ni `analytics_incident_daily` a roles `anon` / `authenticated`.
  Solo `service_role` (para exportación programática) y el rol **`bi_reader`** (de solo
  lectura, para Power BI) deben tener `select`.
- `public.analytics_incident_daily` delega en `bi.incident_daily`; anon no puede leerla.
- `bi_reader` está limitado a leer únicamente las vistas BI (las vistas se ejecutan como
  su dueño, por lo que `bi_reader` no puede acceder a las tablas base ni a datos de denunciantes).
- Antes de distribuir, revisar qué columnas se comparten con clientes
  (ubicación GPS, denunciantes anonimizados, etc.).

---

## 5. Recordatorio (migraciones aplicadas en prod)

Para esta capa se ejecutaron en Supabase:
`10_bi_export.sql` (esquema `bi`), `12_expose_bi_schema.sql` (grants),
`13_analytics_view.sql` (vista pública de export) y
`14_bi_reader_role.sql` (rol de solo lectura para Power BI).
