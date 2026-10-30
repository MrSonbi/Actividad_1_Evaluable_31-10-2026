import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { Order, OrderInput, OrderRow, OrderStatus, OrderWithCustomer } from '../../models/order.model';

import type { PagedResult } from './rest-client';
import { RestClient } from './rest-client';

/** Filtros y paginación del listado de pedidos. */
export interface OrdersQuery {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | null;
  customerId?: number | null;
}

/** Columnas con el cliente embebido. */
const SELECT_WITH_CUSTOMER = '*,customers(full_name)';

/**
 * Convierte una fila de PostgREST en un pedido con el nombre del cliente.
 *
 * @param row Fila devuelta por PostgREST
 */
function toOrder(row: OrderRow): OrderWithCustomer {
  const { customers, ...order } = row;
  return { ...order, customer_name: customers?.full_name ?? null };
}

/**
 * Acceso REST a la tabla `orders`.
 *
 * Lectura para cualquier usuario autenticado; escritura solo administradores.
 */
@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly rest = inject(RestClient);
  private readonly table = 'orders';

  /**
   * Lista pedidos, opcionalmente filtrados por estado o cliente.
   *
   * @param query Filtros y paginación
   */
  list(query: OrdersQuery = {}): Observable<OrderWithCustomer[]> {
    const { limit, offset } = this.paging(query);
    return this.rest
      .list<OrderRow>(this.table, {
        select: SELECT_WITH_CUSTOMER,
        filters: this.filters(query),
        order: 'created_at.desc',
        limit,
        offset,
      })
      .pipe(map((rows) => rows.map(toOrder)));
  }

  /**
   * Lista **todos** los pedidos que cumplen los filtros, pidiéndolos al
   * servidor por bloques hasta traerlos todos.
   *
   * @param query Filtros y orden
   */
  listAll(query: OrdersQuery = {}): Observable<OrderWithCustomer[]> {
    return this.rest
      .listAll<OrderRow>(this.table, {
        select: SELECT_WITH_CUSTOMER,
        filters: this.filters(query),
        order: 'created_at.desc',
      })
      .pipe(map((rows) => rows.map(toOrder)));
  }

  /**
   * Página de pedidos con el total de coincidencias.
   *
   * @param query Filtros y paginación
   */
  page(query: OrdersQuery = {}): Observable<PagedResult<OrderWithCustomer>> {
    const { limit, offset } = this.paging(query);
    return this.rest
      .page<OrderRow>(this.table, {
        select: SELECT_WITH_CUSTOMER,
        filters: this.filters(query),
        order: 'created_at.desc',
        limit,
        offset,
      })
      .pipe(map((result) => ({ ...result, rows: result.rows.map(toOrder) })));
  }

  /**
   * Recupera un pedido por identificador.
   *
   * @param id Identificador del pedido
   */
  getById(id: number): Observable<OrderWithCustomer | null> {
    return this.rest
      .get<OrderRow>(this.table, id, { select: SELECT_WITH_CUSTOMER })
      .pipe(map((row) => (row ? toOrder(row) : null)));
  }

  /**
   * Crea un pedido.
   *
   * @param input Datos del pedido
   */
  create(input: OrderInput): Observable<Order> {
    return this.rest.create<Order>(this.table, input);
  }

  /**
   * Actualiza un pedido (por ejemplo, su estado).
   *
   * @param id Identificador del pedido
   * @param input Campos a modificar
   */
  update(id: number, input: Partial<OrderInput>): Observable<Order> {
    return this.rest.update<Order>(this.table, id, input);
  }

  /**
   * Elimina un pedido (solo admin por RLS).
   *
   * @param id Identificador del pedido
   */
  remove(id: number): Observable<void> {
    return this.rest.remove(this.table, id);
  }

  /**
   * Traduce la consulta a filtros PostgREST.
   *
   * @param query Consulta de pedidos
   */
  private filters(query: OrdersQuery): Record<string, string> {
    const filters: Record<string, string> = {};
    if (query.status) filters['status'] = `eq.${query.status}`;
    if (query.customerId !== undefined && query.customerId !== null) {
      filters['customer_id'] = `eq.${query.customerId}`;
    }
    return filters;
  }

  /**
   * Calcula límite y desplazamiento a partir de la página solicitada.
   *
   * @param query Consulta de pedidos
   */
  private paging(query: OrdersQuery): { limit: number; offset: number } {
    const limit = query.pageSize ?? 10;
    const page = Math.max(query.page ?? 1, 1);
    return { limit, offset: (page - 1) * limit };
  }
}
