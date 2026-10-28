import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ENVIRONMENT } from '../config/environment.token';
import { SUPABASE_CLIENT } from '../supabase/supabase.token';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let supabaseClient: any;
  let env: any;

  beforeEach(() => {
    env = { supabaseUrl: 'https://test.supabase.co', supabaseKey: 'test-key' };
    supabaseClient = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token123' } } }),
      },
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ENVIRONMENT, useValue: env },
        { provide: SUPABASE_CLIENT, useValue: supabaseClient },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should add apikey and Authorization to Supabase URL', async () => {
    http.get(`${env.supabaseUrl}/rest/v1/products`).subscribe();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne(`${env.supabaseUrl}/rest/v1/products`);
    expect(req.request.headers.get('apikey')).toBe('test-key');
    expect(req.request.headers.get('Authorization')).toBe('Bearer token123');
    req.flush([]);
  });

  it('should add apikey only if no session', async () => {
    supabaseClient.auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    http.get(`${env.supabaseUrl}/rest/v1/products`).subscribe();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne(`${env.supabaseUrl}/rest/v1/products`);
    expect(req.request.headers.get('apikey')).toBe('test-key');
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush([]);
  });

  it('should not modify requests to other URLs', async () => {
    http.get('https://api.example.com/data').subscribe();
    await new Promise((r) => setTimeout(r, 0));
    const req = httpMock.expectOne('https://api.example.com/data');
    expect(req.request.headers.get('apikey')).toBeNull();
    expect(req.request.headers.get('Authorization')).toBeNull();
    req.flush([]);
  });
});
