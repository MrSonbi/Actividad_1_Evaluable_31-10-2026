import type { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

/**
 * Rutas de la aplicación, cargadas bajo demanda. Las de administración usan
 * `canMatch` además de `canActivate` para no descargar su código a otros roles.
 */
export const routes: Routes = [
  {
    path: 'login',
    title: 'Iniciar sesión · Inventario',
    loadComponent: () => import('./features/auth/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
  },
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'products',
      },
      {
        path: 'dashboard',
        title: 'Dashboard · Inventario',
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        canActivate: [roleGuard(['admin'])],
        canMatch: [roleGuard(['admin'])],
      },
      {
        path: 'products',
        title: 'Productos · Inventario',
        loadComponent: () => import('./features/products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'customers',
        title: 'Clientes · Inventario',
        loadComponent: () => import('./features/customers/customers.page').then((m) => m.CustomersPage),
      },
      {
        path: 'orders',
        title: 'Pedidos · Inventario',
        loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage),
      },
      {
        path: 'help',
        title: 'Ayuda · Inventario',
        loadComponent: () => import('./features/help/help.page').then((m) => m.HelpPage),
      },
    ],
  },
  {
    path: 'forbidden',
    title: 'Acceso denegado · Inventario',
    loadComponent: () => import('./features/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: '**',
    title: 'Página no encontrada · Inventario',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
