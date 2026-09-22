import { createClient, SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface ImportMeta {
    env: {
      VITE_SUPABASE_URL: string;
      VITE_SUPABASE_ANON_KEY: string;
      PROD: boolean;
      DEV: boolean;
      MODE: string;
    };
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string, displayName: string) {
  return await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

export async function getProfile() {
  const session = await getSession();
  if (!session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) return null;
  return data;
}

export async function getIncidents(filters?: { status?: string; category?: string; severity?: number; limit?: number; offset?: number }) {
  let query = supabase.from('incidents_public').select('*').order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.severity) query = query.eq('severity', filters.severity);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);

  return await query;
}

export async function getAdminIncidents(filters?: { status?: string; category?: string; limit?: number }) {
  let query = supabase.from('incidents_with_stats').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.category) query = query.eq('category', filters.category);
  if (filters?.limit) query = query.limit(filters.limit);
  return await query;
}

export async function getIncidentById(id: string) {
  return await supabase.from('incidents_with_stats').select('*').eq('id', id).single();
}

export async function getPublicIncidentById(id: string) {
  return await supabase.from('incidents_public').select('*').eq('id', id).maybeSingle();
}

export async function getIncidentActions(incidentId: string) {
  return await supabase.from('incident_votes').select('*').eq('incident_id', incidentId).order('created_at', { ascending: true });
}

export async function createIncident(incident: {
  category: string;
  description: string;
  severity: number;
  observed_at: string;
  estimated_duration: string;
  latitude: number;
  longitude: number;
  image?: File;
  created_by: string;
  place_name?: string | null;
  address?: string | null;
}) {
  const session = await getSession();
  const userId = incident.created_by || session?.user?.id;

  if (!userId) {
    return { data: null, error: new Error('Usuario no autenticado') };
  }

  let imageUrl: string | null = null;
  if (incident.image) {
    const fileName = `${userId}/${Date.now()}-${incident.image.name}`;
    const { error: uploadError } = await supabase.storage.from('incident-photos').upload(fileName, incident.image);
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
    } else {
      const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(fileName);
      imageUrl = publicUrl;
    }
  }

  const { data: incidentData, error: insertError } = await supabase
    .from('incidents')
    .insert({
      category: incident.category,
      description: incident.description,
      severity: incident.severity,
      observed_at: incident.observed_at,
      estimated_duration: incident.estimated_duration,
      latitude: incident.latitude,
      longitude: incident.longitude,
      image_url: imageUrl,
      place_name: incident.place_name || null,
      address: incident.address || null,
      status: 'nuevo',
      created_by: userId,
    })
    .select()
    .single();

  if (insertError) return { data: null, error: insertError };
  return { data: incidentData, error: null };
}

export async function updateIncidentStatus(id: string, status: string, resolvedBy?: string) {
  return await supabase
    .from('incidents')
    .update({
      status,
      resolved_at: status === 'resuelto' ? new Date().toISOString() : null,
      resolved_by: resolvedBy || null,
    })
    .eq('id', id);
}

export type VoteType = 'up' | 'down' | 'resuelta';

export async function voteOnIncident(incidentId: string, voteType: VoteType) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  const userId = session.user.id;

  const { data: existing } = await supabase
    .from('incident_votes')
    .select('id, vote_type')
    .eq('incident_id', incidentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from('incident_votes')
      .insert({ incident_id: incidentId, user_id: userId, vote_type: voteType });
    if (error) return { data: null, error };
  } else if (existing.vote_type !== voteType) {
    const { error } = await supabase
      .from('incident_votes')
      .update({ vote_type: voteType, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) return { data: null, error };
  }

  const { data, error } = await supabase
    .from('incidents_with_stats')
    .select('*')
    .eq('id', incidentId)
    .single();

  return { data, error };
}

export async function getMyVote(incidentId: string) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  return await supabase
    .from('incident_votes')
    .select('vote_type')
    .eq('incident_id', incidentId)
    .eq('user_id', session.user.id)
    .maybeSingle();
}

export async function reportIncident(incidentId: string, reason?: string) {
  const session = await getSession();
  if (!session) return { data: null, error: new Error('No autenticado') };

  const userId = session.user.id;

  const { error } = await supabase
    .from('incident_reports')
    .insert({
      incident_id: incidentId,
      reported_by: userId,
      reason: reason || null,
      status: 'pendiente',
    });

  if (error && error.code === '23505') {
    return { data: null, error: null };
  }

  return { data: null, error };
}

export async function getReportedIncidents() {
  return await supabase
    .from('incident_reports')
    .select('*, incidents(*), reporter:profiles(*)')
    .order('created_at', { ascending: false });
}

export async function updateReportStatus(id: string, status: 'resuelto' | 'rechazado') {
  return await supabase
    .from('incident_reports')
    .update({ status })
    .eq('id', id);
}

export async function getHeatmapData() {
  return await supabase.rpc('get_heatmap_data');
}

export async function findNearbyIncidents(lat: number, lng: number, category?: string, radiusM = 50) {
  return await supabase.rpc('find_nearby_incidents', {
    p_lat: lat,
    p_lng: lng,
    p_radius_m: radiusM,
    p_category: category || null,
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ place_name: string | null; address: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const res = await fetch(url);
    const data = await res.json();
    const address = data?.display_name || null;
    const place_name =
      data?.address?.amenity ||
      data?.address?.building ||
      data?.address?.road ||
      data?.name ||
      address;
    return { place_name: place_name || null, address };
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return { place_name: null, address: null };
  }
}

export async function getUserIncidents(userId: string) {
  return await supabase
    .from('incidents_with_stats')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });
}

export async function getUserActions(userId: string) {
  return await supabase
    .from('incident_votes')
    .select('*, incidents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}
