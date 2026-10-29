import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { Customer, CustomerInput } from '../models/customer.model';

import { ActivityLogService } from './activity-log.service';
import { CustomersApi } from './sql/customers.api';

interface CustomersState {
  items: Customer[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  search: '',
  loading: false,
  error: null,
};

/**
 * Estado de la feature de clientes: listado paginado, búsqueda y CRUD.
 *
 * Ambos roles pueden crear y editar; solo el administrador borra (lo impone la
 * base de datos y la interfaz oculta el botón).
 */
export const CustomersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isEmpty: computed(() => !store.loading() && store.items().length === 0),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods((store, customersApi = inject(CustomersApi), activity = inject(ActivityLogService)) => ({
    /**
     * Carga la página actual aplicando la búsqueda activa.
     */
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const { rows, total } = await firstValueFrom(
          customersApi.page({
            page: store.page(),
            pageSize: store.pageSize(),
            search: store.search(),
          }),
        );
        patchState(store, { items: rows, total: total ?? rows.length, loading: false });
      } catch (error: unknown) {
        patchState(store, { loading: false, error: toErrorMessage(error) });
      }
    },

    /**
     * Cambia el texto de búsqueda y recarga desde la primera página.
     *
     * @param search Texto a buscar en nombre o email
     */
    async setSearch(search: string): Promise<void> {
      patchState(store, { search, page: 1 });
      await this.load();
    },

    /**
     * Cambia de página y recarga.
     *
     * @param page Número de página (1-based)
     */
    async setPage(page: number): Promise<void> {
      patchState(store, { page: Math.max(page, 1) });
      await this.load();
    },

    /**
     * Crea un cliente, registra la actividad y recarga el listado.
     *
     * @param input Datos del cliente
     * @returns `true` si la operación se completó correctamente
     */
    async create(input: CustomerInput): Promise<boolean> {
      try {
        const created = await firstValueFrom(customersApi.create(input));
        activity.log('create', 'customer', created.id, `Cliente creado: ${created.full_name}`);
        await this.load();
        return true;
      } catch (error: unknown) {
        patchState(store, { error: toErrorMessage(error) });
        return false;
      }
    },

    /**
     * Actualiza un cliente, registra la actividad y recarga el listado.
     *
     * @param id Identificador del cliente
     * @param input Campos a modificar
     * @returns `true` si la operación se completó correctamente
     */
    async update(id: number, input: Partial<CustomerInput>): Promise<boolean> {
      try {
        const updated = await firstValueFrom(customersApi.update(id, input));
        activity.log('update', 'customer', id, `Cliente actualizado: ${updated.full_name}`);
        await this.load();
        return true;
      } catch (error: unknown) {
        patchState(store, { error: toErrorMessage(error) });
        return false;
      }
    },

    /**
     * Elimina un cliente (solo admin), registra la actividad y recarga.
     *
     * @param customer Cliente a eliminar
     * @returns `true` si la operación se completó correctamente
     */
    async remove(customer: Customer): Promise<boolean> {
      try {
        await firstValueFrom(customersApi.remove(customer.id));
        activity.log('delete', 'customer', customer.id, `Cliente eliminado: ${customer.full_name}`);
        await this.load();
        return true;
      } catch (error: unknown) {
        patchState(store, { error: toErrorMessage(error) });
        return false;
      }
    },

    /** Limpia el error actual. */
    clearError(): void {
      patchState(store, { error: null });
    },

    /** Restablece el estado inicial. */
    reset(): void {
      patchState(store, { ...initialState });
    },
  })),
);
