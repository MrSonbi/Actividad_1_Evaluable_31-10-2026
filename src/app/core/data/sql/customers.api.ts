import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

import type { Customer, CustomerInput } from '../../models/customer.model';

import type { PagedResult } from './rest-client';
import { RestClient } from './rest-client';

/** Filtros y paginación del listado de clientes. */
export interface CustomersQuery {
  page?: number;
  pageSize?: number;
  /** Texto libre: se compara con `ilike` sobre nombre y email. */
  search?: string;
}

/**
 * Acceso REST a la tabla `customers`.
 *
 * Ambos roles leen, crean y editan; solo el administrador puede borrar (RLS).
 */
@Injectable({ providedIn: 'root' })
export class CustomersApi {
  private readonly rest = inject(RestClient);
  private readonly table = 'customers';

  /**
   * Lista clientes, opcionalmente filtrados por texto.
   *
   * @param query Filtros y paginación
   */
  list(query: CustomersQuery = {}): Observable<Customer[]> {
    const { limit, offset } = this.paging(query);
    return this.rest.list<Customer>(this.table, {
      filters: this.filters(query),
      order: 'full_name.asc',
      limit,
      offset,
    });
  }

  /**
   * Página de clientes con el total de coincidencias.
   *
   * @param query Filtros y paginación
   */
  page(query: CustomersQuery = {}): Observable<PagedResult<Customer>> {
    const { limit, offset } = this.paging(query);
    return this.rest.page<Customer>(this.table, {
      filters: this.filters(query),
      order: 'full_name.asc',
      limit,
      offset,
    });
  }

  /**
   * Recupera un cliente por identificador.
   *
   * @param id Identificador del cliente
   */
  getById(id: number): Observable<Customer | null> {
    return this.rest.get<Customer>(this.table, id);
  }

  /**
   * Crea un cliente (el email se normaliza a minúsculas).
   *
   * @param input Datos del cliente
   */
  create(input: CustomerInput): Observable<Customer> {
    return this.rest.create<Customer>(this.table, { ...input, email: this.normalizeEmail(input.email) });
  }

  /**
   * Actualiza un cliente (el email se normaliza a minúsculas).
   *
   * @param id Identificador del cliente
   * @param input Campos a modificar
   */
  update(id: number, input: Partial<CustomerInput>): Observable<Customer> {
    const payload = input.email ? { ...input, email: this.normalizeEmail(input.email) } : input;
    return this.rest.update<Customer>(this.table, id, payload);
  }

  /**
   * Elimina un cliente (solo admin por RLS).
   *
   * @param id Identificador del cliente
   */
  remove(id: number): Observable<void> {
    return this.rest.remove(this.table, id);
  }

  /**
   * Comprueba si un email ya está en uso (validador asíncrono del formulario).
   *
   * @param email Email a comprobar (se normaliza a minúsculas)
   * @param excludeId Cliente que se está editando, si procede
   */
  emailExists(email: string, excludeId?: number): Observable<boolean> {
    return this.rest.exists(this.table, 'email', this.normalizeEmail(email), excludeId);
  }

  /**
   * Normaliza el email: la tabla exige `email = lower(email)`.
   *
   * @param email Email original
   */
  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Traduce la consulta a filtros PostgREST. El `or` busca en nombre y email.
   *
   * @param query Consulta de clientes
   */
  private filters(query: CustomersQuery): Record<string, string> {
    const search = query.search?.trim();
    if (!search) return {};
    return { or: `(full_name.ilike.*${search}*,email.ilike.*${search}*)` };
  }

  /**
   * Calcula límite y desplazamiento a partir de la página solicitada.
   *
   * @param query Consulta de clientes
   */
  private paging(query: CustomersQuery): { limit: number; offset: number } {
    const limit = query.pageSize ?? 10;
    const page = Math.max(query.page ?? 1, 1);
    return { limit, offset: (page - 1) * limit };
  }
}
