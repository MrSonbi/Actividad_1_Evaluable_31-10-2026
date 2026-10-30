import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Product, ProductInput, ProductRow, ProductWithCategory } from '../../models/product.model';

import type { PagedResult } from './rest-client';
import { RestClient } from './rest-client';

/** Filtros y paginación del listado de productos. */
export interface ProductsQuery {
  page?: number;
  pageSize?: number;
  /** Texto libre: se compara con `ilike` sobre el nombre. */
  search?: string;
  categoryId?: number | null;
}

/** Columnas con la categoría embebida. */
const SELECT_WITH_CATEGORY = '*,categories(name)';

/**
 * Convierte una fila de PostgREST en un producto con el nombre de categoría.
 *
 * @param row Fila devuelta por PostgREST
 */
function toProduct(row: ProductRow): ProductWithCategory {
  const { categories, ...product } = row;
  return { ...product, category_name: categories?.name ?? null };
}

/**
 * Acceso REST a la tabla `products`.
 *
 * Lectura para cualquier usuario autenticado; escritura solo administradores.
 */
@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly rest = inject(RestClient);
  private readonly table = 'products';

  /**
   * Lista productos, opcionalmente filtrados por texto o categoría.
   *
   * @param query Filtros y orden
   */
  list(query: ProductsQuery = {}): Observable<ProductWithCategory[]> {
    const { limit, offset } = this.paging(query);
    return this.rest
      .list<ProductRow>(this.table, {
        select: SELECT_WITH_CATEGORY,
        filters: this.filters(query),
        order: 'name.asc',
        limit,
        offset,
      })
      .pipe(map((rows) => rows.map(toProduct)));
  }

  /**
   * Lista **todos** los productos que cumplen los filtros, pidiéndolos al
   * servidor por bloques hasta traerlos todos.
   *
   * El orden y los filtros se aplican en PostgREST; la búsqueda, la ordenación
   * y la paginación visibles se resuelven en el cliente sobre esta lista.
   *
   * @param query Filtros y orden
   */
  listAll(query: ProductsQuery = {}): Observable<ProductWithCategory[]> {
    return this.rest
      .listAll<ProductRow>(this.table, {
        select: SELECT_WITH_CATEGORY,
        filters: this.filters(query),
        order: 'name.asc',
      })
      .pipe(map((rows) => rows.map(toProduct)));
  }

  /**
   * Página de productos con el total de coincidencias (para la tabla).
   *
   * @param query Filtros y paginación
   */
  page(query: ProductsQuery = {}): Observable<PagedResult<ProductWithCategory>> {
    const { limit, offset } = this.paging(query);
    return this.rest
      .page<ProductRow>(this.table, {
        select: SELECT_WITH_CATEGORY,
        filters: this.filters(query),
        order: 'name.asc',
        limit,
        offset,
      })
      .pipe(map((result) => ({ ...result, rows: result.rows.map(toProduct) })));
  }

  /**
   * Recupera un producto por identificador.
   *
   * @param id Identificador del producto
   */
  getById(id: number): Observable<ProductWithCategory | null> {
    return this.rest
      .get<ProductRow>(this.table, id, { select: SELECT_WITH_CATEGORY })
      .pipe(map((row) => (row ? toProduct(row) : null)));
  }

  /**
   * Crea un producto.
   *
   * @param input Datos del producto
   */
  create(input: ProductInput): Observable<Product> {
    return this.rest.create<Product>(this.table, input);
  }

  /**
   * Actualiza un producto.
   *
   * @param id Identificador del producto
   * @param input Campos a modificar
   */
  update(id: number, input: Partial<ProductInput>): Observable<Product> {
    return this.rest.update<Product>(this.table, id, input);
  }

  /**
   * Elimina un producto (solo admin por RLS).
   *
   * @param id Identificador del producto
   */
  remove(id: number): Observable<void> {
    return this.rest.remove(this.table, id);
  }

  /**
   * Comprueba si un SKU ya está en uso (validador asíncrono del formulario).
   *
   * @param sku SKU a comprobar
   * @param excludeId Producto que se está editando, si procede
   */
  skuExists(sku: string, excludeId?: number): Observable<boolean> {
    return this.rest.exists(this.table, 'sku', sku.trim(), excludeId);
  }

  /**
   * Implementación de {@link UniqueFieldApi} para el campo SKU.
   *
   * @param value SKU a comprobar
   * @param excludeId Producto que se está editando, si procede
   */
  exists(value: string, excludeId?: number): Observable<boolean> {
    return this.skuExists(value, excludeId);
  }

  /**
   * Traduce la consulta a filtros PostgREST.
   *
   * @param query Consulta de productos
   */
  private filters(query: ProductsQuery): Record<string, string> {
    const filters: Record<string, string> = {};
    const search = query.search?.trim();
    if (search) filters['name'] = `ilike.*${search}*`;
    if (query.categoryId !== undefined && query.categoryId !== null) {
      filters['category_id'] = `eq.${query.categoryId}`;
    }
    return filters;
  }

  /**
   * Calcula límite y desplazamiento a partir de la página solicitada.
   *
   * @param query Consulta de productos
   */
  private paging(query: ProductsQuery): { limit: number; offset: number } {
    const limit = query.pageSize ?? 10;
    const page = Math.max(query.page ?? 1, 1);
    return { limit, offset: (page - 1) * limit };
  }
}
