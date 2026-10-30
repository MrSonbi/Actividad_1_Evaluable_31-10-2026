import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ENVIRONMENT } from '../../config/environment.token';

import { OrdersApi } from './orders.api';

const BASE = 'https://test.supabase.co/rest/v1/orders';

describe('OrdersApi', () => {
  let api: OrdersApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'k' } },
      ],
    });

    api = TestBed.inject(OrdersApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('filtra los pedidos creados a partir de una fecha', async () => {
    const promise = firstValueFrom(api.listAll({ createdFrom: '2025-11-01T00:00:00.000Z' }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('created_at')).toBe('gte.2025-11-01T00:00:00.000Z');
    expect(req.request.params.get('select')).toBe('*,customers(full_name)');
    expect(req.request.params.get('order')).toBe('created_at.desc');

    req.flush([]);
    await promise;
  });

  it('combina el filtro de fecha con el de estado y aplana el cliente', async () => {
    const promise = firstValueFrom(api.list({ status: 'paid', createdFrom: '2025-11-01T00:00:00.000Z' }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('status')).toBe('eq.paid');
    expect(req.request.params.get('created_at')).toBe('gte.2025-11-01T00:00:00.000Z');

    req.flush([
      {
        id: 1,
        customer_id: 4,
        status: 'paid',
        total: 129.9,
        created_at: '2026-10-01T10:00:00.000Z',
        customers: { full_name: 'Ana Pérez' },
      },
    ]);

    const orders = await promise;
    expect(orders).toHaveLength(1);
    expect(orders[0].customer_name).toBe('Ana Pérez');
    expect(orders[0]).not.toHaveProperty('customers');
  });
});
