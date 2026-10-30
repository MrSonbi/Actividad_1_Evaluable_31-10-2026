import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../http/api-error';
import type { Product, ProductWithCategory } from '../models/product.model';

import { ActivityLogService } from './activity-log.service';
import { ProductsStore } from './products.store';
import { CategoriesApi } from './sql/categories.api';
import { ProductsApi } from './sql/products.api';

const CATEGORY = { id: 2, name: 'Periféricos' };

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

const CREATED: Product = {
  id: 2,
  sku: 'SKU-2',
  name: 'Ratón',
  category_id: 2,
  price: 15,
  stock: 10,
  created_at: '2026-02-01T00:00:00Z',
};

/** Catálogo ficticio de 40 productos, como el del entorno real. */
const CATALOG: ProductWithCategory[] = Array.from({ length: 40 }, (_, index) => ({
  ...PRODUCT,
  id: index + 1,
  sku: `SKU-${String(index + 1).padStart(3, '0')}`,
  name: `Producto ${String(index + 1).padStart(2, '0')}`,
}));

describe('ProductsStore', () => {
  let api: {
    listAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let activity: { log: ReturnType<typeof vi.fn> };
  let categories: { list: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof ProductsStore>;

  beforeEach(() => {
    api = {
      listAll: vi.fn(() => of(CATALOG)),
      create: vi.fn(() => of(CREATED)),
      update: vi.fn(() => of(PRODUCT)),
      remove: vi.fn(() => of(undefined)),
    };
    activity = { log: vi.fn() };
    categories = { list: vi.fn(() => of([CATEGORY])) };

    TestBed.configureTestingModule({
      providers: [
        { provide: ProductsApi, useValue: api },
        { provide: CategoriesApi, useValue: categories },
        { provide: ActivityLogService, useValue: activity },
      ],
    });

    store = TestBed.inject(ProductsStore);
  });

  it('carga el catálogo completo, no solo la primera página', async () => {
    await store.load();

    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(store.items()).toHaveLength(40);
    expect(store.total()).toBe(40);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('guarda el mensaje de error si la carga falla', async () => {
    api.listAll.mockReturnValue(throwError(() => new ApiError('Sin permisos', 403, '42501')));

    await store.load();

    expect(store.error()).toBe('Sin permisos');
    expect(store.loading()).toBe(false);
    expect(store.hasError()).toBe(true);
  });

  it('inserta el alta al principio de la lista sin recargar el catálogo', async () => {
    await store.load();
    await store.loadCategories();

    const created = await store.create({ sku: 'SKU-2', name: 'Ratón', category_id: 2, price: 15, stock: 10 });

    expect(created).toBe(true);
    expect(store.items()[0]).toEqual({ ...CREATED, category_name: 'Periféricos' });
    expect(store.total()).toBe(41);
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('create', 'product', 2, 'Producto creado: Ratón');
  });

  it('reemplaza la fila editada sin recargar el catálogo', async () => {
    await store.load();
    await store.loadCategories();
    api.update.mockReturnValue(of({ ...PRODUCT, name: 'Teclado nuevo', stock: 9 }));

    const updated = await store.update(1, { name: 'Teclado nuevo', stock: 9 });

    expect(updated).toBe(true);
    expect(store.items()).toHaveLength(40);
    expect(store.items()[0]).toMatchObject({ id: 1, name: 'Teclado nuevo', stock: 9 });
    expect(store.items()[0].category_name).toBe('Periféricos');
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('update', 'product', 1, 'Producto actualizado: Teclado nuevo');
  });

  it('elimina la fila de la lista sin recargar el catálogo', async () => {
    await store.load();

    const removed = await store.remove(PRODUCT);

    expect(removed).toBe(true);
    expect(store.items()).toHaveLength(39);
    expect(store.items().some((product) => product.id === PRODUCT.id)).toBe(false);
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('delete', 'product', 1, 'Producto eliminado: Teclado');
  });

  it('carga las categorías del formulario', async () => {
    await store.loadCategories();

    expect(categories.list).toHaveBeenCalled();
    expect(store.categories()).toEqual([CATEGORY]);
  });

  it('devuelve false y guarda el error si el borrado falla', async () => {
    api.remove.mockReturnValue(throwError(() => new ApiError('No tienes permisos', 403, '42501')));

    const removed = await store.remove(PRODUCT);

    expect(removed).toBe(false);
    expect(store.error()).toBe('No tienes permisos');
    expect(activity.log).not.toHaveBeenCalled();
  });
});
