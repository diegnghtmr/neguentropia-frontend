import axios from 'axios';
import { z } from 'zod';
import { apiErrorSchema } from './schemas';

export const apiMessages = {
  INVALID_INPUT: 'La solicitud no es válida. Revisa los artículos y los métodos elegidos.',
  PAPER_NOT_FOUND: 'No se encontró alguno de los artículos elegidos. Recarga la página para actualizar el catálogo.',
  CORPUS_UNAVAILABLE: 'El corpus no está disponible. No se puede calcular la similitud.',
  PROVIDER_UNAVAILABLE: 'Los vectores de embeddings no están disponibles. Prueba con otros métodos.',
  INTERNAL_ERROR: 'El servidor tuvo un error al calcular la similitud. Inténtalo de nuevo más tarde.',
};

export function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return 'El backend devolvió una respuesta no válida.';
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) return apiMessages[parsed.data.code];
  }
  return 'No se pudo completar la solicitud. Revisa la conexión y la configuración del backend.';
}
