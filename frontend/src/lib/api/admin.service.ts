import { api, unwrap } from './client';
import { ENDPOINTS } from './endpoints';
import { toPage } from './requests.service';
import type {
  AdminStats,
  CertificateRecord,
  CertificateRequest,
  ImportResult,
  Paginated,
  RequestStatus,
  User,
} from '@/lib/types';

export interface AdminRequestQuery {
  page?: number;
  pageSize?: number;
  status?: RequestStatus | 'ALL';
  search?: string;
  region?: string;
  certificateType?: string;
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const { data } = await api.get(ENDPOINTS.admin.stats);
    return unwrap(data);
  },

  async requests(query: AdminRequestQuery = {}): Promise<Paginated<CertificateRequest>> {
    const { data } = await api.get(ENDPOINTS.admin.requests, {
      params: { ...query, status: query.status === 'ALL' ? undefined : query.status },
    });
    return toPage<CertificateRequest>(unwrap(data), query.page, query.pageSize);
  },

  async requestById(id: string): Promise<CertificateRequest> {
    const { data } = await api.get(ENDPOINTS.admin.requestById(id));
    return unwrap(data);
  },

  /** Run the backend matching algorithm against the archive. */
  async matchRecords(id: string): Promise<CertificateRecord[]> {
    const { data } = await api.post(ENDPOINTS.admin.searchRecords(id), {});
    const payload = unwrap<CertificateRecord[] | { items: CertificateRecord[] }>(data);
    return Array.isArray(payload) ? payload : payload.items;
  },

  async updateStatus(
    id: string,
    status: RequestStatus,
    note?: string,
    matchedRecordId?: string,
  ): Promise<CertificateRequest> {
    const { data } = await api.patch(ENDPOINTS.admin.updateStatus(id), {
      status,
      note,
      matchedRecordId,
    });
    return unwrap(data);
  },

  /** Dispatch the produced document to the municipal building nearest the citizen. */
  async dispatchToOffice(id: string, pickupOfficeId: string, note?: string) {
    const { data } = await api.patch(ENDPOINTS.admin.assignOffice(id), { pickupOfficeId, note });
    return unwrap<CertificateRequest>(data);
  },

  async attachDocument(id: string, file: File, onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(ENDPOINTS.admin.attachDocument(id), form, {
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });
    return unwrap(data);
  },

  async users(query: { page?: number; search?: string } = {}): Promise<Paginated<User>> {
    const { data } = await api.get(ENDPOINTS.admin.users, { params: query });
    return toPage<User>(unwrap(data), query.page);
  },

  async records(query: { page?: number; search?: string } = {}): Promise<Paginated<CertificateRecord>> {
    const { data } = await api.get(ENDPOINTS.admin.records, { params: query });
    return toPage<CertificateRecord>(unwrap(data), query.page);
  },

  /** Bulk import of the civil-status archive. */
  async importRecords(file: File, onProgress?: (pct: number) => void): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(ENDPOINTS.admin.importRecords, form, {
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });
    return unwrap(data);
  },
};
