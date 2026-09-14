import { useState, useEffect, useRef, useCallback } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  watching: boolean;
}

export interface UseGeolocationOptions {
  enableWatch?: boolean;
  highAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export interface UseGeolocationReturn extends GeolocationState {
  getCurrentPosition: () => Promise<void>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  reset: () => void;
}

const getPositionOptions = (options: UseGeolocationOptions): PositionOptions => ({
  enableHighAccuracy: options.highAccuracy ?? true,
  timeout: options.timeout ?? 10000,
  maximumAge: options.maximumAge ?? 0,
});

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    watching: false,
  });

  const watchId = useRef<number | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, []);

  const updateState = useCallback((updates: Partial<GeolocationState>) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const handleError = useCallback((err: GeolocationPositionError | null) => {
    let message = 'No se pudo obtener la ubicación';
    switch (err?.code) {
      case 1: // PERMISSION_DENIED
        message = 'Permiso de ubicación denegado. Actívalo en la configuración de tu navegador.';
        break;
      case 2: // POSITION_UNAVAILABLE
        message = 'Información de ubicación no disponible';
        break;
      case 3: // TIMEOUT
        message = 'Tiempo de espera agotado al obtener ubicación';
        break;
    }
    updateState({ error: message, loading: false, watching: false });
  }, [updateState]);

  const getCurrentPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      handleError({ code: 0, message: 'Geolocalización no soportada en este navegador', timestamp: Date.now() } as unknown as GeolocationPositionError);
      return;
    }

    updateState({ loading: true, error: null });

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateState({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            loading: false,
            error: null,
          });
          resolve();
        },
        (err) => {
          console.error('getCurrentPosition error:', err, err.message);
          handleError(err);
          resolve();
        },
        getPositionOptions(options)
      );
    });
  }, [options, updateState, handleError]);

  const startWatching = useCallback(async () => {
    if (!navigator.geolocation) {
      handleError({ code: 0, message: 'Geolocalización no soportada en este navegador', timestamp: Date.now() } as unknown as GeolocationPositionError);
      return;
    }

    // Clear previous watch if exists
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    updateState({ loading: true, error: null, watching: true });

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        updateState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
          watching: true,
        });
      },
      (err) => {
        handleError(err);
        updateState({ watching: false });
      },
      getPositionOptions(options)
    );
  }, [options, updateState, handleError]);

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    updateState({ watching: false });
  }, [updateState]);

  const reset = useCallback(() => {
    stopWatching();
    updateState({
      latitude: null,
      longitude: null,
      accuracy: null,
      error: null,
      loading: false,
      watching: false,
    });
  }, [stopWatching, updateState]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    reset,
  };
}
