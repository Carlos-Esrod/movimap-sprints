import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '@/components/map/MapView';
import NavBar from '@/components/NavBar';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createIncident, signOut } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, SEVERITY_LEVELS, DURATION_OPTIONS, DESCRIPTION_MIN_LENGTH, DESCRIPTION_MAX_LENGTH, PHOTO_MAX_SIZE_BYTES, PHOTO_ACCEPTED_TYPES, isInsideZone, CENTER } from '@/lib/constants';
import type { Profile, Incident } from '@/types';

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
  const navigate = useNavigate();

  function handleLogout() {
    signOut();
    window.location.reload();
  }

  const {
    latitude: gpsLat,
    longitude: gpsLon,
    loading: gpsLoading,
    error: gpsHookError,
    getCurrentPosition,
  } = useGeolocation({ enableWatch: false });

  useEffect(() => {
    if (gpsHookError) {
      setGpsError(gpsHookError);
    }
  }, [gpsHookError]);

  useEffect(() => {
    if (gpsLat !== null && gpsLon !== null && latitude === null) {
      setLatitude(gpsLat);
      setLongitude(gpsLon);
      setGpsError(null);
    }
  }, [gpsLat, gpsLon, latitude]);

  const mapCenter: [number, number] = (latitude && longitude) ? [latitude, longitude] : CENTER;

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setGpsError(null);
    if (isMapFullscreen) {
      setIsMapFullscreen(false);
    }
  };

  const handleUseGpsLocation = async () => {
    setLocationMethod('gps');
    await getCurrentPosition();
  };

  const handleUseMapSelection = () => {
    setLocationMethod('map');
    setIsMapFullscreen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      setImageError('');
      return;
    }

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

    if (description.length < DESCRIPTION_MIN_LENGTH || description.length > DESCRIPTION_MAX_LENGTH) {
      setError(`La descripción debe tener entre ${DESCRIPTION_MIN_LENGTH} y ${DESCRIPTION_MAX_LENGTH} caracteres`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h2 className="mt-4 text-2xl font-bold text-gray-800">Reporte creado exitosamente</h2>
          <p className="mt-2 text-gray-600">Tu reporte ha sido registrado y será revisado por la comunidad.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavBar profile={profile} onLogout={handleLogout} />

      {isMapFullscreen && (
        <div className="fixed inset-0 z-[5000] md:hidden">
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
              <button
                type="button"
                onClick={() => setIsMapFullscreen(false)}
                className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/30 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          {latitude && longitude && (
            <div className="absolute bottom-4 left-4 right-4 md:hidden z-10">
              <div className="bg-white rounded-lg shadow-lg p-3">
                <p className={`text-sm font-medium ${inZone ? 'text-green-700' : 'text-red-700'}`}>
                  {inZone ? '✅ Dentro de zona' : '⚠️ Fuera de zona piloto'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-1/2 p-4 overflow-y-auto bg-white">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">¿Dónde ocurrió la incidencia? *</label>
              
              {locationMethod === 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleUseGpsLocation}
                    disabled={gpsLoading}
                    className="p-4 border-2 border-blue-200 rounded-xl hover:bg-blue-50 hover:border-blue-400 transition-all flex flex-col items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">En mi ubicación</span>
                    <span className="text-xs text-gray-500 text-center">Usar GPS del dispositivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleUseMapSelection}
                    className="p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all flex flex-col items-center gap-2"
                  >
                    <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 2.5l8.5 5.5v9L12 22.5l-8.5-5.5v-9L12 2.5z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">En el mapa</span>
                    <span className="text-xs text-gray-500 text-center">Seleccionar punto en el mapa</span>
                  </button>
                </div>
              )}

              {locationMethod === 'gps' && (
                <div>
                  {gpsError && (
                    <p className="text-xs text-red-500 mb-3">{gpsError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleUseGpsLocation}
                    disabled={gpsLoading}
                    className="w-full px-3 py-2.5 bg-blue-50 border border-blue-200 text-blue-600 text-sm rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2 disabled:opacity-50 mb-3"
                  >
                    {gpsLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Obteniendo ubicación...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                        Usar mi ubicación actual
                      </>
                    )}
                  </button>
                  {latitude && longitude && (
                    <div className="space-y-1 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className={`text-sm font-medium ${inZone ? 'text-green-700' : 'text-red-700'}`}>
                        {inZone ? '✅ Dentro de zona' : '⚠️ Fuera de zona piloto'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setLocationMethod('none')}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ← Cambiar método
                  </button>
                </div>
              )}

              {locationMethod === 'map' && !isMapFullscreen && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Toca el mapa para seleccionar la ubicación exacta</p>
                  {latitude && longitude && (
                    <div className="space-y-1 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className={`text-sm font-medium ${inZone ? 'text-green-700' : 'text-red-700'}`}>
                        {inZone ? '✅ Dentro de zona' : '⚠️ Fuera de zona piloto'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {latitude.toFixed(5)}, {longitude.toFixed(5)}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setLocationMethod('none')}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                  >
                    ← Cambiar método
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona una categoría</option>
                {INCIDENT_CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe la incidencia con detalle..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">{description.length}/{DESCRIPTION_MAX_LENGTH} caracteres (mínimo {DESCRIPTION_MIN_LENGTH})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severidad *</label>
              <div className="space-y-2">
                {SEVERITY_LEVELS.map(level => (
                  <label key={level.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="severity"
                      checked={severity === level.value}
                      onChange={() => setSeverity(level.value)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium">{level.label}</span>
                      <span className="text-xs text-gray-500 ml-2">({level.description})</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de observación *</label>
              <input
                type="date"
                value={observedAt}
                onChange={(e) => setObservedAt(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duración estimada *</label>
              <select
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecciona una opción</option>
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fotografía (opcional)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Máx. 2MB. JPG, PNG o WebP</p>
              {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
              {image && (
                <p className="text-xs text-green-600 mt-1">✅ {image.name} ({(image.size / 1024 / 1024).toFixed(2)} MB)</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !category || !description || severity === null || !observedAt || !estimatedDuration || !latitude || !longitude}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {loading ? 'Enviando...' : 'Enviar reporte'}
            </button>
          </form>
        </div>

        {locationMethod === 'map' && (
          <div className="hidden md:block w-full lg:w-1/2 h-96 lg:h-auto">
            <MapView
              center={mapCenter}
              zoom={15}
              onLocationSelect={handleLocationSelect}
              selectedLocation={latitude && longitude ? [latitude, longitude] : null}
              interactive
              showLocationControls={false}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportPage;
