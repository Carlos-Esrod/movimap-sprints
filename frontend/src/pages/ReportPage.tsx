import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '@/components/map/MapView';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import { Input, Textarea } from '@/components/ui/Input';
import Alert from '@/components/ui/Alert';
import SeveritySelector from '@/components/reports/SeveritySelector';
import EvidenceUploader from '@/components/reports/EvidenceUploader';
import Icon from '@/components/ui/Icon';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createIncident, findNearbyIncidents, reverseGeocode, voteOnIncident } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, DURATION_OPTIONS, DESCRIPTION_MAX_LENGTH, PHOTO_MAX_SIZE_BYTES, PHOTO_ACCEPTED_TYPES, isInsideZone, CENTER } from '@/lib/constants';
import type { Profile, NearbyIncident } from '@/types';

interface ReportPageProps {
  profile: Profile;
}

function ReportPage({ profile }: ReportPageProps) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<number | null>(null);
  const [observedAt, setObservedAt] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [locationMethod, setLocationMethod] = useState<'none' | 'gps' | 'map'>('none');
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [nearbyIncidents, setNearbyIncidents] = useState<NearbyIncident[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [nearbyDismissed, setNearbyDismissed] = useState(false);
  const navigate = useNavigate();

  const {
    latitude: gpsLat,
    longitude: gpsLon,
    loading: gpsLoading,
    error: gpsHookError,
    getCurrentPosition,
  } = useGeolocation({ enableWatch: false });

  useEffect(() => {
    if (gpsHookError) setGpsError(gpsHookError);
  }, [gpsHookError]);

  useEffect(() => {
    if (gpsLat !== null && gpsLon !== null && latitude === null) {
      setLatitude(gpsLat);
      setLongitude(gpsLon);
      setGpsError(null);
    }
  }, [gpsLat, gpsLon, latitude]);

  const mapCenter: [number, number] = (latitude && longitude) ? [latitude, longitude] : CENTER;

  useEffect(() => {
    if (latitude === null || longitude === null) return;
    let active = true;
    const timer = setTimeout(async () => {
      const place = await reverseGeocode(latitude, longitude);
      if (!active) return;
      setPlaceName(place.place_name);
      setAddress(place.address);
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [latitude, longitude]);

  useEffect(() => {
    if (latitude === null || longitude === null || !category) return;
    if (nearbyDismissed) return;
    let active = true;
    setNearbyLoading(true);
    const timer = setTimeout(async () => {
      const { data } = await findNearbyIncidents(latitude, longitude, category, 100);
      if (active) setNearbyIncidents(data || []);
      if (active) setNearbyLoading(false);
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [latitude, longitude, category, nearbyDismissed]);

  const handleConfirmNearby = async (incident: NearbyIncident) => {
    if (profile) {
      await voteOnIncident(incident.id, 'up');
    }
    navigate(`/incident/${incident.id}`);
  };

  useEffect(() => {
    setNearbyDismissed(false);
    setNearbyIncidents([]);
  }, [latitude, longitude, category]);

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setGpsError(null);
    if (isMapFullscreen) setIsMapFullscreen(false);
  };

  const handleUseGpsLocation = async () => {
    setLocationMethod('gps');
    await getCurrentPosition();
  };

  const handleUseMapSelection = () => {
    setLocationMethod('map');
    setIsMapFullscreen(true);
  };

  const handleImageChange = (file: File) => {
    if (!PHOTO_ACCEPTED_TYPES.includes(file.type)) {
      setImageError('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (file.size > PHOTO_MAX_SIZE_BYTES) {
      setImageError('La imagen no puede superar los 2MB');
      return;
    }
    setImageError('');
    setImage(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!category || !description || severity === null || !observedAt || !estimatedDuration || latitude === null || longitude === null) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (description.length > DESCRIPTION_MAX_LENGTH) {
      setError(`La descripción no puede superar los ${DESCRIPTION_MAX_LENGTH} caracteres`);
      return;
    }
    if (!isInsideZone(latitude, longitude)) {
      setError('Los reportes solo se aceptan dentro del área piloto de Providencia');
      return;
    }

    setLoading(true);

    const { data: incidentData, error } = await createIncident({
      category,
      description,
      severity,
      observed_at: observedAt,
      estimated_duration: estimatedDuration,
      latitude,
      longitude,
      image: image || undefined,
      created_by: profile.id,
      place_name: placeName,
      address,
    });

    if (error) {
      setError(error.message);
    } else if (incidentData) {
      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    }

    setLoading(false);
  };

  const inZone = latitude && longitude ? isInsideZone(latitude, longitude) : null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-sm text-center p-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-secondary-fixed-dim/40 flex items-center justify-center">
            <Icon name="share" size={30} className="text-on-surface" />
          </div>
          <h2 className="mt-4 text-headline-md font-bold text-on-surface">Reporte creado exitosamente</h2>
          <p className="mt-2 text-body-md text-on-surface-variant">Tu reporte ha sido registrado y será revisado por la comunidad.</p>
        </Card>
      </div>
    );
  }

  const locationSection = (
    <div className="space-y-4">
      <h3 className="text-label-md font-semibold text-on-surface">¿Dónde ocurrió la incidencia? *</h3>

      {locationMethod === 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleUseGpsLocation}
            disabled={gpsLoading}
            className="p-4 border-2 border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <Icon name="locate" className="text-primary" size={28} />
            <span className="text-label-md font-semibold text-on-surface">En mi ubicación</span>
            <span className="text-label-sm text-on-surface-variant text-center">Usar GPS del dispositivo</span>
          </button>
          <button
            type="button"
            onClick={handleUseMapSelection}
            className="p-4 border-2 border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors flex flex-col items-center gap-2"
          >
            <Icon name="map" className="text-on-surface-variant" size={28} />
            <span className="text-label-md font-semibold text-on-surface">En el mapa</span>
            <span className="text-label-sm text-on-surface-variant text-center">Seleccionar punto en el mapa</span>
          </button>
        </div>
      )}

      {locationMethod === 'gps' && (
        <div>
          {gpsError && <Alert tone="error" className="mb-3">{gpsError}</Alert>}
          <Button type="button" variant="outline" onClick={handleUseGpsLocation} disabled={gpsLoading} fullWidth className="mb-3">
            <Icon name="locate" size={18} /> {gpsLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
          </Button>
          {latitude && longitude && (
            <div className="bg-surface-container rounded-lg p-3">
              <p className={`text-label-md font-semibold ${inZone ? 'text-on-surface' : 'text-secondary'}`}>
                {inZone ? 'Dentro de zona' : 'Fuera de zona piloto'}
              </p>
              <p className="text-label-sm text-on-surface-variant">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
            </div>
          )}
          <button type="button" onClick={() => setLocationMethod('none')} className="mt-2 text-label-sm text-on-surface-variant hover:text-on-surface">
            ← Cambiar método
          </button>
        </div>
      )}

      {locationMethod === 'map' && !isMapFullscreen && (
        <div>
          <p className="text-label-sm text-on-surface-variant mb-2">Toca el mapa para seleccionar la ubicación exacta</p>
          {latitude && longitude && (
            <div className="bg-surface-container rounded-lg p-3">
              <p className={`text-label-md font-semibold ${inZone ? 'text-on-surface' : 'text-secondary'}`}>
                {inZone ? 'Dentro de zona' : 'Fuera de zona piloto'}
              </p>
              <p className="text-label-sm text-on-surface-variant">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
            </div>
          )}
          <button type="button" onClick={() => setLocationMethod('none')} className="mt-2 text-label-sm text-on-surface-variant hover:text-on-surface">
            ← Cambiar método
          </button>
        </div>
      )}
    </div>
  );

  const mapSection = (
    <div className="space-y-4">
      <h3 className="text-label-md font-semibold text-on-surface">Ubicación exacta</h3>
      <Input label="Dirección" placeholder="Escribe la dirección" hint="Opcional" />
      <div className="h-64 lg:h-80 rounded-lg overflow-hidden border border-outline-variant">
        <MapView
          center={mapCenter}
          zoom={15}
          onLocationSelect={handleLocationSelect}
          selectedLocation={latitude && longitude ? [latitude, longitude] : null}
          interactive
          showLocationControls={false}
        />
      </div>

      <div>
        <h3 className="text-label-md font-semibold text-on-surface mb-3">Evidencia fotográfica</h3>
        <EvidenceUploader image={image} error={imageError} onChange={handleImageChange} onClear={() => { setImage(null); setImageError(''); }} />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {isMapFullscreen && (
        <div className="fixed inset-0 z-[5000] lg:hidden">
          <div className="absolute inset-0">
            <MapView
              center={mapCenter}
              zoom={15}
              onLocationSelect={handleLocationSelect}
              selectedLocation={latitude && longitude ? [latitude, longitude] : null}
              interactive
              showLocationControls={false}
            />
          </div>
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center justify-between">
              <p className="text-white font-medium text-sm">Selecciona la ubicación en el mapa</p>
              <button type="button" onClick={() => setIsMapFullscreen(false)} className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition">
                <Icon name="close" />
              </button>
            </div>
          </div>
          {latitude && longitude && (
            <div className="absolute bottom-4 left-4 right-4 lg:hidden z-10">
              <div className="bg-surface-container-lowest rounded-lg shadow-elevation-soft p-3">
                <p className={`text-label-md font-semibold ${inZone ? 'text-on-surface' : 'text-secondary'}`}>
                  {inZone ? 'Dentro de zona' : 'Fuera de zona piloto'}
                </p>
                <p className="text-label-sm text-on-surface-variant mt-1">{latitude.toFixed(5)}, {longitude.toFixed(5)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full lg:w-1/2 p-4 md:p-6 pb-24 lg:pb-6 overflow-y-auto">
        {error && <Alert tone="error" className="mb-4">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {locationSection}

          {nearbyLoading && (
            <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
              Buscando reportes cercanos...
            </div>
          )}

          {!nearbyLoading && !nearbyDismissed && nearbyIncidents.length > 0 && (
            <div className="rounded-xl border border-secondary-container bg-secondary-container/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon name="alert" size={18} className="text-secondary" />
                <h3 className="font-semibold text-on-surface">Esto ya fue reportado cerca</h3>
              </div>
              <p className="text-label-sm text-on-surface-variant">
                En un radio de 100 m ya existe {nearbyIncidents.length === 1 ? 'un reporte' : `${nearbyIncidents.length} reportes`} de esta categoría.
                Confirma el existente en lugar de crear un duplicado.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nearbyIncidents.map(n => (
                  <div key={n.id} className="rounded-lg bg-surface-container-lowest border border-outline-variant p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-label-md font-semibold text-on-surface truncate">
                          {INCIDENT_CATEGORIES.find(c => c.value === n.category)?.label || n.category}
                        </p>
                        {n.place_name && <p className="text-label-sm text-on-surface-variant truncate">{n.place_name}</p>}
                        <p className="text-label-sm text-on-surface-variant">
                          👍 {n.votes_up} · {Math.round(n.distance_m)} m · {n.description.substring(0, 60)}...
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConfirmNearby(n)}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-secondary text-white text-label-sm font-semibold hover:opacity-90 transition"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setNearbyDismissed(true); setNearbyIncidents([]); }}
                className="text-label-sm text-on-surface-variant hover:text-on-surface underline"
              >
                Crear de todos modos
              </button>
            </div>
          )}

          <div className="space-y-4">
            <Select
              label="Categoría *"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Selecciona una categoría</option>
              {INCIDENT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>

            <div>
              <Textarea
                label="Descripción *"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe la incidencia con detalle..."
                hint={`${description.length}/${DESCRIPTION_MAX_LENGTH} caracteres`}
                required
              />
              <p className="mt-4 text-label-md font-semibold text-on-surface">Severidad *</p>
              <div className="mt-2">
                <SeveritySelector value={severity} onChange={setSeverity} />
              </div>
            </div>

            <Input
              label="Fecha de observación *"
              type="date"
              value={observedAt}
              onChange={(e) => setObservedAt(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />

            <Select
              label="Duración estimada *"
              value={estimatedDuration}
              onChange={(e) => setEstimatedDuration(e.target.value)}
              required
            >
              <option value="">Selecciona una opción</option>
              {DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </div>

          <div className="lg:hidden">{mapSection}</div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            disabled={!category || !description || severity === null || !observedAt || !estimatedDuration || !latitude || !longitude}
            className="mt-2"
          >
            <Icon name="report" size={18} /> Enviar reporte
          </Button>
        </form>
      </div>

      <div className="hidden lg:block w-1/2 p-6 overflow-y-auto border-l border-outline-variant">
        {mapSection}
      </div>
    </div>
  );
}

export default ReportPage;
