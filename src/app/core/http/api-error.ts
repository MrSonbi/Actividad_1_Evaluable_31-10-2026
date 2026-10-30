import type { HttpErrorResponse } from '@angular/common/http';

/** Cuerpo de error devuelto por PostgREST (`{ code, message, details, hint }`). */
interface PostgrestErrorBody {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/** Mensajes amigables por código SQLSTATE de PostgreSQL. */
const CODE_MESSAGES: Readonly<Record<string, string>> = {
  '23505': 'Ya existe un registro con ese valor. Revisa el email o el SKU.',
  '23503': 'El registro está relacionado con otros datos y no se puede completar la operación.',
  '42501': 'No tienes permisos para realizar esta acción.',
  '42P01': 'No se ha encontrado la tabla solicitada.',
};

/** Error de API ya normalizado, listo para mostrarse en la interfaz. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Extrae el código SQLSTATE del cuerpo de un error de PostgREST.
 *
 * @param body Cuerpo devuelto por el servidor (puede no ser un objeto)
 */
function getPostgrestCode(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const candidate = (body as PostgrestErrorBody).code;
  return typeof candidate === 'string' ? candidate : null;
}

/**
 * Convierte una respuesta HTTP fallida en un {@link ApiError} con un mensaje
 * en español.
 *
 * @param response Error emitido por `HttpClient`
 */
export function toApiError(response: HttpErrorResponse): ApiError {
  if (response.status === 0) {
    return new ApiError('Sin conexión a la red. Comprueba tu conexión e inténtalo de nuevo.', 0);
  }

  const code = getPostgrestCode(response.error);
  const friendly = code ? CODE_MESSAGES[code] : undefined;
  if (friendly) {
    return new ApiError(friendly, response.status, code);
  }

  if (response.status === 401) {
    return new ApiError('Tu sesión ha caducado. Vuelve a iniciar sesión.', 401, code);
  }
  if (response.status === 403) {
    return new ApiError('No tienes permisos para realizar esta acción.', 403, code);
  }
  if (response.status === 404) {
    return new ApiError('El recurso solicitado no existe.', 404, code);
  }

  return new ApiError('Se ha producido un error al contactar con el servidor.', response.status, code);
}

/**
 * Obtiene un mensaje mostrable a partir de cualquier error capturado.
 *
 * @param error Error desconocido
 * @param fallback Mensaje por defecto si no se puede deducir otro
 */
export function toErrorMessage(error: unknown, fallback = 'Se ha producido un error inesperado.'): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
