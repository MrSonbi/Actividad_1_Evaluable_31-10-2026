import type { WritableSignal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { OrdersStore } from '../../core/data/orders.store';
import type { OrderStatus, OrderWithCustomer } from '../../core/models/order.model';

import { OrdersPage } from './orders.page';

const ORDER: OrderWithCustomer = {
  id: 7,
  customer_id: 4,
  customer_name: 'Ana Pérez',
  status: 'paid',
  total: 129.9,
  created_at: '2026-10-01T10:00:00.000Z',
};

describe('OrdersPage', () => {
  let fixture: ComponentFixture<OrdersPage>;
  let store: Record<string, unknown>;
  let error: WritableSignal<string | null>;

  beforeEach(async () => {
    error = signal<string | null>(null);
    store = {
      items: signal<OrderWithCustomer[]>([ORDER]),
      loading: signal(false),
      error,
      hasError: computed(() => error() !== null),
      status: signal<OrderStatus | null>(null),
      load: vi.fn(async () => undefined),
      setStatus: vi.fn(async () => undefined),
    };

    await TestBed.configureTestingModule({
      imports: [OrdersPage],
      providers: [provideIonicAngular(), { provide: OrdersStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersPage);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  function statusSelect(): HTMLSelectElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector('app-order-status-filter select');
    if (!element) throw new Error('No se encontró el filtro de estado');
    return element as HTMLSelectElement;
  }

  it('carga los pedidos al iniciar y muestra el cliente y el estado traducido', () => {
    fixture.detectChanges();

    expect(store['load']).toHaveBeenCalled();
    expect(text()).toContain('Ana Pérez');
    expect(text()).toContain('Pagado');
    expect(text()).toContain('129,90');
  });

  it('no ofrece acciones de escritura porque el listado es de solo lectura', () => {
    fixture.detectChanges();

    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Eliminar');
    expect(text()).not.toContain('Nuevo pedido');
  });

  it('recarga el listado con el estado elegido en el filtro', () => {
    fixture.detectChanges();

    expect(statusSelect().value).toBe('');

    statusSelect().value = 'shipped';
    statusSelect().dispatchEvent(new Event('change'));

    expect(store['setStatus']).toHaveBeenCalledWith('shipped');
  });

  it('muestra el error del store con un aviso accesible', () => {
    error.set('No se pudieron cargar los pedidos.');
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudieron cargar los pedidos.');
  });
});
