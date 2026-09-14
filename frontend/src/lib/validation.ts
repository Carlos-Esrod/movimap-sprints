import { supabase } from './supabase';
import { ZONE_BOUNDS, DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH, NOMINATIM_URL, NOMINATIM_LIMIT, PHOTO_MAX_SIZE_BYTES, PHOTO_ACCEPTED_TYPES } from './constants';
import type { IncidentCategory, SeverityLevel, DurationOption } from '@/types';
import { z } from 'zod';

export const incidentFormSchema = z.object({
  category: z.enum(['vereda_cortada', 'vereda_deteriorada', 'rampa_bloqueada', 'rampa_inexistente', 'obstaculo_fisico', 'ascensor_fuera_servicio', 'falta_iluminacion', 'otro']),
  description: z.string().min(DESCRIPTION_MIN_LENGTH).max(DESCRIPTION_MAX_LENGTH),
  severity: z.enum(['1', '2', '3']).transform(Number),
  observed_at: z.string(),
  estimated_duration: z.enum(['temporal', 'permanente']),
  latitude: z.number().min(ZONE_BOUNDS.minLat).max(ZONE_BOUNDS.maxLat),
  longitude: z.number().min(ZONE_BOUNDS.minLng).max(ZONE_BOUNDS.maxLng),
  image: z.instanceof(File).optional().nullable(),
});

export const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(2),
});

export async function searchAddress(query: string) {
  if (query.length < 3) return [];

  const { data, error } = await fetch(
    `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=${NOMINATIM_LIMIT}&countrycodes=cl`
  ).then(r => r.json());

  if (error) return [];
  return data;
}

export async function createIncident(data: {
  category: string;
  description: string;
  severity: number;
  observed_at: string;
  estimated_duration: string;
  latitude: number;
  longitude: number;
  image?: File;
}) {
  const { data: incidentData, error: incidentError } = await supabase
    .from('incidents')
    .insert({
      category: data.category,
      description: data.description,
      severity: data.severity,
      observed_at: data.observed_at,
      estimated_duration: data.estimated_duration,
      latitude: data.latitude,
      longitude: data.longitude,
      status: 'nuevo',
    })
    .select()
    .single();

  if (incidentError) return { error: incidentError };

  if (data.image) {
    const fileName = `${Date.now()}-${data.image.name}`;
    const { error: uploadError } = await supabase.storage
      .from('incident-photos')
      .upload(fileName, data.image);

    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage
        .from('incident-photos')
        .getPublicUrl(fileName);

      await supabase
        .from('incidents')
        .update({ image_url: publicUrl })
        .eq('id', incidentData.id);
    }
  }

  return { error: null, data: incidentData };
}

export function validateImage(file: File | null): string | null {
  if (!file) return null;
  if (!PHOTO_ACCEPTED_TYPES.includes(file.type)) {
    return 'Solo se permiten imágenes JPG, PNG o WebP';
  }
  if (file.size > PHOTO_MAX_SIZE_BYTES) {
    return 'La imagen no puede superar los 2MB';
  }
  return null;
}
