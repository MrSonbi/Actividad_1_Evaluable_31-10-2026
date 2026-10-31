import { computed, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ToastController, provideIonicAngular } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';

import { DashboardStore } from '../../core/data/dashboard.store';
import type { DashboardKpis, ProductsByCategory } from '../../core/models/dashboard.model';
import type { OrderWithCustomer } from '../../core/models/order.model';
import type { ActivityFeedItem } from '../../shared/models/activity-feed.model';
import { ChartThemeService } from '../../shared/utils/chart-theme.service';
import { ReportService } from '../../shared/utils/report/report.service';

import { DashboardPage } from './dashboard.page';

vi.mock('chart.js/auto', () => ({
  default: class MockChart {
    static defaults: Record<string, unknown> = {};

    destroyed = false;
    data: unknown;

    constructor(_canvas: unknown, config: { data: unknown }) {
      this.data = config.data;
    }

    update(): void {
      return undefined;
    }

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

/** Pedido cancelado de hace cuatro meses: entra en 6 meses, pero no en 3. */
const OLD_ORDER: OrderWithCustomer = {
  ...ORDER,
  id: 2,
  status: 'cancelled',
  total: 50,
  created_at: new Date(new Date().getFullYear(), new Date().getMonth() - 4, 15).toISOString(),
};

const ACTIVITY: ActivityFeedItem = {
  id: 'doc-1',
  action: 'create',
  entity: 'product',
  entityId: 3,
  summary: 'Alta del producto TEC-001',
  actor: 'demo@example.com',
  at: '2026-10-01T09:00:00.000Z',
};

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let store: Record<string, unknown>;
  let loading: WritableSignal<boolean>;
  let error: WritableSignal<string | null>;
  let newEvents: WritableSignal<number>;
  let liveError: WritableSignal<string | null>;
  let latestActivity: WritableSignal<ActivityFeedItem[]>;
  let liveSubscription: Subscription;
  let reports: { exportTable: ReturnType<typeof vi.fn> };
  let toasts: { create: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    loading = signal(true);
    error = signal<string | null>(null);
    newEvents = signal(0);
    liveError = signal<string | null>(null);
    latestActivity = signal<ActivityFeedItem[]>([]);
    liveSubscription = new Subscription();
    reports = { exportTable: vi.fn(async () => undefined) };
    toasts = { create: vi.fn() };
    store = {
      kpis: signal<DashboardKpis>(KPIS),
      byCategory: signal<ProductsByCategory[]>(BY_CATEGORY),
      orders: signal<OrderWithCustomer[]>([ORDER, OLD_ORDER]),
      latestActivity,
      newEvents,
      liveError,
      loading,
      error,
      hasError: computed(() => error() !== null),
      load: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      connectActivity: vi.fn(() => liveSubscription),
      markEventsSeen: vi.fn(() => newEvents.set(0)),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideIonicAngular(),
        { provide: DashboardStore, useValue: store },
        { provide: ToastController, useValue: toasts },
        {
          provide: ChartThemeService,
          useValue: {
            colors: signal({
              text: '#d6d8dc',
              grid: '#3a3b3f',
              surface: '#1e1e1e',
              primary: '#6ea8ff',
              status: ['#fbbf24', '#6ea8ff', '#2dd4bf', '#f87171'],
            }),
          },
        },
        { provide: ReportService, useValue: reports },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function text(): string {
    return element().textContent ?? '';
  }

  /**
   * Devuelve un elemento que debe existir.
   *
   * @param selector Selector CSS
   */
  function find(selector: string): HTMLElement {
    const found = element().querySelector<HTMLElement>(selector);
    if (!found) throw new Error(`No se encontró ${selector}`);
    return found;
  }

  /**
   * Cambia el valor de un `select` y repinta la vista.
   *
   * @param selector Selector CSS del `select`
   * @param value Valor seleccionado
   */
  function choose(selector: string, value: string): void {
    const select = find(selector) as HTMLSelectElement;
    select.value = value;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  /** Textos de las tarjetas de los indicadores que dependen de los filtros. */
  function periodCards(): string[] {
    return Array.from(element().querySelectorAll('section[aria-label="Indicadores del periodo"] app-stat-card')).map(
      (card) => card.textContent ?? '',
    );
  }

  /** Resúmenes textuales de los gráficos. */
  function captions(): string[] {
    return Array.from(element().querySelectorAll('figcaption')).map((caption) => caption.textContent ?? '');
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

    const cards = Array.from(element().querySelectorAll('section[aria-label="Indicadores principales"] app-stat-card'));
    expect(cards).toHaveLength(5);

    const texts = cards.map((card) => card.textContent ?? '');
    expect(texts[0]).toContain('Productos');
    expect(texts[0]).toContain('12');
    expect(texts[1]).toContain('Clientes');
    expect(texts[2]).toContain('Pedidos');
    expect(texts[3]).toContain('Ingresos');
    expect(texts[3]).toContain('1234,56');
    expect(texts[4]).toContain('Productos con poco stock');
    expect(texts[4]).toContain('2');
  });

  it('muestra los tres gráficos con etiqueta accesible y resumen textual', () => {
    loading.set(false);
    fixture.detectChanges();

    const canvases = Array.from(element().querySelectorAll('canvas'));
    expect(canvases).toHaveLength(3);

    const labels = canvases.map((canvas) => canvas.getAttribute('aria-label'));
    expect(labels).toContain('Ingresos por mes de los últimos 12 meses');
    expect(labels).toContain('Pedidos por estado de los últimos 12 meses');
    expect(labels).toContain('Productos por categoría');

    expect(captions().some((caption) => caption.includes('Periféricos: 7 productos'))).toBe(true);
    expect(captions().some((caption) => caption.includes('99,90'))).toBe(true);
    expect(captions().some((caption) => caption.includes('Pagado: 1 pedido (50 %)'))).toBe(true);
  });

  it('tiene un único h1 sin saltos de nivel hasta los títulos de los gráficos', () => {
    loading.set(false);
    fixture.detectChanges();

    const levels = Array.from(element().querySelectorAll('h1, h2, h3')).map((heading) => heading.tagName);

    expect(levels.filter((level) => level === 'H1')).toHaveLength(1);
    expect(levels[1]).toBe('H2');
    expect(element().querySelector('ion-content')?.getAttribute('role')).toBe('main');
  });

  it('colorea los gráficos con el tema y separa los sectores con el color del panel', () => {
    loading.set(false);
    fixture.detectChanges();

    const page = fixture.componentInstance as unknown as {
      statusData: () => { datasets: { backgroundColor: string[]; borderColor: string }[] };
      revenueData: () => { datasets: { borderColor: string }[] };
    };

    expect(page.statusData().datasets[0].borderColor).toBe('#1e1e1e');
    expect(page.statusData().datasets[0].backgroundColor).toContain('#fbbf24');
    expect(page.revenueData().datasets[0].borderColor).toBe('#6ea8ff');
  });

  describe('filtros', () => {
    beforeEach(() => {
      loading.set(false);
      fixture.detectChanges();
    });

    it('recalcula los indicadores y los gráficos al cambiar el periodo, sin volver a pedir datos', () => {
      expect(periodCards()[0]).toContain('2');

      choose('#dashboard-period', '3');

      expect(periodCards()[0]).toContain('1');
      expect(find('.filters__result').textContent).toContain('1 pedido en los últimos 3 meses');
      expect(element().querySelector('canvas[aria-label="Ingresos por mes de los últimos 3 meses"]')).not.toBeNull();
      expect(captions().some((caption) => caption.includes('Pagado: 1 pedido (100 %)'))).toBe(true);
      expect(store['load']).toHaveBeenCalledTimes(1);
    });

    it('recalcula los indicadores al cambiar el estado, sin volver a pedir datos', () => {
      choose('app-order-status-filter select', 'cancelled');

      const cards = periodCards();
      expect(cards[0]).toContain('1');
      expect(cards[1]).toContain('0,00');
      expect(find('.filters__result').textContent).toContain('estado cancelado');
      expect(captions().some((caption) => caption.includes('Cancelado: 1 pedido (100 %)'))).toBe(true);
      expect(store['load']).toHaveBeenCalledTimes(1);
    });

    it('no cambia los indicadores generales al filtrar', () => {
      choose('#dashboard-period', '3');

      const general = find('section[aria-label="Indicadores principales"]').textContent;
      expect(general).toContain('1234,56');
    });

    it('sustituye la rosquilla por un estado vacío si ningún pedido cumple los filtros', () => {
      choose('app-order-status-filter select', 'shipped');

      expect(element().querySelector('canvas[aria-label^="Pedidos por estado"]')).toBeNull();
      expect(find('.chart-panel__empty app-empty-state').textContent).toContain('Sin pedidos');
      expect(find('.filters__result').textContent).toContain('0 pedidos');
    });
  });

  describe('al volver a entrar', () => {
    it('no recarga en la primera entrada y recarga en silencio en las siguientes', () => {
      fixture.detectChanges();

      fixture.componentInstance.ionViewWillEnter();
      expect(store['refresh']).not.toHaveBeenCalled();
      expect(store['load']).toHaveBeenCalledTimes(1);

      fixture.componentInstance.ionViewWillEnter();
      expect(store['refresh']).toHaveBeenCalledTimes(1);
      expect(store['load']).toHaveBeenCalledTimes(1);
    });

    it('mantiene los filtros y no muestra el spinner al recargar', () => {
      loading.set(false);
      fixture.detectChanges();
      choose('#dashboard-period', '3');

      fixture.componentInstance.ionViewWillEnter();
      fixture.componentInstance.ionViewWillEnter();
      fixture.detectChanges();

      expect((find('#dashboard-period') as HTMLSelectElement).value).toBe('3');
      expect(find('.filters__result').textContent).toContain('últimos 3 meses');
      expect(element().querySelector('.dashboard-state')).toBeNull();
    });
  });

  describe('actividad en vivo', () => {
    it('abre la suscripción al iniciar y la cancela al destruir la página', () => {
      fixture.detectChanges();

      expect(store['connectActivity']).toHaveBeenCalledTimes(1);
      expect(liveSubscription.closed).toBe(false);

      fixture.destroy();

      expect(liveSubscription.closed).toBe(true);
    });

    it('pinta las entradas del feed', () => {
      loading.set(false);
      latestActivity.set([ACTIVITY]);
      fixture.detectChanges();

      expect(find('app-activity-feed').textContent).toContain('Alta del producto TEC-001');
    });

    it('muestra el contador en la barra superior y lo pone a cero al pulsarlo', () => {
      newEvents.set(2);
      fixture.detectChanges();

      expect(find('ion-toolbar ion-badge').textContent).toContain('2');
      expect(find('.new-events').textContent).toContain('2 eventos nuevos. Marcar como vistos');

      find('.new-events').dispatchEvent(new Event('click'));
      fixture.detectChanges();

      expect(store['markEventsSeen']).toHaveBeenCalledTimes(1);
      expect(find('ion-toolbar ion-badge').textContent).toContain('0');
      expect(find('.new-events').textContent).toContain('Sin eventos nuevos');
    });

    it('avisa si falla el canal sin ocultar el resto del dashboard', () => {
      loading.set(false);
      liveError.set('No se pudo conectar con la actividad en vivo.');
      fixture.detectChanges();

      expect(find('.live-activity [role="alert"]').textContent).toContain('actividad en vivo');
      expect(element().querySelectorAll('canvas')).toHaveLength(3);
    });
  });

  describe('exportación', () => {
    beforeEach(() => {
      loading.set(false);
      fixture.detectChanges();
    });

    /** Filas enviadas en la última exportación. */
    function exportedRows(): { section: string; indicator: string; value: string }[] {
      const calls = reports.exportTable.mock.calls;
      return (calls[calls.length - 1][1] as { rows: { section: string; indicator: string; value: string }[] }).rows;
    }

    it('exporta el resumen con los indicadores y las series en el formato pedido', () => {
      find('[data-export="pdf"]').dispatchEvent(new Event('click'));

      expect(reports.exportTable).toHaveBeenCalledWith(
        'pdf',
        expect.objectContaining({
          title: 'Resumen del dashboard',
          filename: 'dashboard',
          subtitle: expect.stringContaining('2 pedidos'),
        }),
      );
      expect(exportedRows()).toEqual(
        expect.arrayContaining([
          { section: 'Indicadores generales', indicator: 'Clientes', value: '4' },
          { section: 'Periodo', indicator: 'Pedidos del periodo', value: '2' },
          { section: 'Pedidos por estado', indicator: 'Cancelado', value: '1' },
          { section: 'Productos por categoría', indicator: 'Monitores', value: '5' },
        ]),
      );
      expect(exportedRows().filter((row) => row.section === 'Ingresos por mes')).toHaveLength(12);
    });

    it('aplica los filtros al resumen exportado', () => {
      choose('#dashboard-period', '3');
      find('[data-export="csv"]').dispatchEvent(new Event('click'));

      expect(reports.exportTable).toHaveBeenCalledWith(
        'csv',
        expect.objectContaining({ subtitle: expect.stringContaining('últimos 3 meses') }),
      );
      expect(exportedRows()).toContainEqual({ section: 'Periodo', indicator: 'Pedidos del periodo', value: '1' });
      expect(exportedRows().filter((row) => row.section === 'Ingresos por mes')).toHaveLength(3);
    });

    it('avisa si el informe no se puede generar', async () => {
      const present = vi.fn(async () => undefined);
      toasts.create.mockResolvedValue({ present });
      reports.exportTable.mockRejectedValue(new Error('sin red'));

      find('[data-export="pdf"]').dispatchEvent(new Event('click'));

      await vi.waitFor(() => expect(present).toHaveBeenCalled());
      expect(toasts.create).toHaveBeenCalledWith(expect.objectContaining({ color: 'danger' }));
    });
  });

  it('muestra el error y permite reintentar la carga', () => {
    loading.set(false);
    error.set('No se pudieron cargar los datos del dashboard.');
    fixture.detectChanges();

    const alert = element().querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudieron cargar los datos del dashboard.');

    find('.dashboard-state--error ion-button').dispatchEvent(new Event('click'));

    expect(store['load']).toHaveBeenCalledTimes(2);
  });
});
