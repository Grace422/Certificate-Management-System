'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui';

/**
 * Leaflet touches `window` at import time, so the real map is loaded
 * client-side only. Import THIS component everywhere, never the Inner one.
 */
const OfficeMap = dynamic(() => import('./OfficeMapInner'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full rounded-xl" />,
});

export default OfficeMap;
