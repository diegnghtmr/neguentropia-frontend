import axios from 'axios';
import { z } from 'zod';
import { apiErrorSchema } from './schemas';

const apiMessages = {
  INVALID_INPUT: 'El patrón no es válido. Escribe un texto y vuelve a intentarlo.',
  PAPER_NOT_FOUND: 'El artículo no existe en el corpus.',
  CORPUS_UNAVAILABLE: 'El corpus no está disponible. No se puede buscar.',
  INTERNAL_ERROR: 'El servidor tuvo un error al buscar. Inténtalo de nuevo más tarde.',
};

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return 'El backend devolvió una respuesta de búsqueda no válida.';
  }
  if (axios.isAxiosError<unknown>(error)) {
    const parsed = apiErrorSchema.safeParse(error.response?.data);
    if (parsed.success) {
      return apiMessages[parsed.data.code];
    }
  }
  return fallback;
}
