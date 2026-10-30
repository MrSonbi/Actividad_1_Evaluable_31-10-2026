import type { WritableSignal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController, provideIonicAngular } from '@ionic/angular/standalone';

import { AuthStore } from '../../core/auth/auth.store';
import { CustomersStore } from '../../core/data/customers.store';
import { CustomersApi } from '../../core/data/sql/customers.api';
import type { Customer } from '../../core/models/customer.model';
import { ReportService } from '../../shared/utils/report/report.service';

import { CustomersPage } from './customers.page';

const CUSTOMER: Customer = {
  id: 4,
  full_name: 'Ana Pérez',
  email: 'ana.perez@example.com',
  phone: '600000000',
  city: 'Valencia',
  created_at: '2026-09-20T10:00:00.000Z',
};

describe('CustomersPage', () => {
  let fixture: ComponentFixture<CustomersPage>;
  let isAdmin: WritableSignal<boolean>;
  let store: Record<string, unknown>;
  let reports: { exportTable: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    isAdmin = signal(true);
    reports = { exportTable: vi.fn(async () => undefined) };
    const error = signal<string | null>(null);
    store = {
      items: signal<Customer[]>([CUSTOMER]),
      loading: signal(false),
      error,
      hasError: computed(() => error() !== null),
      load: vi.fn(async () => undefined),
      clearError: vi.fn(),
      create: vi.fn(async () => true),
      update: vi.fn(async () => true),
      remove: vi.fn(async () => true),
    };

    await TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [
        provideIonicAngular(),
        { provide: AuthStore, useValue: { isAdmin } },
        { provide: CustomersStore, useValue: store },
        { provide: CustomersApi, useValue: { exists: vi.fn() } },
        { provide: AlertController, useValue: { create: vi.fn() } },
        { provide: ToastController, useValue: { create: vi.fn() } },
        { provide: ReportService, useValue: reports },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomersPage);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

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
        expect.objectContaining({ title: 'Directorio de clientes', filename: 'clientes', rows: [CUSTOMER] }),
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

  it('carga los clientes al iniciar y los muestra en la tabla', () => {
    fixture.detectChanges();

    expect(store['load']).toHaveBeenCalled();
    expect(text()).toContain('Ana Pérez');
    expect(text()).toContain('ana.perez@example.com');
    expect(text()).toContain('Valencia');
  });

  it('permite editar a cualquier usuario y eliminar solo al administrador', () => {
    fixture.detectChanges();

    expect(text()).toContain('Nuevo cliente');
    expect(text()).toContain('Editar');
    expect(text()).toContain('Eliminar');
  });

  it('oculta el borrado a un usuario normal pero mantiene la edición', () => {
    isAdmin.set(false);
    fixture.detectChanges();

    expect(text()).toContain('Editar');
    expect(text()).not.toContain('Eliminar');
    expect(text()).toContain('Ana Pérez');
  });
});
