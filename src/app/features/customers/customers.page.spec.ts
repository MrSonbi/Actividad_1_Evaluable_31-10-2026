import type { WritableSignal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController, provideIonicAngular } from '@ionic/angular/standalone';

import { AuthStore } from '../../core/auth/auth.store';
import { CustomersStore } from '../../core/data/customers.store';
import { CustomersApi } from '../../core/data/sql/customers.api';
import type { Customer } from '../../core/models/customer.model';

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

  beforeEach(async () => {
    isAdmin = signal(true);
    const error = signal<string | null>(null);
    store = {
      items: signal<Customer[]>([CUSTOMER]),
      loading: signal(false),
      error,
      hasError: computed(() => error() !== null),
      load: vi.fn(async () => undefined),
      setSearch: vi.fn(async () => undefined),
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
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomersPage);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

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
