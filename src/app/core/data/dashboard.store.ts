import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom, forkJoin } from 'rxjs';

import type { ActivityFeedItem } from '../../shared/models/activity-feed.model';
import { toErrorMessage } from '../http/api-error';
import type { DashboardKpis, ProductsByCategory } from '../models/dashboard.model';
import { EMPTY_KPIS } from '../models/dashboard.model';
import type { ActivityData, DocumentRecord } from '../models/document.model';
import { ACTIVITY_COLLECTION } from '../models/document.model';
import type { OrderWithCustomer } from '../models/order.model';

import { DOCUMENT_STORE } from './documents/document-store';
import { DashboardApi } from './sql/dashboard.api';
import { OrdersApi } from './sql/orders.api';

/** Meses que abarca la ventana temporal del dashboard. */
export const DASHBOARD_MONTHS = 12;

/** Número de entradas de actividad que se cargan para el feed. */
const ACTIVITY_LIMIT = 20;

interface DashboardState {
  /** Indicadores agregados de `v_kpis`. */
  kpis: DashboardKpis;
  /** Productos y existencias por categoría. */
  byCategory: ProductsByCategory[];
  /** Pedidos de los últimos {@link DASHBOARD_MONTHS} meses. */
  orders: OrderWithCustomer[];
  /** Últimas entradas del registro de actividad. */
  latestActivity: ActivityFeedItem[];
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  kpis: EMPTY_KPIS,
  byCategory: [],
  orders: [],
  latestActivity: [],
  loading: false,
  error: null,
};

/**
 * Convierte un documento de la colección `activity` en una entrada del feed.
 *
 * @param record Documento devuelto por el almacén de documentos
 */
function toFeedItem(record: DocumentRecord<ActivityData>): ActivityFeedItem {
  return {
    id: record.id,
    action: record.data.action,
    entity: record.data.entity,
    entityId: record.data.entityId,
    summary: record.data.summary,
    actor: record.data.actor,
    at: record.data.at,
  };
}

/**
 * Calcula el primer día del mes que abre la ventana temporal del dashboard.
 *
 * @param monthsBack Meses completos que se retroceden
 * @param now Fecha de referencia
 */
function startOfWindow(monthsBack: number, now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
}

/**
 * Estado del dashboard: carga en paralelo los KPIs, las series por categoría,
 * los pedidos de los últimos doce meses y la actividad reciente.
 *
 * La página solo consume este store; el acceso a datos queda en las APIs y en
 * el almacén de documentos. Ante un fallo se conserva el mensaje normalizado
 * para que la vista ofrezca el botón «Reintentar».
 */
export const DashboardStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasError: computed(() => store.error() !== null),
  })),
  withMethods(
    (
      store,
      dashboardApi = inject(DashboardApi),
      ordersApi = inject(OrdersApi),
      documents = inject(DOCUMENT_STORE),
    ) => ({
      /**
       * Carga todos los datos del dashboard con `forkJoin`, de modo que la
       * vista recibe un único estado coherente y puede mostrar un solo spinner.
       */
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });
        const createdFrom = startOfWindow(DASHBOARD_MONTHS - 1).toISOString();

        try {
          const { kpis, byCategory, orders, latestActivity } = await firstValueFrom(
            forkJoin({
              kpis: dashboardApi.kpis(),
              byCategory: dashboardApi.productsByCategory(),
              orders: ordersApi.listAll({ createdFrom }),
              latestActivity: documents.latest<ActivityData>(ACTIVITY_COLLECTION, ACTIVITY_LIMIT),
            }),
          );

          patchState(store, {
            kpis,
            byCategory,
            orders,
            latestActivity: latestActivity.map(toFeedItem),
            loading: false,
            error: null,
          });
        } catch (error: unknown) {
          patchState(store, { loading: false, error: toErrorMessage(error) });
        }
      },

      /** Restablece el estado inicial. */
      reset(): void {
        patchState(store, { ...initialState });
      },
    }),
  ),
);
