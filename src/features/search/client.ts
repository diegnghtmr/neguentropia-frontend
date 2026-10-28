import { http } from '../../infrastructure/api/http';
import { searchSchema, type SearchRequest } from './schemas';

export async function searchPapers(request: SearchRequest, signal?: AbortSignal) {
  const response = await http.post<unknown>('/search', request, signal ? { signal } : {});
  return searchSchema.parse(response.data);
}
