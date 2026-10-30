import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ENVIRONMENT } from '../../config/environment.token';

import { ProductsApi } from './products.api';

const BASE = 'https://test.supabase.co/rest/v1/products';

describe('ProductsApi', () => {
  let api: ProductsApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'k' } },
      ],
    });

    api = TestBed.inject(ProductsApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lista productos con la categoría embebida y la aplana', async () => {
    const promise = firstValueFrom(api.list({ search: 'tecl', page: 1, pageSize: 10 }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('select')).toBe('*,categories(name)');
    expect(req.request.params.get('name')).toBe('ilike.*tecl*');
    expect(req.request.params.get('order')).toBe('name.asc');
    expect(req.request.params.get('limit')).toBe('10');
    expect(req.request.params.get('offset')).toBe('0');

    req.flush([
      {
        id: 1,
        sku: 'SKU-1',
        name: 'Teclado',
        category_id: 4,
        price: 25.5,
        stock: 8,
        created_at: '2026-01-01T00:00:00Z',
        categories: { name: 'Periféricos' },
      },
    ]);

    const products = await promise;
    expect(products).toHaveLength(1);
    expect(products[0].category_name).toBe('Periféricos');
    expect(products[0]).not.toHaveProperty('categories');
  });

  it('recupera todos los productos por bloques y aplana la categoría', async () => {
    const promise = firstValueFrom(api.listAll());

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.headers.get('Range')).toBe('0-499');
    expect(req.request.headers.get('Prefer')).toBe('count=exact');
    expect(req.request.params.get('select')).toBe('*,categories(name)');
    expect(req.request.params.get('order')).toBe('name.asc');

    req.flush(
      [
        {
          id: 1,
          sku: 'SKU-1',
          name: 'Monitor',
          category_id: 4,
          price: 199,
          stock: 3,
          created_at: '2026-01-01T00:00:00Z',
          categories: { name: 'Pantallas' },
        },
        {
          id: 2,
          sku: 'SKU-2',
          name: 'Teclado',
          category_id: 4,
          price: 25.5,
          stock: 8,
          created_at: '2026-01-02T00:00:00Z',
          categories: null,
        },
      ],
      { headers: { 'Content-Range': '0-1/2' } },
    );

    const products = await promise;
    expect(products).toHaveLength(2);
    expect(products[0].category_name).toBe('Pantallas');
    expect(products[1].category_name).toBeNull();
  });

  it('pagina y devuelve el total de coincidencias', async () => {
    const promise = firstValueFrom(api.page({ page: 3, pageSize: 5 }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.headers.get('Range')).toBe('10-14');
    expect(req.request.headers.get('Prefer')).toBe('count=exact');

    req.flush([], { headers: { 'Content-Range': '10-14/22' } });

    await expect(promise).resolves.toEqual({ rows: [], total: 22 });
  });

  it('filtra por categoría', async () => {
    const promise = firstValueFrom(api.list({ categoryId: 4 }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('category_id')).toBe('eq.4');

    req.flush([]);
    await promise;
  });

  it('recupera un producto por id y devuelve null si no existe', async () => {
    const promise = firstValueFrom(api.getById(9));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('id')).toBe('eq.9');

    req.flush([]);
    await expect(promise).resolves.toBeNull();
  });

  it('comprueba el SKU excluyendo el producto que se edita', async () => {
    const promise = firstValueFrom(api.skuExists('SKU-1', 3));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('sku')).toBe('eq.SKU-1');
    expect(req.request.params.get('id')).toBe('neq.3');

    req.flush([{ id: 3 }]);
    await expect(promise).resolves.toBe(true);
  });
});
