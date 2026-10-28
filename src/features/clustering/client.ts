import { http } from '../../infrastructure/api/http';
import { clusteringSchema, type ClusteringRequest } from './schemas';

export async function loadClustering(request: ClusteringRequest, signal?: AbortSignal) {
  const response = await http.post<unknown>('/clustering', request, signal ? { signal } : {});
  return clusteringSchema.parse(response.data);
}
