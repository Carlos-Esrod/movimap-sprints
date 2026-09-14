import { useEffect, useState } from 'react';
import L from 'leaflet';
import { useMap, useMapEvents } from 'react-leaflet';
import { Marker } from 'react-leaflet';
import { isInsideZone } from '@/lib/constants';

interface LocationControlsProps {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  loading: boolean;
  error: string | null;
  watching: boolean;
  onGetCurrentPosition: () => Promise<void>;
  onStartWatching: () => Promise<void>;
  onStopWatching: () => void;
}

const locationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="18" fill="#3b82f6" stroke="white" stroke-width="3"/>
      <circle cx="24" cy="24" r="7" fill="white"/>
    </svg>
  `),
  iconSize: [48, 48],
  popupAnchor: [0, -24],
});

const locationIconFollowing = new L.Icon({
  iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="18" fill="#10b981" stroke="white" stroke-width="3"/>
      <circle cx="24" cy="24" r="7" fill="white"/>
    </svg>
  `),
  iconSize: [48, 48],
  popupAnchor: [0, -24],
});

function LocationMarkerComponent({ lat, lng, icon }: { lat: number; lng: number; icon: L.Icon }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);

  return (
    <Marker position={[lat, lng]} icon={icon}>
      <div className="p-2 text-sm">
        <p className="font-medium">Tu ubicación</p>
      </div>
    </Marker>
  );
}

function UpdateIcon({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function FollowIcon({ watching }: { watching: boolean }) {
  if (watching) {
    return (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
      </svg>
    );
  }
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9" />
    </svg>
  );
}

function MyLocationIcon({ loading }: { loading: boolean }) {
  if (loading) {
    return (
      <svg className="w-7 h-7 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }
  return (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LocationControlsInner({
  latitude,
  longitude,
  loading,
  error,
  watching,
  onGetCurrentPosition,
  onStartWatching,
  onStopWatching,
}: LocationControlsProps) {
  const inZone = isInsideZone(latitude ?? 0, longitude ?? 0);

  return (
    <>
      {watching && (
        <LocationMarkerComponent lat={latitude!} lng={longitude!} icon={locationIconFollowing} />
      )}
      {!watching && (
        <LocationMarkerComponent lat={latitude!} lng={longitude!} icon={locationIcon} />
      )}

      <div className="leaflet-gps-controls flex flex-col gap-3">
        <button
          onClick={() => onGetCurrentPosition()}
          className={`gps-action-btn ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          disabled={loading}
          title="Actualizar ubicación"
        >
          <UpdateIcon loading={loading} />
          <span className="whitespace-nowrap">Actualizar</span>
        </button>

        <button
          onClick={watching ? onStopWatching : onStartWatching}
          className={`gps-follow-btn ${watching ? 'gps-follow-active' : ''}`}
          title={watching ? 'Dejar de seguir ubicación' : 'Seguir ubicación en tiempo real'}
        >
          <FollowIcon watching={watching} />
          <span className="whitespace-nowrap">{watching ? 'Siguiendo' : 'Seguir'}</span>
        </button>

        <div className={`gps-status-btn ${inZone ? 'gps-status-ok' : 'gps-status-warning'}`}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{inZone ? '✅' : '⚠️'}</span>
            <span>{inZone ? 'Dentro de zona' : 'Fuera de zona'}</span>
          </div>
        </div>
      </div>
    </>
  );
}

function LocationControls({
  latitude,
  longitude,
  loading,
  error,
  watching,
  onGetCurrentPosition,
  onStartWatching,
  onStopWatching,
}: LocationControlsProps) {
  if (!latitude || !longitude) {
    return (
      <div className="leaflet-gps-controls">
        <button
          onClick={() => onGetCurrentPosition()}
          className={`gps-action-btn ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          } ${error ? 'gps-error' : ''}`}
          disabled={loading}
          title={error || 'Centrar en mi ubicación'}
        >
          <MyLocationIcon loading={loading} />
          <span className="whitespace-nowrap">{loading ? 'Obteniendo...' : error ? 'Error GPS' : 'Mi ubicación'}</span>
        </button>
      </div>
    );
  }

  return (
    <LocationControlsInner
      latitude={latitude}
      longitude={longitude}
      loading={loading}
      error={error}
      watching={watching}
      onGetCurrentPosition={onGetCurrentPosition}
      onStartWatching={onStartWatching}
      onStopWatching={onStopWatching}
    />
  );
}

export default LocationControls;
