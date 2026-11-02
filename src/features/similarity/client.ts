import { http } from '../../infrastructure/api/http';
import { similaritySchema, stepsSchema, type SimilarityRequest, type SimilarityStepsRequest } from './schemas';

export async function loadSimilarity(request: SimilarityRequest, signal?: AbortSignal) {
  const response = await http.post<unknown>('/similarity', request, signal ? { signal } : {});
  return similaritySchema.parse(response.data);
}

export async function loadSimilaritySteps(request: SimilarityStepsRequest, signal?: AbortSignal) {
  const response = await http.post<unknown>('/similarity/steps', request, signal ? { signal } : {});
  return stepsSchema.parse(response.data);
}
