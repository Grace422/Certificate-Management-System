import { api, unwrap } from './client';
import { ENDPOINTS } from './endpoints';
import { sortByDistance } from '@/lib/geo';
import type { MunicipalOffice, Region } from '@/lib/types';

export const officesService = {
  async list(params?: { region?: Region; search?: string }): Promise<MunicipalOffice[]> {
    const { data } = await api.get(ENDPOINTS.offices.list, { params });
    const payload = unwrap<MunicipalOffice[] | { items: MunicipalOffice[] }>(data);
    return Array.isArray(payload) ? payload : payload.items;
  },

  async byId(id: string): Promise<MunicipalOffice> {
    const { data } = await api.get(ENDPOINTS.offices.byId(id));
    return unwrap(data);
  },

  /**
   * Nearest municipal buildings to a coordinate.
   * Falls back to client-side haversine sorting if the backend has no
   * /offices/nearest route yet — so the UI works either way.
   */
  async nearest(latitude: number, longitude: number, limit = 5): Promise<MunicipalOffice[]> {
    try {
      const { data } = await api.get(ENDPOINTS.offices.nearest, {
        params: { lat: latitude, lng: longitude, limit },
      });
      const payload = unwrap<MunicipalOffice[] | { items: MunicipalOffice[] }>(data);
      return Array.isArray(payload) ? payload : payload.items;
    } catch {
      const all = await officesService.list();
      return sortByDistance(all, { latitude, longitude }).slice(0, limit);
    }
  },

  async create(payload: Omit<MunicipalOffice, 'id'>): Promise<MunicipalOffice> {
    const { data } = await api.post(ENDPOINTS.offices.create, payload);
    return unwrap(data);
  },

  async update(id: string, payload: Partial<MunicipalOffice>): Promise<MunicipalOffice> {
    const { data } = await api.put(ENDPOINTS.offices.update(id), payload);
    return unwrap(data);
  },

  async remove(id: string): Promise<void> {
    await api.delete(ENDPOINTS.offices.remove(id));
  },

  /** Bulk-load your municipal-building dataset (CSV/XLSX). */
  async importCsv(file: File, onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(ENDPOINTS.offices.importCsv, form, {
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
    });
    return unwrap(data);
  },
};
