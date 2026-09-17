'use client';

import useSWR, { type SWRConfiguration } from 'swr';
import { ApiError } from '@/lib/api/client';

/**
 * Thin SWR wrapper used by every read in the app.
 *
 * Why SWR rather than useEffect + setState: it deduplicates concurrent
 * requests, caches per key, revalidates on focus/reconnect, and keeps the
 * React Compiler happy (no setState inside effects).
 *
 * `key` is null when the request should not run yet (e.g. missing id).
 */
export function useApi<T>(
  key: string | readonly unknown[] | null,
  fetcher: () => Promise<T>,
  options?: SWRConfiguration<T, ApiError>,
) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T, ApiError>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false, // our interceptor already handles 401 refresh
      keepPreviousData: true,    // avoids list flicker while filters change
      ...options,
    },
  );

  return {
    data,
    error: error ? error.message : null,
    apiError: error,
    loading: isLoading,
    validating: isValidating,
    /** Re-fetch this key (e.g. after a mutation). */
    reload: mutate,
    mutate,
  };
}
