import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';

import { AuthStore } from './auth.store';

import type { CanActivateFn, CanMatchFn } from '@angular/router';

const waitInitialized = () => {
  const store = inject(AuthStore);
  return toObservable(store.initialized).pipe(
    filter((v) => v === true),
    take(1),
  );
};

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  return waitInitialized().pipe(
    map(() => {
      if (store.isAuthenticated()) return true;
      return router.createUrlTree(['/login']);
    }),
  );
};

export const guestGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  return waitInitialized().pipe(
    map(() => {
      if (!store.isAuthenticated()) return true;
      if (store.isAdmin()) return router.createUrlTree(['/dashboard']);
      return router.createUrlTree(['/products']);
    }),
  );
};

export const roleGuard = (roles: string[]): CanActivateFn & CanMatchFn => {
  const guard: CanActivateFn & CanMatchFn = () => {
    const store = inject(AuthStore);
    const router = inject(Router);
    return waitInitialized().pipe(
      map(() => {
        if (!store.isAuthenticated()) return router.createUrlTree(['/login']);
        if (roles.includes(store.role() ?? '')) return true;
        return router.createUrlTree(['/forbidden']);
      }),
    );
  };
  return guard;
};
