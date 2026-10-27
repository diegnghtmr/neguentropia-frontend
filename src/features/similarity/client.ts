import { http } from '../../infrastructure/api/http';
import { similaritySchema, type SimilarityRequest } from './schemas';

export async function loadSimilarity(request: SimilarityRequest, signal?: AbortSignal) {
  const response = await http.post<unknown>('/similarity', request, signal ? { signal } : {});
  return similaritySchema.parse(response.data);
}
