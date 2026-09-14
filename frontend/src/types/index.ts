export type UserRole = 'user' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string;
  role: UserRole;
  organization_name: string | null;
  created_at: string;
  updated_at: string;
}

export type IncidentCategory =
  | 'vereda_cortada'
  | 'vereda_deteriorada'
  | 'rampa_bloqueada'
  | 'rampa_inexistente'
  | 'obstaculo_fisico'
  | 'ascensor_fuera_servicio'
  | 'falta_iluminacion'
  | 'otro';

export type IncidentStatus =
  | 'nuevo'
  | 'confirmado'
  | 'en_revision'
  | 'resuelto'
  | 'rechazado'
  | 'expirado';

export type IncidentSeverity = 1 | 2 | 3;
export type SeverityLevel = 1 | 2 | 3;
export type DurationOption = 'temporal' | 'permanente';
export type EstimatedDuration = 'temporal' | 'permanente';

export type VoteAction = 'up' | 'down' | 'resuelta';

export interface Incident {
  id: string;
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  severity: IncidentSeverity;
  observed_at: string;
  estimated_duration: EstimatedDuration;
  status: IncidentStatus;
  image_url: string | null;
  confirmation_count: number;
  score: number;
  votes_up: number;
  votes_down: number;
  votes_resuelta: number;
  resuelto_threshold: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface IncidentAction {
  id: string;
  incident_id: string;
  user_id: string;
  vote_type: VoteAction;
  created_at: string;
  updated_at: string;
}

export type ReportStatus = 'pendiente' | 'resuelto' | 'rechazado';

export interface IncidentReport {
  id: string;
  incident_id: string;
  reported_by: string;
  reason: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  incidents?: Incident;
  reporter?: Profile;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: any;
  created_at: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface IncidentFormData {
  category: IncidentCategory;
  description: string;
  severity: IncidentSeverity;
  observed_at: string;
  estimated_duration: EstimatedDuration;
  latitude: number;
  longitude: number;
  image: File | null;
}

export interface CategoryInfo {
  value: IncidentCategory;
  label: string;
  color: string;
}

export interface SeverityInfo {
  value: IncidentSeverity;
  label: string;
  description: string;
}

export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
}
