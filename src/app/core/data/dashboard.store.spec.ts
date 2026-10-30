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
  let documents: { latest: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof DashboardStore>;

  beforeEach(() => {
    dashboardApi = {
      kpis: vi.fn(() => of(KPIS)),
      productsByCategory: vi.fn(() => of(BY_CATEGORY)),
    };
    ordersApi = { listAll: vi.fn(() => of([ORDER])) };
    documents = { latest: vi.fn(() => of([ACTIVITY])) };

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
