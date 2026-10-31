import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type { Category, CategoryInput } from '../../models/category.model';

import type { PagedResult, QueryOptions } from './rest-client';
import { RestClient } from './rest-client';

/** Opciones de listado de categorías. */
export interface CategoriesQuery {
  /** Orden PostgREST, por ejemplo `name.asc`. */
  order?: string;
}

/**
 * Acceso REST a la tabla `categories`.
 *
 * La lectura está permitida a cualquier usuario autenticado; la escritura solo
 * la permite la base de datos a los administradores (RLS).
 */
@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly rest = inject(RestClient);
  private readonly table = 'categories';

  /**
   * Lista las categorías.
   *
   * @param query Orden opcional (por defecto por nombre ascendente)
   */
  list(query: CategoriesQuery = {}): Observable<Category[]> {
    return this.rest.list<Category>(this.table, { order: query.order ?? 'name.asc' });
  }

  /**
   * Recupera una categoría por identificador.
   *
   * @param id Identificador de la categoría
   */
  getById(id: number): Observable<Category | null> {
    return this.rest.get<Category>(this.table, id);
  }

  /**
   * Crea una categoría.
   *
   * @param input Datos de la categoría
   */
  create(input: CategoryInput): Observable<Category> {
    return this.rest.create<Category>(this.table, input);
  }

  /**
   * Actualiza una categoría.
   *
   * @param id Identificador de la categoría
   * @param input Campos a modificar
   */
  update(id: number, input: Partial<CategoryInput>): Observable<Category> {
    return this.rest.update<Category>(this.table, id, input);
  }

  /**
   * Elimina una categoría (solo admin por RLS).
   *
   * @param id Identificador de la categoría
   */
  remove(id: number): Observable<void> {
    return this.rest.remove(this.table, id);
  }

  /**
   * Página de categorías con el total de coincidencias.
   *
   * @param options Filtros y paginación PostgREST
   */
  page(options: QueryOptions = {}): Observable<PagedResult<Category>> {
    return this.rest.page<Category>(this.table, { order: 'name.asc', ...options });
  }
}
