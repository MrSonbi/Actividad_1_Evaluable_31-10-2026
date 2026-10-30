import type { HttpErrorResponse } from '@angular/common/http';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, of, retry, throwError, timer } from 'rxjs';
import type { MonoTypeOperatorFunction, Observable } from 'rxjs';
import { catchError, expand, last, map } from 'rxjs/operators';

import { ENVIRONMENT } from '../../config/environment.token';

/** Filtros horizontales en sintaxis PostgREST: `{ status: 'eq.paid' }`. */
export type RestFilters = Readonly<Record<string, string>>;

/** Opciones comunes de consulta. */
export interface QueryOptions {
  /** Columnas a devolver (`select`), incluidos embeds como `*,categories(name)`. */
  select?: string;
  /** Filtros horizontales (`eq`, `neq`, `ilike`, `or`...). */
  filters?: RestFilters;
  /** Orden PostgREST, por ejemplo `created_at.desc`. */
  order?: string;
  /** Número máximo de filas (cabecera `Range` o parámetro `limit`). */
  limit?: number;
  /** Desplazamiento en filas. */
  offset?: number;
}

/** Página de resultados con el total de filas que cumplen el filtro. */
export interface PagedResult<T> {
  rows: T[];
  /** Total de filas según `Content-Range`; `null` si el servidor no lo informa. */
  total: number | null;
}

/** Número de reintentos para peticiones GET fallidas por causas transitorias. */
const MAX_RETRIES = 2;

/** Espera base del backoff exponencial (ms). */
const RETRY_BASE_DELAY = 250;

/** Filas solicitadas por bloque al recuperar una lista completa. */
export const FETCH_CHUNK_SIZE = 500;

/** Número máximo de bloques, para evitar un bucle si el servidor ignorase `Range`. */
const MAX_FETCH_BLOCKS = 1000;

/** Estado interno de {@link RestClient.listAll} mientras acumula bloques. */
interface FetchAllState<T> {
  rows: T[];
  total: number | null;
  nextOffset: number | null;
  blocks: number;
}

/**
 * Indica si un error merece reintento: fallo de red o error 5xx.
 *
 * @param error Error emitido por `HttpClient`
 */
function isTransientError(error: unknown): boolean {
  if (!(error instanceof Object) || !('status' in error)) return false;
  const { status } = error as HttpErrorResponse;
  return status === 0 || status >= 500;
}

/**
 * Backoff exponencial aplicado solo a peticiones de lectura.
 */
function retryTransient<T>(): MonoTypeOperatorFunction<T> {
  return retry<T>({
    count: MAX_RETRIES,
    delay: (error: unknown, retryCount: number) =>
      isTransientError(error) ? timer(RETRY_BASE_DELAY * 2 ** (retryCount - 1)) : throwError(() => error),
  });
}

/**
 * Extrae el total de filas de la cabecera `Content-Range` (`0-9/123`).
 *
 * @param header Valor de la cabecera
 */
export function parseContentRangeTotal(header: string | null): number | null {
  if (!header) return null;
  const total = header.split('/')[1];
  if (!total || total === '*') return null;
  const parsed = Number.parseInt(total, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Indica si el error corresponde a un `Range` que empieza más allá del último
 * registro (`416 Requested Range Not Satisfiable`).
 *
 * @param error Error emitido por `HttpClient` (normalizado o no)
 */
function isRangeNotSatisfiable(error: unknown): boolean {
  if (!(error instanceof Object) || !('status' in error)) return false;
  return (error as { status: unknown }).status === 416;
}

/**
 * Calcula el desplazamiento del siguiente bloque o `null` si ya se han
 * recuperado todas las filas.
 *
 * @param received Filas devueltas por el bloque actual
 * @param total Total informado por `Content-Range` (o `null` si no se conoce)
 * @param offset Desplazamiento del bloque actual
 * @param size Filas solicitadas por bloque
 * @param blocks Bloques recuperados hasta el momento
 */
function nextOffset(
  received: number,
  total: number | null,
  offset: number,
  size: number,
  blocks: number,
): number | null {
  if (received === 0) return null;

  if (total !== null) {
    const fetched = offset + received;
    return fetched >= total ? null : fetched;
  }

  if (received < size) return null;
  if (blocks >= MAX_FETCH_BLOCKS) return null;
  return offset + size;
}

/**
 * Cliente REST genérico para PostgREST (Supabase).
 *
 * Todas las peticiones pasan por los interceptores de la app, que añaden
 * `apikey` y el token de sesión. Las lecturas reintentan con backoff
 * exponencial ante fallos de red o 5xx; las escrituras nunca se reintentan para
 * no duplicar operaciones.
 */
@Injectable({ providedIn: 'root' })
export class RestClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${inject(ENVIRONMENT).supabaseUrl.replace(/\/+$/, '')}/rest/v1`;

  /**
   * Lista filas de una tabla o vista.
   *
   * @param table Nombre de la tabla o vista
   * @param options Columnas, filtros, orden y paginación
   */
  list<T>(table: string, options: QueryOptions = {}): Observable<T[]> {
    return this.http.get<T[]>(this.url(table), { params: this.buildParams(options) }).pipe(retryTransient());
  }

  /**
   * Lista filas informando también del total de coincidencias.
   *
   * @param table Nombre de la tabla o vista
   * @param options Columnas, filtros, orden y paginación
   */
  page<T>(table: string, options: QueryOptions = {}): Observable<PagedResult<T>> {
    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;
    const headers = new HttpHeaders({
      Prefer: 'count=exact',
      Range: `${offset}-${offset + Math.max(limit - 1, 0)}`,
    });

    return this.http
      .get<T[]>(this.url(table), {
        params: this.buildParams({ ...options, limit, offset: undefined }),
        headers,
        observe: 'response',
      })
      .pipe(
        retryTransient(),
        map((response) => ({
          rows: response.body ?? [],
          total: parseContentRangeTotal(response.headers.get('content-range')),
        })),
      );
  }

  /**
   * Recupera **todas** las filas de una tabla o vista, pidiéndolas por bloques
   * con `Range` hasta alcanzar el total informado en `Content-Range`.
   *
   * PostgREST limita el número de filas por respuesta (1000 por defecto), por
   * lo que una única petición no basta para listados grandes. Cada bloque pide
   * `Prefer: count=exact` y la lectura termina cuando:
   *
   * - las filas acumuladas alcanzan el total de `Content-Range`, o
   * - llega un bloque incompleto (último bloque), o
   * - el servidor responde `416` porque el desplazamiento ya no existe.
   *
   * @param table Nombre de la tabla o vista
   * @param options Columnas, filtros y orden (la paginación la calcula este método)
   * @param chunkSize Filas solicitadas por bloque
   */
  listAll<T>(table: string, options: QueryOptions = {}, chunkSize: number = FETCH_CHUNK_SIZE): Observable<T[]> {
    const size = Math.max(1, Math.trunc(chunkSize));

    const fetchBlock = (offset: number): Observable<PagedResult<T>> =>
      this.page<T>(table, { ...options, limit: size, offset });

    return fetchBlock(0).pipe(
      map(
        ({ rows, total }): FetchAllState<T> => ({
          rows,
          total,
          nextOffset: nextOffset(rows.length, total, 0, size, 1),
          blocks: 1,
        }),
      ),
      expand((state) => {
        const offset = state.nextOffset;
        if (offset === null) return EMPTY;

        return fetchBlock(offset).pipe(
          map(({ rows, total }): FetchAllState<T> => {
            const rowsSoFar = [...state.rows, ...rows];
            const knownTotal = state.total ?? total;
            return {
              rows: rowsSoFar,
              total: knownTotal,
              nextOffset: nextOffset(rows.length, knownTotal, offset, size, state.blocks + 1),
              blocks: state.blocks + 1,
            };
          }),
          catchError((error: unknown) =>
            isRangeNotSatisfiable(error) ? of({ ...state, nextOffset: null }) : throwError(() => error),
          ),
        );
      }),
      last(),
      map((state) => state.rows),
    );
  }

  /**
   * Recupera una fila por su identificador.
   *
   * @param table Nombre de la tabla
   * @param id Identificador (`id=eq.<id>`)
   * @param options Columnas y filtros adicionales
   */
  get<T>(table: string, id: number | string, options: QueryOptions = {}): Observable<T | null> {
    return this.list<T>(table, {
      ...options,
      filters: { ...options.filters, id: `eq.${id}` },
      limit: 1,
    }).pipe(map((rows) => rows[0] ?? null));
  }

  /**
   * Crea una fila y devuelve la representación guardada.
   *
   * @param table Nombre de la tabla
   * @param payload Datos a insertar
   */
  create<T>(table: string, payload: object): Observable<T> {
    return this.http
      .post<T[]>(this.url(table), payload, { headers: this.representationHeaders() })
      .pipe(map((rows) => rows[0]));
  }

  /**
   * Actualiza la fila indicada y devuelve la representación guardada.
   *
   * @param table Nombre de la tabla
   * @param id Identificador de la fila
   * @param payload Campos a modificar
   */
  update<T>(table: string, id: number | string, payload: object): Observable<T> {
    return this.http
      .patch<T[]>(this.url(table), payload, {
        params: this.buildParams({ filters: { id: `eq.${id}` } }),
        headers: this.representationHeaders(),
      })
      .pipe(map((rows) => rows[0]));
  }

  /**
   * Elimina la fila indicada.
   *
   * @param table Nombre de la tabla
   * @param id Identificador de la fila
   */
  remove(table: string, id: number | string): Observable<void> {
    return this.http
      .delete<void>(this.url(table), {
        params: this.buildParams({ filters: { id: `eq.${id}` } }),
        headers: new HttpHeaders({ Prefer: 'return=minimal' }),
      })
      .pipe(map(() => undefined));
  }

  /**
   * Comprueba si existe algún registro con ese valor (validación de unicidad).
   *
   * @param table Nombre de la tabla
   * @param column Columna a comparar
   * @param value Valor buscado
   * @param excludeId Identificador que se excluye (al editar el propio registro)
   */
  exists(table: string, column: string, value: string, excludeId?: number | string): Observable<boolean> {
    const filters: Record<string, string> = { [column]: `eq.${value}` };
    if (excludeId !== undefined) {
      filters['id'] = `neq.${excludeId}`;
    }

    return this.list<{ id: number | string }>(table, { select: 'id', filters, limit: 1 }).pipe(
      map((rows) => rows.length > 0),
    );
  }

  /**
   * Construye la URL absoluta de una tabla.
   *
   * @param table Nombre de la tabla o vista
   */
  private url(table: string): string {
    return `${this.baseUrl}/${table}`;
  }

  /**
   * Traduce {@link QueryOptions} a parámetros de consulta PostgREST.
   *
   * @param options Opciones de la consulta
   */
  private buildParams(options: QueryOptions): HttpParams {
    let params = new HttpParams();
    if (options.select) params = params.set('select', options.select);
    if (options.order) params = params.set('order', options.order);
    if (options.limit !== undefined) params = params.set('limit', String(options.limit));
    if (options.offset !== undefined) params = params.set('offset', String(options.offset));
    for (const [column, expression] of Object.entries(options.filters ?? {})) {
      params = params.set(column, expression);
    }
    return params;
  }

  /**
   * Cabeceras de escritura que devuelven la fila guardada.
   */
  private representationHeaders(): HttpHeaders {
    return new HttpHeaders({ Prefer: 'return=representation' });
  }
}
