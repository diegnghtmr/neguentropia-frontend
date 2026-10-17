import { http } from '../../infrastructure/api/http';
import { rankingSchema } from './schemas';

export async function loadRanking(signal?: AbortSignal) {
  const response = await http.post<unknown>('/ranking', {}, signal ? { signal } : {});
  return rankingSchema.parse(response.data);
}
