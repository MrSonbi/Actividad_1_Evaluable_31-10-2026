import type { WritableSignal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ToastController, provideIonicAngular } from '@ionic/angular/standalone';

import { OrdersStore } from '../../core/data/orders.store';
import type { OrderStatus, OrderWithCustomer } from '../../core/models/order.model';
import { ReportService } from '../../shared/utils/report/report.service';

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
  let reports: { exportTable: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    error = signal<string | null>(null);
    reports = { exportTable: vi.fn(async () => undefined) };
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
      providers: [
        provideIonicAngular(),
        { provide: OrdersStore, useValue: store },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: ReportService, useValue: reports },
      ],
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

  describe('exportación', () => {
    /**
     * Botón de exportación de la tabla.
     *
     * @param index 0 para CSV y 1 para PDF
     */
    function exportButton(index: number): HTMLButtonElement {
      return (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('.export-button')[index];
    }

    /**
     * Aplica un texto en el buscador de la tabla.
     *
     * @param value Texto de búsqueda
     */
    async function search(value: string): Promise<void> {
      const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    it('exporta en CSV las filas de la tabla', () => {
      fixture.detectChanges();

      exportButton(0).click();

      expect(reports.exportTable).toHaveBeenCalledWith(
        'csv',
        expect.objectContaining({
          title: 'Listado de pedidos',
          filename: 'pedidos',
          rows: [expect.objectContaining({ id: 7, status_label: 'Pagado' })],
        }),
      );
    });

    it('no permite exportar si la búsqueda no tiene resultados y exporta en PDF al limpiarla', async () => {
      fixture.detectChanges();

      await search('sin coincidencias');
      expect(exportButton(1).disabled).toBe(true);

      await search('');
      exportButton(1).click();

      expect(reports.exportTable).toHaveBeenCalledWith(
        'pdf',
        expect.objectContaining({ subtitle: expect.stringContaining('1 registro') }),
      );
    });

    it('indica en el informe el estado filtrado', () => {
      fixture.detectChanges();
      statusSelect().value = 'paid';
      statusSelect().dispatchEvent(new Event('change'));
      fixture.detectChanges();

      exportButton(1).click();

      expect(reports.exportTable).toHaveBeenCalledWith(
        'pdf',
        expect.objectContaining({ subtitle: 'Estado: Pagado · 1 registro' }),
      );
    });

    it('avisa si el informe no se puede generar', async () => {
      const present = vi.fn(async () => undefined);
      const toasts = TestBed.inject(ToastController) as unknown as { create: ReturnType<typeof vi.fn> };
      toasts.create.mockResolvedValue({ present });
      reports.exportTable.mockRejectedValue(new Error('sin red'));
      fixture.detectChanges();

      exportButton(1).click();

      await vi.waitFor(() => expect(present).toHaveBeenCalled());
      expect(toasts.create).toHaveBeenCalledWith(expect.objectContaining({ color: 'danger' }));
    });
  });

  it('muestra el error del store con un aviso accesible', () => {
    error.set('No se pudieron cargar los pedidos.');
    fixture.detectChanges();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');
    expect(alert?.textContent).toContain('No se pudieron cargar los pedidos.');
  });
});
