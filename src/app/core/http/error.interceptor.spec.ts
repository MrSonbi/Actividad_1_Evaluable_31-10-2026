import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { AuthStore } from '../auth/auth.store';

import { ApiError } from './api-error';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: any;
  let authStore: any;

  beforeEach(() => {
    router = { navigate: vi.fn() };
    authStore = { signOut: vi.fn().mockResolvedValue(undefined) };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: AuthStore, useValue: authStore },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should handle 401 by signing out and navigating to login', async () => {
    http.get('/test').subscribe({
      next: () => {},
      error: () => {},
    });
    const req = httpMock.expectOne('/test');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });
    await new Promise((r) => setTimeout(r, 0));
    expect(authStore.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { sessionExpired: '1' } });
  });

  it('should handle 403 by navigating to forbidden', () => {
    http.get('/test').subscribe({
      next: () => {},
      error: () => {},
    });
    const req = httpMock.expectOne('/test');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(router.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  it('should handle network error (status 0)', () => {
    http.get('/test').subscribe({
      next: () => {},
      error: (err: Error) => {
        expect(err.message).toBe('Sin conexión a la red. Comprueba tu conexión e inténtalo de nuevo.');
      },
    });
    const req = httpMock.expectOne('/test');
    req.error(new ProgressEvent('error'), { status: 0 });
  });

  it('should map a duplicated value (23505) to a friendly message', () => {
    let received: Error | undefined;
    http.post('/test', {}).subscribe({
      next: () => {},
      error: (err: Error) => {
        received = err;
      },
    });
    const req = httpMock.expectOne('/test');
    req.flush(
      { code: '23505', message: 'duplicate key value violates unique constraint' },
      { status: 409, statusText: 'Conflict' },
    );

    expect(received?.message).toBe('Ya existe un registro con ese valor. Revisa el email o el SKU.');
    expect(received).toBeInstanceOf(ApiError);
  });

  it('should map a permission error (42501) to a friendly message', () => {
    let received: Error | undefined;
    http.delete('/test').subscribe({
      next: () => {},
      error: (err: Error) => {
        received = err;
      },
    });
    const req = httpMock.expectOne('/test');
    req.flush(
      { code: '42501', message: 'new row violates row-level security policy' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(received?.message).toBe('No tienes permisos para realizar esta acción.');
    expect(received).toBeInstanceOf(ApiError);
  });
});
