import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../http/api-error';
import type { ProductWithCategory } from '../models/product.model';

import { ActivityLogService } from './activity-log.service';
import { ProductsStore } from './products.store';
import { ProductsApi } from './sql/products.api';

const PRODUCT: ProductWithCategory = {
  id: 1,
  sku: 'SKU-1',
  name: 'Teclado',
  category_id: 2,
  price: 25.5,
  stock: 4,
  created_at: '2026-01-01T00:00:00Z',
  category_name: 'Periféricos',
};

describe('ProductsStore', () => {
  let api: {
    page: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let activity: { log: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof ProductsStore>;

  beforeEach(() => {
    api = {
      page: vi.fn(() => of({ rows: [PRODUCT], total: 1 })),
      create: vi.fn(() => of(PRODUCT)),
      update: vi.fn(() => of(PRODUCT)),
      remove: vi.fn(() => of(undefined)),
    };
    activity = { log: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductsApi, useValue: api },
        { provide: ActivityLogService, useValue: activity },
      ],
    });

    store = TestBed.inject(ProductsStore);
  });

  it('carga la página con los filtros activos', async () => {
    await store.load();

    expect(api.page).toHaveBeenCalledWith({ page: 1, pageSize: 25, search: '', categoryId: null });
    expect(store.items()).toEqual([PRODUCT]);
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('guarda el mensaje de error si la carga falla', async () => {
    api.page.mockReturnValue(throwError(() => new ApiError('Sin permisos', 403, '42501')));

    await store.load();

    expect(store.error()).toBe('Sin permisos');
    expect(store.loading()).toBe(false);
    expect(store.hasError()).toBe(true);
  });

  it('vuelve a la primera página al buscar', async () => {
    await store.setPage(3);
    await store.setSearch('tecl');

    expect(store.page()).toBe(1);
    expect(api.page).toHaveBeenLastCalledWith({ page: 1, pageSize: 25, search: 'tecl', categoryId: null });
  });

  it('registra la actividad al crear y recarga el listado', async () => {
    const created = await store.create({ sku: 'SKU-1', name: 'Teclado', category_id: 2, price: 25.5, stock: 4 });

    expect(created).toBe(true);
    expect(activity.log).toHaveBeenCalledWith('create', 'product', 1, 'Producto creado: Teclado');
    expect(api.page).toHaveBeenCalledTimes(1);
  });

  it('devuelve false y guarda el error si el borrado falla', async () => {
    api.remove.mockReturnValue(throwError(() => new ApiError('No tienes permisos', 403, '42501')));

    const removed = await store.remove(PRODUCT);

    expect(removed).toBe(false);
    expect(store.error()).toBe('No tienes permisos');
    expect(activity.log).not.toHaveBeenCalled();
  });
});
