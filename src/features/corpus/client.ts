import { http } from '../../infrastructure/api/http';
import { catalogSchema, detailSchema } from './schemas';

async function requestCatalog() {
  const response = await http.get<unknown>('/papers');
  return catalogSchema.parse(response.data);
}

let catalogRequest: ReturnType<typeof requestCatalog> | null = null;

export function loadCatalog() {
  if (catalogRequest === null) {
    const request = requestCatalog();
    catalogRequest = request;
    request.catch(() => {
      if (catalogRequest === request) catalogRequest = null;
    });
  }
  return catalogRequest;
}

export function forgetPapers() {
  catalogRequest = null;
  details.clear();
}

const details = new Map<string, ReturnType<typeof detailSchema.parse>>();

export async function loadDetail(id: string, signal?: AbortSignal) {
  const known = details.get(id);
  if (known) return known;
  const response = await http.get<unknown>(`/papers/${encodeURIComponent(id)}`, signal ? { signal } : {});
  const detail = detailSchema.parse(response.data);
  if (detail.id !== id) {
    throw new Error('Paper identity does not match the catalog.');
  }
  details.set(id, detail);
  return detail;
}
