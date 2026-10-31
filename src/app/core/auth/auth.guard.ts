import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import type { CanActivateFn, CanMatchFn } from '@angular/router';
import { filter, map, take } from 'rxjs/operators';

import { AuthStore } from './auth.store';

/** Emite una sola vez cuando la sesión ya se ha restaurado. */
const waitInitialized = () => {
  const store = inject(AuthStore);
  return toObservable(store.initialized).pipe(
    filter((v) => v === true),
    take(1),
  );
};

/**
 * Deja pasar solo a usuarios con sesión; al resto los envía a `/login`.
 *
 * Espera a que `AuthStore` termine de restaurar la sesión.
 */
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

/**
 * Deja pasar solo a quien no tiene sesión (pantalla de acceso). Con sesión
 * redirige a `/dashboard` si es administrador y a `/products` en otro caso.
 */
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

/**
 * Crea un guard que exige uno de los roles indicados. Sirve para `canActivate`
 * y para `canMatch`; con este último, el código de la ruta ni se descarga.
 *
 * @param roles Roles autorizados
 * @returns Guard que redirige a `/login` sin sesión y a `/forbidden` sin permiso
 */
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
