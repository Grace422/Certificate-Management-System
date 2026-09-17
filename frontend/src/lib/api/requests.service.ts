import { api, unwrap } from './client';
import { ENDPOINTS } from './endpoints';
import type {
  CertificateRequest,
  CertificateType,
  Paginated,
  RequestEvent,
  RequestStatus,
  RequestType,
} from '@/lib/types';

export interface CreateRequestPayload {
  requestType: RequestType;
  certificateType: CertificateType;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  fatherName?: string;
  motherName?: string;
  certificateNumber?: string;
  copies: number;
  reason?: string;
  requesterLatitude?: number;
  requesterLongitude?: number;
  /** Office the citizen prefers to collect from (defaults to nearest). */
  pickupOfficeId?: string;
}

export interface RequestQuery {
  page?: number;
  pageSize?: number;
  status?: RequestStatus | 'ALL';
  search?: string;
}

/** Tolerates both `{items,total}` and a bare array from the backend. */
function toPage<T>(payload: unknown, page = 1, pageSize = 10): Paginated<T> {
  if (Array.isArray(payload)) {
    return { items: payload as T[], total: payload.length, page, pageSize, totalPages: 1 };
  }
  const p = payload as Partial<Paginated<T>> & { rows?: T[]; count?: number };
  const items = p.items ?? p.rows ?? [];
  const total = p.total ?? p.count ?? items.length;
  return {
    items,
    total,
    page: p.page ?? page,
    pageSize: p.pageSize ?? pageSize,
    totalPages: p.totalPages ?? Math.max(1, Math.ceil(total / (p.pageSize ?? pageSize))),
  };
}

export const requestsService = {
  async list(query: RequestQuery = {}): Promise<Paginated<CertificateRequest>> {
    const { data } = await api.get(ENDPOINTS.requests.list, {
      params: { ...query, status: query.status === 'ALL' ? undefined : query.status },
    });
    return toPage<CertificateRequest>(unwrap(data), query.page, query.pageSize);
  },

  async create(payload: CreateRequestPayload): Promise<CertificateRequest> {
    const { data } = await api.post(ENDPOINTS.requests.create, payload);
    return unwrap(data);
  },

  async byId(id: string): Promise<CertificateRequest> {
    const { data } = await api.get(ENDPOINTS.requests.byId(id));
    return unwrap(data);
  },

  async track(reference: string): Promise<CertificateRequest> {
    const { data } = await api.get(ENDPOINTS.requests.track(reference));
    return unwrap(data);
  },

  async cancel(id: string): Promise<CertificateRequest> {
    const { data } = await api.patch(ENDPOINTS.requests.cancel(id), {});
    return unwrap(data);
  },

  async timeline(id: string): Promise<RequestEvent[]> {
    const { data } = await api.get(ENDPOINTS.requests.timeline(id));
    return unwrap(data);
  },

  /** Upload supporting documents (ID card scan, police declaration, ...). */
  async uploadAttachments(id: string, files: File[], onProgress?: (pct: number) => void) {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const { data } = await api.post(ENDPOINTS.requests.attachments(id), form, {
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });
    return unwrap(data);
  },

  /** Streams the issued PDF. */
  async downloadDocument(id: string): Promise<Blob> {
    const { data } = await api.get(ENDPOINTS.requests.download(id), { responseType: 'blob' });
    return data as Blob;
  },
};

export { toPage };
