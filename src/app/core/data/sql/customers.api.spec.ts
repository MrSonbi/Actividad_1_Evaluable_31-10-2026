import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { ENVIRONMENT } from '../../config/environment.token';

import { CustomersApi } from './customers.api';

const BASE = 'https://test.supabase.co/rest/v1/customers';

describe('CustomersApi', () => {
  let api: CustomersApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'k' } },
      ],
    });

    api = TestBed.inject(CustomersApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('busca por nombre o email con un filtro or', async () => {
    const promise = firstValueFrom(api.list({ search: 'ana' }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('or')).toBe('(full_name.ilike.*ana*,email.ilike.*ana*)');

    req.flush([]);
    await promise;
  });

  it('normaliza el email a minúsculas al crear', async () => {
    const promise = firstValueFrom(
      api.create({ full_name: 'Ana Prueba', email: ' Ana.Prueba@Example.COM ', phone: null, city: null }),
    );

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.body).toEqual({
      full_name: 'Ana Prueba',
      email: 'ana.prueba@example.com',
      phone: null,
      city: null,
    });

    req.flush([{ id: 1, full_name: 'Ana Prueba', email: 'ana.prueba@example.com' }]);
    await expect(promise).resolves.toMatchObject({ id: 1 });
  });

  it('normaliza el email en la comprobación de unicidad', async () => {
    const promise = firstValueFrom(api.emailExists(' Ana.Prueba@Example.COM ', 4));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('email')).toBe('eq.ana.prueba@example.com');
    expect(req.request.params.get('id')).toBe('neq.4');

    req.flush([]);
    await expect(promise).resolves.toBe(false);
  });

  it('no envía email en la actualización si no se modifica', async () => {
    const promise = firstValueFrom(api.update(4, { city: 'Sevilla' }));

    const req = httpMock.expectOne((r) => r.url === BASE);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ city: 'Sevilla' });
    expect(req.request.params.get('id')).toBe('eq.4');

    req.flush({ id: 4, city: 'Sevilla' });
    await promise;
  });
});
