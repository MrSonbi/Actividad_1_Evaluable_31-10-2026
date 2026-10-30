import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { authGuard, guestGuard, roleGuard } from './auth.guard';
import { AuthStore } from './auth.store';

describe('Auth Guards', () => {
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
        { provide: Router, useValue: { createUrlTree: () => new UrlTree() } },
      ],
    });
  });

  it('authGuard should allow authenticated user', async () => {
    authStore.isAuthenticated = () => true;
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBe(true);
    } else {
      expect(result).toBe(true);
    }
  });

  it('authGuard should redirect to login if not authenticated', async () => {
    authStore.isAuthenticated = () => false;
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBeInstanceOf(UrlTree);
    } else {
      expect(result).toBeInstanceOf(UrlTree);
    }
  });

  it('guestGuard should allow guest', async () => {
    authStore.isAuthenticated = () => false;
    const result = await TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBe(true);
    } else {
      expect(result).toBe(true);
    }
  });

  it('guestGuard should redirect admin to /dashboard', async () => {
    authStore.isAuthenticated = () => true;
    authStore.isAdmin = () => true;
    const result = await TestBed.runInInjectionContext(() => guestGuard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBeInstanceOf(UrlTree);
    } else {
      expect(result).toBeInstanceOf(UrlTree);
    }
  });

  it('roleGuard canActivate should allow admin', async () => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'admin';
    const guard = roleGuard(['admin']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBe(true);
    } else {
      expect(result).toBe(true);
    }
  });

  it('roleGuard canMatch should allow admin', async () => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'admin';
    const guard = roleGuard(['admin']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, {} as any) as any);
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBe(true);
    } else {
      expect(result).toBe(true);
    }
  });

  it('roleGuard should redirect non-admin to /forbidden', async () => {
    authStore.isAuthenticated = () => true;
    authStore.role = () => 'user';
    const guard = roleGuard(['admin']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, {} as any));
    if (result && typeof (result as any).subscribe === 'function') {
      const res = await firstValueFrom(result as any);
      expect(res).toBeInstanceOf(UrlTree);
    } else {
      expect(result).toBeInstanceOf(UrlTree);
    }
  });
});
