import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, DURATION_OPTIONS, ZONE_BOUNDS, CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS } from './constants';
import type { IncidentCategory } from '@/types';

export { CATEGORY_COLORS, STATUS_LABELS, STATUS_COLORS };

export function getCategoryLabel(category: IncidentCategory): string {
  return INCIDENT_CATEGORIES.find(c => c.value === category)?.label || category;
}

export function getSeverityLabel(severity: number): string {
  return SEVERITY_LEVELS.find(s => s.value === severity)?.label || String(severity);
}

export function getDurationLabel(duration: string): string {
  return DURATION_OPTIONS.find(d => d.value === duration)?.label || duration;
}

export function isWithinZone(lat: number, lng: number): boolean {
  return (
    lat >= ZONE_BOUNDS.minLat &&
    lat <= ZONE_BOUNDS.maxLat &&
    lng >= ZONE_BOUNDS.minLng &&
    lng <= ZONE_BOUNDS.maxLng
  );
}
