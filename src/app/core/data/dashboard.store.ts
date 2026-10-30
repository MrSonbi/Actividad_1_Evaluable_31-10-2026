import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { debounceTime, firstValueFrom, forkJoin, tap } from 'rxjs';
import type { Subscription } from 'rxjs';

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

/** Espera, en milisegundos, para agrupar en una recarga una ráfaga de eventos en vivo. */
const LIVE_REFRESH_DEBOUNCE_MS = 1000;

interface DashboardState {
  /** Indicadores agregados de `v_kpis`. */
  kpis: DashboardKpis;
  /** Productos y existencias por categoría. */
  byCategory: ProductsByCategory[];
  /** Pedidos de los últimos {@link DASHBOARD_MONTHS} meses. */
  orders: OrderWithCustomer[];
  /** Últimas entradas del registro de actividad. */
  latestActivity: ActivityFeedItem[];
  /** Eventos recibidos en vivo que el usuario aún no ha marcado como vistos. */
  newEvents: number;
  /** Mensaje si no se pudo conectar con la actividad en vivo. */
  liveError: string | null;
  loading: boolean;
  error: string | null;
  /** Última petición lanzada; las respuestas de peticiones anteriores se descartan. */
  _requestId: number;
}

const initialState: DashboardState = {
  kpis: EMPTY_KPIS,
  byCategory: [],
  orders: [],
  latestActivity: [],
  newEvents: 0,
  liveError: null,
  loading: false,
  error: null,
  _requestId: 0,
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
 * Une dos listas de actividad sin duplicados, de la más reciente a la más
 * antigua. Evita perder o repetir un evento que llegue por Realtime mientras la
 * carga REST sigue en curso. Las fechas son ISO 8601 en UTC, comparables como texto.
 *
 * @param current Entradas ya presentes
 * @param incoming Entradas nuevas
 */
function mergeActivity(
  current: readonly ActivityFeedItem[],
  incoming: readonly ActivityFeedItem[],
): ActivityFeedItem[] {
  const byId = new Map([...current, ...incoming].map((item) => [item.id, item]));
  return [...byId.values()].sort((a, b) => b.at.localeCompare(a.at)).slice(0, ACTIVITY_LIMIT);
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
  withMethods((store, dashboardApi = inject(DashboardApi), ordersApi = inject(OrdersApi)) => ({
    /**
     * Recarga en silencio los KPIs, las categorías y los pedidos, sin activar
     * `loading`. Si falla, se conservan los datos que ya se muestran.
     *
     * El feed no se recarga: lo mantiene Realtime, y traerlo aquí haría que un
     * evento ya incluido en la respuesta REST no sumara al contador.
     */
    async refresh(): Promise<void> {
      if (store.loading()) return;
      const requestId = store._requestId() + 1;
      patchState(store, { _requestId: requestId });

      try {
        const data = await firstValueFrom(
          forkJoin({
            kpis: dashboardApi.kpis(),
            byCategory: dashboardApi.productsByCategory(),
            orders: ordersApi.listAll({ createdFrom: startOfWindow(DASHBOARD_MONTHS - 1).toISOString() }),
          }),
        );
        if (requestId !== store._requestId()) return;

        patchState(store, { ...data, error: null });
      } catch {
        // Recarga en segundo plano: un fallo no debe interrumpir la pantalla.
      }
    },
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
        const requestId = store._requestId() + 1;
        patchState(store, { loading: true, error: null, _requestId: requestId });
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
          if (requestId !== store._requestId()) return;

          patchState(store, {
            kpis,
            byCategory,
            orders,
            latestActivity: mergeActivity(store.latestActivity(), latestActivity.map(toFeedItem)),
            loading: false,
            error: null,
          });
        } catch (error: unknown) {
          if (requestId !== store._requestId()) return;
          patchState(store, { loading: false, error: toErrorMessage(error) });
        }
      },

      /**
       * Escucha la actividad en vivo y la añade al feed, sumando cada evento
       * nuevo al contador. Tras cada ráfaga de eventos recarga en silencio los
       * datos del dashboard. Las señales repintan la vista sin `NgZone.run` porque
       * la aplicación no usa zone.js.
       *
       * @returns Suscripción que la página debe cancelar al destruirse
       */
      connectActivity(): Subscription {
        patchState(store, { newEvents: 0, liveError: null });

        return documents
          .changes$<ActivityData>(ACTIVITY_COLLECTION)
          .pipe(
            tap((record) => {
              if (store.latestActivity().some((item) => item.id === record.id)) return;
              patchState(store, {
                latestActivity: mergeActivity(store.latestActivity(), [toFeedItem(record)]),
                newEvents: store.newEvents() + 1,
              });
            }),
            debounceTime(LIVE_REFRESH_DEBOUNCE_MS),
          )
          .subscribe({
            next: () => void store.refresh(),
            error: () => {
              patchState(store, {
                liveError: 'No se pudo conectar con la actividad en vivo. Recarga la página para volver a intentarlo.',
              });
            },
          });
      },

      /** Pone a cero el contador de eventos nuevos. */
      markEventsSeen(): void {
        patchState(store, { newEvents: 0 });
      },

      /** Restablece el estado inicial. */
      reset(): void {
        patchState(store, { ...initialState });
      },
    }),
  ),
);
