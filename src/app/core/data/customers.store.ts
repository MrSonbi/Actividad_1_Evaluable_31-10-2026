import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { Customer, CustomerInput } from '../models/customer.model';

import { ActivityLogService } from './activity-log.service';
import { CustomersApi } from './sql/customers.api';

interface CustomersState {
  /** Directorio completo cargado del servidor. */
  items: Customer[];
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = {
  items: [],
  loading: false,
  error: null,
};

/**
 * Estado de la feature de clientes: directorio completo, búsqueda en cliente y
 * CRUD.
 *
 * El store carga todas las filas del servidor (por bloques); la búsqueda, la
 * ordenación y la paginación de la tabla se resuelven en el cliente. Cada
 * escritura actualiza la lista en memoria sin volver a pedir el directorio.
 *
 * Ambos roles pueden crear y editar; solo el administrador borra (lo impone la
 * base de datos y la interfaz oculta el botón).
 */
export const CustomersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** Número total de clientes cargados. */
    total: computed(() => store.items().length),
    isEmpty: computed(() => !store.loading() && store.items().length === 0),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods((store, customersApi = inject(CustomersApi), activity = inject(ActivityLogService)) => ({
    /**
     * Carga el directorio completo, pidiendo al servidor todos los bloques.
     */
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const items = await firstValueFrom(customersApi.listAll());
        patchState(store, { items, loading: false });
      } catch (error: unknown) {
        patchState(store, { loading: false, error: toErrorMessage(error) });
      }
    },

    /**
     * Crea un cliente, lo inserta al principio de la lista y registra la
     * actividad.
     *
     * La inserción es local: no se recarga el directorio, así que se conservan
     * la búsqueda, la ordenación y la página que el usuario tenga aplicadas.
     *
     * @param input Datos del cliente
     * @returns `true` si la operación se completó correctamente
     */
    async create(input: CustomerInput): Promise<boolean> {
      try {
        const created = await firstValueFrom(customersApi.create(input));
        patchState(store, { items: [created, ...store.items()], error: null });
        activity.log('create', 'customer', created.id, `Cliente creado: ${created.full_name}`);
        return true;
      } catch (error: unknown) {
        patchState(store, { error: toErrorMessage(error) });
        return false;
      }
    },

    /**
     * Actualiza un cliente y reemplaza su fila en la lista, sin recargarla.
     *
     * @param id Identificador del cliente
     * @param input Campos a modificar
     * @returns `true` si la operación se completó correctamente
     */
    async update(id: number, input: Partial<CustomerInput>): Promise<boolean> {
      try {
        const updated = await firstValueFrom(customersApi.update(id, input));
        patchState(store, {
          items: store.items().map((existing) => (existing.id === id ? updated : existing)),
          error: null,
        });
        activity.log('update', 'customer', id, `Cliente actualizado: ${updated.full_name}`);
        return true;
      } catch (error: unknown) {
        patchState(store, { error: toErrorMessage(error) });
        return false;
      }
    },

    /**
     * Elimina un cliente (solo admin) de la lista en memoria y registra la
     * actividad.
     *
     * @param customer Cliente a eliminar
     * @returns `true` si la operación se completó correctamente
     */
    async remove(customer: Customer): Promise<boolean> {
      try {
        await firstValueFrom(customersApi.remove(customer.id));
        patchState(store, {
          items: store.items().filter((existing) => existing.id !== customer.id),
          error: null,
        });
        activity.log('delete', 'customer', customer.id, `Cliente eliminado: ${customer.full_name}`);
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
