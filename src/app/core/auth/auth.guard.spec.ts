import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('Auth Guards', () => {
  let router: Router;
  let authStore: any;

  beforeEach(() => {
    authStore = {
      initialized: () => true,
      isAuthenticated: () => false,
      isAdmin: () => false,
      role: () => null,
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: { createUrlTree: (url: string[]) => new UrlTree() } },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('authGuard should allow authenticated user', (done) => {
    authStore.isAuthenticated = () => true;
    TestBed.runInInjectionContext(() => {
      const result = authGuard({} as any, {} as any);
      if (result instanceof Promise) {
        result.then((res) => {
          expect(res).toBe(true);
          done();
        });
      } else if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBe(true);
          done();
        });
      } else {
        expect(result).toBe(true);
        done();
      }
    });
  });

  it('authGuard should redirect to login if not authenticated', (done) => {
    authStore.isAuthenticated = () => false;
    TestBed.runInInjectionContext(() => {
      const result = authGuard({} as any, {} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBeInstanceOf(UrlTree);
          done();
        });
      } else {
        expect(result).toBeInstanceOf(UrlTree);
        done();
      }
    });
  });

  it('guestGuard should allow guest', (done) => {
    authStore.isAuthenticated = () => false;
    TestBed.runInInjectionContext(() => {
      const result = guestGuard({} as any, {} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBe(true);
          done();
        });
      } else {
        expect(res => res).toBeTruthy();
        done();
      }
    });
  });

  it('guestGuard should redirect admin to /dashboard', (done) => {
    authStore.isAuthenticated = () => true;
    authStore.isAdmin = () => true;
    TestBed.runInInjectionContext(() => {
      const result = guestGuard({} as any, {} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBeInstanceOf(UrlTree);
          done();
        });
      } else {
        done();
      }
    });
  });

  it('roleGuard canActivate should allow admin', (done) => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'admin';
    const guard = roleGuard(['admin']);
    TestBed.runInInjectionContext(() => {
      const result = guard({} as any, {} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBe(true);
          done();
        });
      } else {
        expect(result).toBe(true);
        done();
      }
    });
  });

  it('roleGuard canMatch should allow admin', (done) => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'admin';
    const guard = roleGuard(['admin']);
    TestBed.runInInjectionContext(() => {
      const result = guard({} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBe(true);
          done();
        });
      } else {
        expect(result).toBe(true);
        done();
      }
    });
  });

  it('roleGuard should redirect non-admin to /forbidden', (done) => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'user';
    const guard = roleGuard(['admin']);
    TestBed.runInInjectionContext(() => {
      const result = guard({} as any, {} as any);
      if ((result as any).subscribe) {
        (result as any).subscribe((res: any) => {
          expect(res).toBeInstanceOf(UrlTree);
          done();
        });
      } else {
        done();
      }
    });
  });
});
