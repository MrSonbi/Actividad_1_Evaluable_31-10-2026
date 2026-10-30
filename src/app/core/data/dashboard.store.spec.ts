import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { ApiError } from '../http/api-error';
import type { DashboardKpis, ProductsByCategory } from '../models/dashboard.model';
import type { ActivityData, DocumentRecord } from '../models/document.model';
import type { OrderWithCustomer } from '../models/order.model';

import { DashboardStore } from './dashboard.store';
import { DOCUMENT_STORE } from './documents/document-store';
import { DashboardApi } from './sql/dashboard.api';
import { OrdersApi } from './sql/orders.api';

const KPIS: DashboardKpis = {
  total_products: 12,
  total_customers: 4,
  total_orders: 8,
  total_revenue: 1234.56,
  low_stock_products: 2,
};

const BY_CATEGORY: ProductsByCategory[] = [
  { category_id: 1, category: 'Periféricos', products: 7, units_in_stock: 120 },
  { category_id: 2, category: 'Monitores', products: 5, units_in_stock: 30 },
];

const ORDER: OrderWithCustomer = {
  id: 1,
  customer_id: 1,
  customer_name: 'Ana Pérez',
  status: 'paid',
  total: 99.9,
  created_at: '2026-09-10T10:00:00.000Z',
};

const ACTIVITY: DocumentRecord<ActivityData> = {
  id: 'doc-1',
  collection: 'activity',
  data: {
    action: 'create',
    entity: 'product',
    entityId: 3,
    summary: 'Alta del producto TEC-001',
    actor: 'demo@example.com',
    at: '2026-10-01T09:00:00.000Z',
  },
  created_by: 'user-1',
  created_at: '2026-10-01T09:00:00.000Z',
};

describe('DashboardStore', () => {
  let dashboardApi: {
    kpis: ReturnType<typeof vi.fn>;
    productsByCategory: ReturnType<typeof vi.fn>;
  };
  let ordersApi: { listAll: ReturnType<typeof vi.fn> };
  let documents: { latest: ReturnType<typeof vi.fn>; changes$: ReturnType<typeof vi.fn> };
  let changes: Subject<DocumentRecord<ActivityData>>;
  let store: InstanceType<typeof DashboardStore>;

  /**
   * Construye un documento de actividad de prueba.
   *
   * @param id Identificador del documento
   * @param at Fecha ISO 8601 del evento
   */
  function activity(id: string, at: string): DocumentRecord<ActivityData> {
    return { ...ACTIVITY, id, data: { ...ACTIVITY.data, at } };
  }

  beforeEach(() => {
    dashboardApi = {
      kpis: vi.fn(() => of(KPIS)),
      productsByCategory: vi.fn(() => of(BY_CATEGORY)),
    };
    ordersApi = { listAll: vi.fn(() => of([ORDER])) };
    changes = new Subject<DocumentRecord<ActivityData>>();
    documents = { latest: vi.fn(() => of([ACTIVITY])), changes$: vi.fn(() => changes) };

    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardApi, useValue: dashboardApi },
        { provide: OrdersApi, useValue: ordersApi },
        { provide: DOCUMENT_STORE, useValue: documents },
      ],
    });

    store = TestBed.inject(DashboardStore);
  });

  it('carga en paralelo KPIs, categorías, pedidos de 12 meses y actividad', async () => {
    await store.load();

    expect(dashboardApi.kpis).toHaveBeenCalledTimes(1);
    expect(dashboardApi.productsByCategory).toHaveBeenCalledTimes(1);
    expect(documents.latest).toHaveBeenCalledWith('activity', 20);
    expect(ordersApi.listAll).toHaveBeenCalledWith(expect.objectContaining({ createdFrom: expect.any(String) }));

    const query = ordersApi.listAll.mock.calls[0][0] as { createdFrom: string };
    const from = new Date(query.createdFrom);
    const now = new Date();
    const expected = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    expect(from.getFullYear()).toBe(expected.getFullYear());
    expect(from.getMonth()).toBe(expected.getMonth());
    expect(from.getDate()).toBe(1);

    expect(store.kpis()).toEqual(KPIS);
    expect(store.byCategory()).toEqual(BY_CATEGORY);
    expect(store.orders()).toHaveLength(1);
    expect(store.latestActivity()).toEqual([
      {
        id: 'doc-1',
        action: 'create',
        entity: 'product',
        entityId: 3,
        summary: 'Alta del producto TEC-001',
        actor: 'demo@example.com',
        at: '2026-10-01T09:00:00.000Z',
      },
    ]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
    expect(store.hasError()).toBe(false);
  });

  it('mantiene el estado de carga mientras las fuentes no han respondido', async () => {
    const kpis = new Subject<DashboardKpis>();
    dashboardApi.kpis.mockReturnValue(kpis);

    const loading = store.load();
    expect(store.loading()).toBe(true);

    kpis.next(KPIS);
    kpis.complete();
    await loading;

    expect(store.loading()).toBe(false);
    expect(store.kpis()).toEqual(KPIS);
  });

  it('guarda el mensaje normalizado y desactiva la carga si una fuente falla', async () => {
    dashboardApi.productsByCategory.mockReturnValue(throwError(() => new ApiError('Sin permisos', 403, '42501')));

    await store.load();

    expect(store.error()).toBe('Sin permisos');
    expect(store.loading()).toBe(false);
    expect(store.hasError()).toBe(true);
    expect(store.byCategory()).toEqual([]);
  });

  it('permite reintentar la carga después de un error', async () => {
    dashboardApi.kpis.mockReturnValueOnce(throwError(() => new ApiError('Sin conexión', 0)));

    await store.load();
    expect(store.hasError()).toBe(true);

    await store.load();

    expect(store.hasError()).toBe(false);
    expect(store.kpis()).toEqual(KPIS);
    expect(dashboardApi.kpis).toHaveBeenCalledTimes(2);
  });

  describe('recarga silenciosa', () => {
    it('actualiza KPIs, categorías y pedidos sin activar la carga ni pedir la actividad', async () => {
      await store.load();
      documents.latest.mockClear();
      dashboardApi.kpis.mockReturnValue(of({ ...KPIS, total_customers: 5 }));
      ordersApi.listAll.mockReturnValue(of([ORDER, { ...ORDER, id: 2 }]));

      const refreshing = store.refresh();
      expect(store.loading()).toBe(false);
      await refreshing;

      expect(store.kpis().total_customers).toBe(5);
      expect(store.orders()).toHaveLength(2);
      expect(documents.latest).not.toHaveBeenCalled();
      expect(store.latestActivity()).toHaveLength(1);
    });

    it('conserva los datos y no muestra error si falla', async () => {
      await store.load();
      dashboardApi.kpis.mockReturnValue(throwError(() => new ApiError('Sin conexión', 0)));

      await store.refresh();

      expect(store.kpis()).toEqual(KPIS);
      expect(store.hasError()).toBe(false);
      expect(store.loading()).toBe(false);
    });

    it('limpia un error anterior si la recarga funciona', async () => {
      dashboardApi.kpis.mockReturnValueOnce(throwError(() => new ApiError('Sin conexión', 0)));
      await store.load();
      expect(store.hasError()).toBe(true);

      await store.refresh();

      expect(store.hasError()).toBe(false);
      expect(store.kpis()).toEqual(KPIS);
    });

    it('no lanza peticiones mientras hay una carga completa en curso', async () => {
      const kpis = new Subject<DashboardKpis>();
      dashboardApi.kpis.mockReturnValueOnce(kpis);
      const loading = store.load();

      await store.refresh();
      expect(dashboardApi.kpis).toHaveBeenCalledTimes(1);

      kpis.next(KPIS);
      kpis.complete();
      await loading;
    });

    it('descarta la respuesta de una recarga anterior que llega tarde', async () => {
      const slow = new Subject<DashboardKpis>();
      dashboardApi.kpis.mockReturnValueOnce(slow);
      const first = store.refresh();

      dashboardApi.kpis.mockReturnValueOnce(of({ ...KPIS, total_customers: 9 }));
      await store.refresh();

      slow.next({ ...KPIS, total_customers: 1 });
      slow.complete();
      await first;

      expect(store.kpis().total_customers).toBe(9);
    });
  });

  describe('recarga por actividad en vivo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('recarga una sola vez tras 1 s sin eventos', async () => {
      const subscription = store.connectActivity();

      changes.next(activity('doc-2', '2026-10-02T09:00:00.000Z'));
      await vi.advanceTimersByTimeAsync(500);
      changes.next(activity('doc-3', '2026-10-03T09:00:00.000Z'));
      await vi.advanceTimersByTimeAsync(999);
      expect(dashboardApi.kpis).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);

      expect(dashboardApi.kpis).toHaveBeenCalledTimes(1);
      expect(store.newEvents()).toBe(2);
      subscription.unsubscribe();
    });

    it('cancela la recarga pendiente al cancelar la suscripción', async () => {
      const subscription = store.connectActivity();

      changes.next(activity('doc-2', '2026-10-02T09:00:00.000Z'));
      subscription.unsubscribe();
      await vi.advanceTimersByTimeAsync(1000);

      expect(dashboardApi.kpis).not.toHaveBeenCalled();
    });
  });

  describe('actividad en vivo', () => {
    it('escucha la colección de actividad y añade cada evento al principio del feed', async () => {
      await store.load();
      const subscription = store.connectActivity();

      changes.next(activity('doc-2', '2026-10-02T09:00:00.000Z'));

      expect(documents.changes$).toHaveBeenCalledWith('activity');
      expect(store.latestActivity().map((item) => item.id)).toEqual(['doc-2', 'doc-1']);
      expect(store.newEvents()).toBe(1);
      subscription.unsubscribe();
    });

    it('no duplica ni cuenta un evento que ya está en el feed', async () => {
      await store.load();
      const subscription = store.connectActivity();

      changes.next(ACTIVITY);

      expect(store.latestActivity()).toHaveLength(1);
      expect(store.newEvents()).toBe(0);
      subscription.unsubscribe();
    });

    it('conserva un evento recibido mientras la carga REST sigue en curso', async () => {
      const latest = new Subject<DocumentRecord<ActivityData>[]>();
      documents.latest.mockReturnValue(latest);
      const subscription = store.connectActivity();
      const loading = store.load();

      changes.next(activity('doc-2', '2026-10-02T09:00:00.000Z'));
      latest.next([ACTIVITY]);
      latest.complete();
      await loading;

      expect(store.latestActivity().map((item) => item.id)).toEqual(['doc-2', 'doc-1']);
      subscription.unsubscribe();
    });

    it('limita el feed a las 20 entradas más recientes', () => {
      const subscription = store.connectActivity();

      for (let day = 1; day <= 21; day++) {
        changes.next(activity(`doc-${day}`, `2026-10-${String(day).padStart(2, '0')}T09:00:00.000Z`));
      }

      expect(store.latestActivity()).toHaveLength(20);
      expect(store.latestActivity()[0].id).toBe('doc-21');
      expect(store.latestActivity().some((item) => item.id === 'doc-1')).toBe(false);
      subscription.unsubscribe();
    });

    it('pone el contador a cero al marcar los eventos como vistos y al reconectar', () => {
      const subscription = store.connectActivity();
      changes.next(activity('doc-2', '2026-10-02T09:00:00.000Z'));
      expect(store.newEvents()).toBe(1);

      store.markEventsSeen();
      expect(store.newEvents()).toBe(0);

      changes.next(activity('doc-3', '2026-10-03T09:00:00.000Z'));
      subscription.unsubscribe();
      store.connectActivity().unsubscribe();
      expect(store.newEvents()).toBe(0);
    });

    it('deja de recibir eventos al cancelar la suscripción', () => {
      const subscription = store.connectActivity();
      expect(changes.observed).toBe(true);

      subscription.unsubscribe();

      expect(changes.observed).toBe(false);
    });

    it('guarda un aviso si falla el canal, sin afectar a la carga', async () => {
      await store.load();
      store.connectActivity();

      changes.error(new Error('canal caído'));

      expect(store.liveError()).toContain('actividad en vivo');
      expect(store.hasError()).toBe(false);
      expect(store.latestActivity()).toHaveLength(1);
    });
  });

  it('restablece el estado inicial', async () => {
    await store.load();

    store.reset();

    expect(store.kpis()).toEqual({
      total_products: 0,
      total_customers: 0,
      total_orders: 0,
      total_revenue: 0,
      low_stock_products: 0,
    });
    expect(store.orders()).toEqual([]);
    expect(store.latestActivity()).toEqual([]);
  });
});
