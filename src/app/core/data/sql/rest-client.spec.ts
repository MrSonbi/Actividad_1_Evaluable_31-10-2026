import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ENVIRONMENT } from '../../config/environment.token';

import { RestClient, parseContentRangeTotal } from './rest-client';

const BASE = 'https://test.supabase.co/rest/v1';

describe('RestClient', () => {
  let client: RestClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { supabaseUrl: 'https://test.supabase.co/', supabaseKey: 'k' } },
      ],
    });

    client = TestBed.inject(RestClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lista con select, filtros, orden y paginación', async () => {
    const promise = firstValueFrom(
      client.list<{ id: number }>('products', {
        select: 'id,name',
        filters: { category_id: 'eq.2' },
        order: 'name.asc',
        limit: 5,
        offset: 10,
      }),
    );

    const req = httpMock.expectOne((r) => r.url === `${BASE}/products`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('select')).toBe('id,name');
    expect(req.request.params.get('category_id')).toBe('eq.2');
    expect(req.request.params.get('order')).toBe('name.asc');
    expect(req.request.params.get('limit')).toBe('5');
    expect(req.request.params.get('offset')).toBe('10');

    req.flush([{ id: 1 }]);
    await expect(promise).resolves.toEqual([{ id: 1 }]);
  });

  it('pagina con Range y Prefer: count=exact, y lee el total', async () => {
    const promise = firstValueFrom(client.page<{ id: number }>('customers', { limit: 10, offset: 20 }));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/customers`);
    expect(req.request.headers.get('Range')).toBe('20-29');
    expect(req.request.headers.get('Prefer')).toBe('count=exact');

    req.flush([{ id: 21 }], { headers: { 'Content-Range': '20-29/64' } });
    await expect(promise).resolves.toEqual({ rows: [{ id: 21 }], total: 64 });
  });

  it('devuelve null si Content-Range no informa del total', async () => {
    const promise = firstValueFrom(client.page('customers', { limit: 10 }));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/customers`);
    req.flush([], { headers: { 'Content-Range': '*/0' } });

    await expect(promise).resolves.toEqual({ rows: [], total: 0 });
  });

  it('crea con Prefer: return=representation y devuelve la fila guardada', async () => {
    const promise = firstValueFrom(client.create<{ id: number; name: string }>('products', { name: 'Teclado' }));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/products`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name: 'Teclado' });
    expect(req.request.headers.get('Prefer')).toBe('return=representation');

    req.flush([{ id: 7, name: 'Teclado' }]);
    await expect(promise).resolves.toEqual({ id: 7, name: 'Teclado' });
  });

  it('actualiza filtrando por id', async () => {
    const promise = firstValueFrom(client.update('products', 7, { stock: 3 }));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/products`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.params.get('id')).toBe('eq.7');
    expect(req.request.body).toEqual({ stock: 3 });

    req.flush([{ id: 7, stock: 3 }]);
    await expect(promise).resolves.toEqual({ id: 7, stock: 3 });
  });

  it('elimina filtrando por id', async () => {
    const promise = firstValueFrom(client.remove('products', 7));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/products`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('id')).toBe('eq.7');
    expect(req.request.headers.get('Prefer')).toBe('return=minimal');

    req.flush(null);
    await expect(promise).resolves.toBeUndefined();
  });

  it('comprueba existencia excluyendo el propio registro', async () => {
    const promise = firstValueFrom(client.exists('products', 'sku', 'ABC-1', 3));

    const req = httpMock.expectOne((r) => r.url === `${BASE}/products`);
    expect(req.request.params.get('sku')).toBe('eq.ABC-1');
    expect(req.request.params.get('id')).toBe('neq.3');
    expect(req.request.params.get('select')).toBe('id');
    expect(req.request.params.get('limit')).toBe('1');

    req.flush([{ id: 9 }]);
    await expect(promise).resolves.toBe(true);
  });

  it('reintenta las lecturas ante errores 5xx con backoff', async () => {
    vi.useFakeTimers();
    try {
      const promise = firstValueFrom(client.list('orders'));
      const url = (r: { url: string }) => r.url === `${BASE}/orders`;

      httpMock.expectOne(url).flush({}, { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(300);

      httpMock.expectOne(url).flush({}, { status: 503, statusText: 'Service Unavailable' });
      await vi.advanceTimersByTimeAsync(600);

      httpMock.expectOne(url).flush([{ id: 1 }]);
      await expect(promise).resolves.toEqual([{ id: 1 }]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no reintenta las escrituras', async () => {
    const promise = firstValueFrom(client.create('orders', { total: 10 }));

    httpMock
      .expectOne((r) => r.url === `${BASE}/orders`)
      .flush({ code: '42501' }, { status: 403, statusText: 'Forbidden' });

    await expect(promise).rejects.toThrow();
    httpMock.expectNone((r) => r.url === `${BASE}/orders`);
  });

  it('extrae el total de Content-Range', () => {
    expect(parseContentRangeTotal('0-9/123')).toBe(123);
    expect(parseContentRangeTotal('*/0')).toBe(0);
    expect(parseContentRangeTotal('0-9/*')).toBeNull();
    expect(parseContentRangeTotal(null)).toBeNull();
  });
});
