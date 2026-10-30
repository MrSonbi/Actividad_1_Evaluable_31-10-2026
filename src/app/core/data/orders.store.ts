import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { OrderStatus, OrderWithCustomer } from '../models/order.model';

import { ActivityLogService } from './activity-log.service';
import { OrdersApi } from './sql/orders.api';

interface OrdersState {
  /** Lista completa de pedidos cargada del servidor. */
  items: OrderWithCustomer[];
  /** Filtro por estado aplicado en el cliente. */
  status: OrderStatus | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  items: [],
  status: null,
  loading: false,
  error: null,
};

/**
 * Estado de la feature de pedidos: lista completa de solo lectura y filtro por
 * estado.
 *
 * El store carga todos los pedidos del servidor (por bloques) y el filtro se
 * aplica en memoria; la ordenación y la paginación visibles también se
 * resuelven en el cliente sobre esas filas.
 */
export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    filteredItems: computed(() => {
      const status = store.status();
      return status ? store.items().filter((order) => order.status === status) : store.items();
    }),
  })),
  withComputed((store) => ({
    total: computed(() => store.filteredItems().length),
    isEmpty: computed(() => !store.loading() && store.filteredItems().length === 0),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods((store, ordersApi = inject(OrdersApi), activity = inject(ActivityLogService)) => ({
    /**
     * Carga la lista completa de pedidos, pidiendo al servidor todos los
     * bloques.
     */
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const items = await firstValueFrom(ordersApi.listAll());
        patchState(store, { items, loading: false });
      } catch (error: unknown) {
        patchState(store, { loading: false, error: toErrorMessage(error) });
      }
    },

    /**
     * Filtra por estado sobre las filas ya cargadas.
     *
     * @param status Estado del pedido o `null` para todos
     */
    setStatus(status: OrderStatus | null): void {
      patchState(store, { status });
    },

    /**
     * Cambia el estado de un pedido (solo admin), reemplaza su fila en la
     * lista y registra la actividad, sin recargar el listado.
     *
     * @param id Identificador del pedido
     * @param status Nuevo estado
     * @returns `true` si la operación se completó correctamente
     */
    async updateStatus(id: number, status: OrderStatus): Promise<boolean> {
      try {
        const updated = await firstValueFrom(ordersApi.update(id, { status }));
        patchState(store, {
          items: store
            .items()
            .map((order) => (order.id === id ? { ...order, ...updated, customer_name: order.customer_name } : order)),
          error: null,
        });
        activity.log('update', 'order', id, `Pedido #${id} actualizado a ${status}`);
        return updated.id > 0;
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
