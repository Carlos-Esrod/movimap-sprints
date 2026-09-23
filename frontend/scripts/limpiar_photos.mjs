// ============================================================================
// limpiar_photos.mjs — Limpieza de fotos del bucket `incident-photos`
// ============================================================================
//
// QUÉ HACE
// ----------------------------------------------------------------------------
// Recorre el bucket de almacenamiento `incident-photos` de Supabase y elimina
// **todos** los objetos (imágenes) que contiene, mediante la Storage API.
// No borra nada más (no toca reportes, votos, denuncias ni otros buckets).
// Idempotente: si el bucket ya está vacío, no rompe nada y reporta 0.
//
// PARA QUÉ SIRVE
// ----------------------------------------------------------------------------
// Completa la limpieza de datos de prueba/demo. El script
// `backend/migraciones/limpieza/limpieza_datos_demo.sql` borra las tablas
// transaccionales (reportes, votos, denuncias, auditoría) pero **no** puede
// borrar los archivos de `storage.objects` por SQL.
// Este script elimina justamente esos objetos (los "3 fotos" huérfanos que
// quedaban) para dejar el bucket vacío y la base lista para datos reales.
//
// POR QUÉ FUE HECHO (motivación / contexto)
// ----------------------------------------------------------------------------
// Las imágenes subidas NO se guardan en Postgres: el archivo vive en el
// backend de Storage de Supabase (S3) y en la base sólo queda una fila de
// METADATOS en `storage.objects` (bucket_id, name/ruta, owner, etc.).
// La relación con los reportes es IMPLÍCITA, sin FK: `incidents.image_url`
// guarda la URL pública que codifica `bucket + ruta`. Al borrar los reportes
// (limpieza SQL) esos `image_url` desaparecen, pero los objetos de storage
// quedan **huérfanos**.
//
// No se pueden borrar por SQL en modo directo: Supabase bloquea el
// `delete` de `storage.objects` con el trigger `protect_objects_delete`, y el
// rol del SQL Editor no siempre es dueño de la tabla para deshabilitar
// triggers. Por eso la única vía robusta es la **Storage API** con la clave
// `service_role`, que no está sujeta a RLS.
//
// USO
// ----------------------------------------------------------------------------
// Se ejecuta desde la carpeta `frontend/` (para resolver el módulo
// `@supabase/supabase-js` de node_modules):
//   cd frontend
//   node scripts/limpiar_photos.mjs
//
// Requiere en el `.env` de la raíz del repo:
//   VITE_SUPABASE_URL  → URL del proyecto Supabase
//   VITE_SUPABASE_SERVICE_KEY → clave `service_role` (necesaria para borrar
//                               sin RLS). ⚠️ Es secreto: no exponerla en el
//                               frontend ni en repos públicos.
// ============================================================================
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../../.env');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const url = env.VITE_SUPABASE_URL;
const serviceKey = env.VITE_SUPABASE_SERVICE_KEY;
if (!url || !serviceKey) {
  console.error('Falta VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY en .env');
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false } });
const BUCKET = 'incident-photos';

async function listAll(prefix = '') {
  const { data, error } = await client.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) {
    console.error('Error listando', prefix, error.message);
    return [];
  }
  const paths = [];
  for (const item of data) {
    const full = prefix ? `${prefix}/${item.name}` : item.name;
    // En Supabase Storage, los "folders" tienen id null.
    if (item.id === null) {
      paths.push(...(await listAll(full)));
    } else {
      paths.push(full);
    }
  }
  return paths;
}

const paths = await listAll('');
console.log(`Se encontraron ${paths.length} objetos en el bucket.`);

if (paths.length === 0) {
  console.log('Nada que borrar.');
  process.exit(0);
}

const { data: removed, error } = await client.storage.from(BUCKET).remove(paths);
if (error) {
  console.error('Error al borrar:', error.message);
  process.exit(1);
}
console.log(`Eliminados ${removed?.length ?? 0} objetos.`);
