import { http } from '../../infrastructure/api/http';
import { catalogSchema, detailSchema } from './schemas';

export async function loadCatalog(signal?: AbortSignal) {
  const response = await http.get<unknown>('/papers', signal ? { signal } : {});
  return catalogSchema.parse(response.data);
}

export async function loadDetail(id: string, corpusVersion: string, signal?: AbortSignal) {
  const response = await http.get<unknown>(`/papers/${encodeURIComponent(id)}`, signal ? { signal } : {});
  const detail = detailSchema.parse(response.data);
  if (detail.id !== id || detail.corpusVersion !== corpusVersion) {
    throw new Error('Paper identity or corpus version does not match the catalog.');
  }
  return detail;
}
