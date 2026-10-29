import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { OrderStatus, OrderWithCustomer } from '../models/order.model';

import { ActivityLogService } from './activity-log.service';
import { OrdersApi } from './sql/orders.api';

interface OrdersState {
  items: OrderWithCustomer[];
  total: number;
  page: number;
  pageSize: number;
  status: OrderStatus | null;
  loading: boolean;
  error: string | null;
}

const initialState: OrdersState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 25,
  status: null,
  loading: false,
  error: null,
};

/**
 * Estado de la feature de pedidos: listado paginado de solo lectura y filtro
 * por estado.
 */
export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isEmpty: computed(() => !store.loading() && store.items().length === 0),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods((store, ordersApi = inject(OrdersApi), activity = inject(ActivityLogService)) => ({
    /**
     * Carga la página actual aplicando el filtro de estado.
     */
    async load(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const { rows, total } = await firstValueFrom(
          ordersApi.page({
            page: store.page(),
            pageSize: store.pageSize(),
            status: store.status(),
          }),
        );
        patchState(store, { items: rows, total: total ?? rows.length, loading: false });
      } catch (error: unknown) {
        patchState(store, { loading: false, error: toErrorMessage(error) });
      }
    },

    /**
     * Filtra por estado y recarga desde la primera página.
     *
     * @param status Estado del pedido o `null` para todos
     */
    async setStatus(status: OrderStatus | null): Promise<void> {
      patchState(store, { status, page: 1 });
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
     * Cambia el estado de un pedido (solo admin) y registra la actividad.
     *
     * @param id Identificador del pedido
     * @param status Nuevo estado
     * @returns `true` si la operación se completó correctamente
     */
    async updateStatus(id: number, status: OrderStatus): Promise<boolean> {
      try {
        const updated = await firstValueFrom(ordersApi.update(id, { status }));
        activity.log('update', 'order', id, `Pedido #${id} actualizado a ${status}`);
        await this.load();
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
