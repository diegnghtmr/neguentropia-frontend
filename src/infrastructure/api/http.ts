import axios from 'axios';

export function createApiClient(backendURL?: string) {
  const origin = backendURL?.replace(/\/+$/, '') ?? '';
  return axios.create({ baseURL: `${origin}/api`, timeout: 15_000 });
}

export const http = createApiClient(import.meta.env.VITE_API_BASE_URL);
