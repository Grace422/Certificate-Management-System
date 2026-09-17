'use client';

import { useCallback, useState } from 'react';
import type { GeoPoint } from '@/lib/types';

interface State {
  position: GeoPoint | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * Browser geolocation, requested explicitly (never on page load — consent
 * matters, and Chrome blocks silent prompts anyway).
 */
export function useGeolocation() {
  const [state, setState] = useState<State>({
    position: null,
    accuracy: null,
    loading: false,
    error: null,
  });

  const request = useCallback((): Promise<GeoPoint | null> => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState((s) => ({ ...s, error: 'Geolocation is not supported by this browser.' }));
      return Promise.resolve(null);
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const position = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setState({ position, accuracy: pos.coords.accuracy, loading: false, error: null });
          resolve(position);
        },
        (err) => {
          const message =
            err.code === err.PERMISSION_DENIED
              ? 'Location permission denied. You can still pick an office manually.'
              : err.code === err.TIMEOUT
                ? 'Timed out while locating you. Try again.'
                : 'Could not determine your location.';
          setState((s) => ({ ...s, loading: false, error: message }));
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
      );
    });
  }, []);

  return { ...state, request };
}
