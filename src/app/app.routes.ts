import type { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
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
        loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
        canActivate: [roleGuard(['admin'])],
        canMatch: [roleGuard(['admin'])],
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/products.page').then((m) => m.ProductsPage),
      },
      {
        path: 'customers',
        loadComponent: () => import('./features/customers/customers.page').then((m) => m.CustomersPage),
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/orders.page').then((m) => m.OrdersPage),
      },
    ],
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./features/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
];
