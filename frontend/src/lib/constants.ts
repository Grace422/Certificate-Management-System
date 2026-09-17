import type { CertificateType, Region, RequestStatus, RequestType } from './types';

export const REGIONS: Region[] = [
  'Adamawa',
  'Centre',
  'East',
  'Far North',
  'Littoral',
  'North',
  'North West',
  'South',
  'South West',
  'West',
];

/** Regional capitals — handy for map centring and demo data. */
export const REGION_CAPITALS: Record<Region, { city: string; latitude: number; longitude: number }> = {
  Adamawa: { city: 'Ngaoundéré', latitude: 7.3167, longitude: 13.5833 },
  Centre: { city: 'Yaoundé', latitude: 3.848, longitude: 11.5021 },
  East: { city: 'Bertoua', latitude: 4.5774, longitude: 13.6846 },
  'Far North': { city: 'Maroua', latitude: 10.5956, longitude: 14.3247 },
  Littoral: { city: 'Douala', latitude: 4.0511, longitude: 9.7679 },
  North: { city: 'Garoua', latitude: 9.3017, longitude: 13.3921 },
  'North West': { city: 'Bamenda', latitude: 5.9597, longitude: 10.1459 },
  South: { city: 'Ebolowa', latitude: 2.9, longitude: 11.15 },
  'South West': { city: 'Buea', latitude: 4.1527, longitude: 9.241 },
  West: { city: 'Bafoussam', latitude: 5.4737, longitude: 10.4179 },
};

export const CERTIFICATE_TYPES: { value: CertificateType; label: string }[] = [
  { value: 'BIRTH', label: 'Birth certificate' },
  { value: 'DEATH', label: 'Death certificate' },
  { value: 'MARRIAGE', label: 'Marriage certificate' },
];

export const REQUEST_TYPES: { value: RequestType; label: string; hint: string }[] = [
  {
    value: 'COPY',
    label: 'Request a copy',
    hint: 'You need an additional certified copy of an existing certificate.',
  },
  {
    value: 'LOSS_DECLARATION',
    label: 'Declare a loss',
    hint: 'Your certificate was lost, stolen or destroyed and must be replaced.',
  },
];

export const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under review',
  APPROVED: 'Approved',
  DISPATCHED: 'Dispatched',
  READY: 'Ready for pickup',
  COLLECTED: 'Collected',
  REJECTED: 'Rejected',
};

/** Tailwind classes per status — used by <Badge/> and the timeline. */
export const STATUS_STYLE: Record<RequestStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  DISPATCHED: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  READY: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  COLLECTED: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  REJECTED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

/** Ordered lifecycle used by the progress stepper. */
export const STATUS_FLOW: RequestStatus[] = [
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'DISPATCHED',
  'READY',
  'COLLECTED',
];
