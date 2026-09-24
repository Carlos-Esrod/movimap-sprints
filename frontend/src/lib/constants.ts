import type { IncidentCategory } from '@/types';
import { Sparkles, CheckCircle2, Clock3, ThumbsUp, Ban, Hourglass } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const ZONE_BOUNDS = {
  minLat: -33.440,
  maxLat: -33.410,
  minLng: -70.630,
  maxLng: -70.600,
} as const;

export const CENTER: [number, number] = [-33.4272, -70.6175];
export const INITIAL_ZOOM = 15;
export const MIN_ZOOM = 13;
export const MAX_ZOOM = 19;

// Umbrales por defecto de ocultamiento automático de reportes.
// Definidos aquí para cambiarlos en un solo lugar (igual que en
// backend/migraciones/nuevo/16_umbral_downvotes.sql).
export const DEFAULT_DOWNVOTE_THRESHOLD = 4;
export const DEFAULT_RESUELTO_THRESHOLD = 3;

export const MARKER_COLOR_PRIMARY = '#002f35';
export const MARKER_COLOR_ACCENT = '#ff6b6b';

export const SEVERITY_MARKER_COLORS: Record<number, string> = {
  1: '#30666d', // surface-tint (teal) - Informativo
  2: '#ff6b6b', // secondary-container (coral) - Moderado
  3: '#ae2f34', // secondary (rojo profundo) - Grave
};

export const PHOTO_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const MAX_INPUT_SIZE_BYTES = 30 * 1024 * 1024; // 30MB, tope de entrada antes de comprimir
export const PHOTO_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const DESCRIPTION_MIN_LENGTH = 1;
export const DESCRIPTION_MAX_LENGTH = 500;

export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
export const NOMINATIM_LIMIT = 5;

export const INCIDENT_CATEGORIES = [
  { value: 'vereda_cortada', label: 'Vereda cortada' },
  { value: 'vereda_deteriorada', label: 'Vereta deteriorada' },
  { value: 'rampa_bloqueada', label: 'Rampa bloqueada' },
  { value: 'rampa_inexistente', label: 'Rampa inexistente' },
  { value: 'obstaculo_fisico', label: 'Obstáculo físico' },
  { value: 'ascensor_fuera_servicio', label: 'Ascensor fuera de servicio' },
  { value: 'falta_iluminacion', label: 'Falta de iluminación' },
  { value: 'otro', label: 'Otro' },
] as const;

export const SEVERITY_LEVELS = [
  { value: 1, label: 'Informativo', description: 'Inconveniente menor, no impide el tránsito' },
  { value: 2, label: 'Moderado', description: 'Dificulta el desplazamiento, requiere precaución' },
  { value: 3, label: 'Grave', description: 'Bloquea la ruta o presenta riesgo' },
] as const;

export const DURATION_OPTIONS = [
  { value: 'temporal', label: 'Temporal' },
  { value: 'permanente', label: 'Permanente' },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  vereda_cortada: '#e74c3c',
  vereda_deteriorada: '#e67e22',
  rampa_bloqueada: '#f39c12',
  rampa_inexistente: '#9b59b6',
  obstaculo_fisico: '#e74c3c',
  ascensor_fuera_servicio: '#3498db',
  falta_iluminacion: '#2c3e50',
  otro: '#95a5a6',
};

export const STATUS_COLORS: Record<string, string> = {
  nuevo: '#3498db',
  confirmado: '#2ecc71',
  en_revision: '#f39c12',
  resuelto: '#27ae60',
  rechazado: '#e74c3c',
  expirado: '#95a5a6',
};

export const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  rechazado: 'Rechazado',
  expirado: 'Expirado',
};

export const STATUS_ICONS: Record<string, LucideIcon> = {
  nuevo: Sparkles,
  confirmado: ThumbsUp,
  en_revision: Clock3,
  resuelto: CheckCircle2,
  rechazado: Ban,
  expirado: Hourglass,
};

export function isInsideZone(lat: number, lng: number): boolean {
  return (
    lat >= ZONE_BOUNDS.minLat &&
    lat <= ZONE_BOUNDS.maxLat &&
    lng >= ZONE_BOUNDS.minLng &&
    lng <= ZONE_BOUNDS.maxLng
  );
}

export function formatCategory(value: string): string {
  const category = INCIDENT_CATEGORIES.find(c => c.value === value);
  return category?.label || value;
}

export function formatSeverity(value: number): string {
  const level = SEVERITY_LEVELS.find(s => s.value === value);
  return level?.label || String(value);
}

export function formatDuration(value: string): string {
  const option = DURATION_OPTIONS.find(d => d.value === value);
  return option?.label || value;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
