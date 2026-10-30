import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../http/api-error';
import type { Order, OrderStatus, OrderWithCustomer } from '../models/order.model';

import { ActivityLogService } from './activity-log.service';
import { OrdersStore } from './orders.store';
import { OrdersApi } from './sql/orders.api';

const ORDER: OrderWithCustomer = {
  id: 1,
  customer_id: 1,
  status: 'pending',
  total: 99.9,
  created_at: '2026-01-01T00:00:00Z',
  customer_name: 'Ana Pérez',
};

/** Lista ficticia de 200 pedidos, como la del entorno real. */
const ORDERS: OrderWithCustomer[] = Array.from({ length: 200 }, (_, index) => {
  const statuses: OrderStatus[] = ['pending', 'paid', 'shipped', 'cancelled'];
  return {
    ...ORDER,
    id: index + 1,
    status: statuses[index % statuses.length],
    customer_id: (index % 30) + 1,
  };
});

describe('OrdersStore', () => {
  let api: {
    listAll: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let activity: { log: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof OrdersStore>;

  beforeEach(() => {
    api = {
      listAll: vi.fn(() => of(ORDERS)),
      update: vi.fn((id: number, input: Partial<Order>) => of({ ...ORDER, id, ...input })),
    };
    activity = { log: vi.fn() };

    TestBed.configureTestingModule({
      providers: [{ provide: OrdersApi, useValue: api }, { provide: ActivityLogService, useValue: activity }],
    });

    store = TestBed.inject(OrdersStore);
  });

  it('carga los 200 pedidos, no solo la primera página', async () => {
    await store.load();

    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(store.items()).toHaveLength(200);
    expect(store.total()).toBe(200);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('filtra por estado en el cliente sobre todas las filas', async () => {
    await store.load();

    store.setStatus('paid');

    expect(store.filteredItems()).toHaveLength(50);
    expect(store.filteredItems().every((order) => order.status === 'paid')).toBe(true);
    expect(store.total()).toBe(50);
    expect(api.listAll).toHaveBeenCalledTimes(1);
  });

  it('reemplaza el pedido actualizado sin recargar el listado', async () => {
    await store.load();

    const updated = await store.updateStatus(1, 'shipped');

    expect(updated).toBe(true);
    const order = store.items().find((item) => item.id === 1);
    expect(order).toMatchObject({ id: 1, status: 'shipped', customer_name: 'Ana Pérez' });
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('update', 'order', 1, 'Pedido #1 actualizado a shipped');
  });

  it('guarda el mensaje de error si la carga falla', async () => {
    api.listAll.mockReturnValue(throwError(() => new ApiError('Sin permisos', 403, '42501')));

    await store.load();

    expect(store.error()).toBe('Sin permisos');
    expect(store.loading()).toBe(false);
    expect(store.hasError()).toBe(true);
  });
});
