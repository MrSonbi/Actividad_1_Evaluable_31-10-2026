import type { WritableSignal } from '@angular/core';
import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AlertController, ToastController, provideIonicAngular } from '@ionic/angular/standalone';

import { AuthStore } from '../../core/auth/auth.store';
import { ProductsStore } from '../../core/data/products.store';
import { ProductsApi } from '../../core/data/sql/products.api';
import type { Category } from '../../core/models/category.model';
import type { ProductWithCategory } from '../../core/models/product.model';

import { ProductsPage } from './products.page';

const PRODUCT: ProductWithCategory = {
  id: 1,
  sku: 'TEC-001',
  name: 'Teclado mecánico',
  category_id: 2,
  category_name: 'Periféricos',
  price: 79.9,
  stock: 12,
  created_at: '2026-09-12T10:00:00.000Z',
};

const CATEGORY: Category = { id: 2, name: 'Periféricos' };

describe('ProductsPage', () => {
  let fixture: ComponentFixture<ProductsPage>;
  let isAdmin: WritableSignal<boolean>;
  let store: Record<string, unknown>;

  beforeEach(async () => {
    isAdmin = signal(true);
    const items = signal<ProductWithCategory[]>([PRODUCT]);
    const error = signal<string | null>(null);
    store = {
      items,
      loading: signal(false),
      error,
      hasError: computed(() => error() !== null),
      categories: signal<Category[]>([CATEGORY]),
      load: vi.fn(async () => undefined),
      loadCategories: vi.fn(async () => undefined),
      setSearch: vi.fn(async () => undefined),
      clearError: vi.fn(),
      create: vi.fn(async () => true),
      update: vi.fn(async () => true),
      remove: vi.fn(async () => true),
    };

    await TestBed.configureTestingModule({
      imports: [ProductsPage],
      providers: [
        provideIonicAngular(),
        { provide: AuthStore, useValue: { isAdmin } },
        { provide: ProductsStore, useValue: store },
        { provide: ProductsApi, useValue: { exists: vi.fn() } },
        { provide: AlertController, useValue: { create: vi.fn() } },
        { provide: ToastController, useValue: { create: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsPage);
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('carga el catálogo al iniciar y muestra los datos reales del store', () => {
    fixture.detectChanges();

    expect(store['load']).toHaveBeenCalled();
    expect(text()).toContain('TEC-001');
    expect(text()).toContain('Teclado mecánico');
    expect(text()).toContain('Periféricos');
  });

  it('muestra el alta y las acciones de escritura al administrador', () => {
    fixture.detectChanges();

    expect(text()).toContain('Nuevo producto');
    expect(text()).toContain('Editar');
    expect(text()).toContain('Eliminar');
  });

  it('oculta el alta y las acciones de escritura a un usuario normal', () => {
    isAdmin.set(false);
    fixture.detectChanges();

    expect(text()).not.toContain('Nuevo producto');
    expect(text()).not.toContain('Editar');
    expect(text()).not.toContain('Eliminar');
    expect(text()).toContain('TEC-001');
  });
});
