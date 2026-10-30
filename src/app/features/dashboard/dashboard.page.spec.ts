import { computed, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { DashboardStore } from '../../core/data/dashboard.store';
import type { DashboardKpis, ProductsByCategory } from '../../core/models/dashboard.model';
import type { OrderWithCustomer } from '../../core/models/order.model';
import type { ActivityFeedItem } from '../../shared/models/activity-feed.model';

import { DashboardPage } from './dashboard.page';

vi.mock('chart.js/auto', () => ({
  default: class MockChart {
    destroyed = false;

    destroy(): void {
      this.destroyed = true;
    }
  },
}));

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

/** Pedido del mes actual, para que siempre caiga dentro de la ventana. */
const ORDER: OrderWithCustomer = {
  id: 1,
  customer_id: 1,
  customer_name: 'Ana Pérez',
  status: 'paid',
  total: 99.9,
  created_at: new Date().toISOString(),
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let store: Record<string, unknown>;
  let loading: WritableSignal<boolean>;
  let error: WritableSignal<string | null>;

  beforeEach(async () => {
    loading = signal(true);
    error = signal<string | null>(null);
    store = {
      kpis: signal<DashboardKpis>(KPIS),
      byCategory: signal<ProductsByCategory[]>(BY_CATEGORY),
      orders: signal<OrderWithCustomer[]>([ORDER]),
      latestActivity: signal<ActivityFeedItem[]>([]),
      loading,
      error,
      hasError: computed(() => error() !== null),
      load: vi.fn(async () => undefined),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideIonicAngular(), { provide: DashboardStore, useValue: store }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return element().textContent ?? '';
  }

  it('carga los datos al iniciar y muestra un spinner accesible', () => {
    fixture.detectChanges();

    expect(store['load']).toHaveBeenCalledTimes(1);
    expect(text()).toContain('Cargando los indicadores');
    const status = element().querySelector('[role="status"]');
    expect(status?.getAttribute('aria-busy')).toBe('true');
  });

  it('pinta los cinco indicadores con su valor formateado', () => {
    loading.set(false);
    fixture.detectChanges();

    const cards = Array.from(element().querySelectorAll('app-stat-card'));
    expect(cards).toHaveLength(5);

    const texts = cards.map((card) => card.textContent ?? '');
    expect(texts[0]).toContain('Productos');
    expect(texts[0]).toContain('12');
    expect(texts[1]).toContain('Clientes');
    expect(texts[2]).toContain('Pedidos');
    expect(texts[3]).toContain('Ingresos');
    expect(texts[3]).toContain('1.234,56');
    expect(texts[4]).toContain('Productos con poco stock');
    expect(texts[4]).toContain('2');
  });

  it('muestra los dos gráficos con etiqueta accesible y resumen textual', () => {
    loading.set(false);
    fixture.detectChanges();

    const canvases = Array.from(element().querySelectorAll('canvas'));
    expect(canvases).toHaveLength(2);

    const labels = canvases.map((canvas) => canvas.getAttribute('aria-label'));
    expect(labels).toContain('Ingresos por mes de los últimos 12 meses');
    expect(labels).toContain('Productos por categoría');

    const captions = Array.from(element().querySelectorAll('figcaption')).map((caption) => caption.textContent ?? '');
    expect(captions.some((caption) => caption.includes('Periféricos: 7 productos'))).toBe(true);
    expect(captions.some((caption) => caption.includes('99,90'))).toBe(true);
  });

  it('muestra el error y permite reintentar la carga', () => {
    loading.set(false);
    error.set('No se pudieron cargar los datos del dashboard.');
    fixture.detectChanges();

    const alert = element().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudieron cargar los datos del dashboard.');

    const retry = element().querySelector('ion-button');
    if (!retry) throw new Error('No se encontró el botón de reintentar');
    retry.dispatchEvent(new Event('click'));

    expect(store['load']).toHaveBeenCalledTimes(2);
  });
});
