import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import type { DashboardKpis, ProductsByCategory } from '../../models/dashboard.model';
import { EMPTY_KPIS } from '../../models/dashboard.model';
import type { OrderSummary } from '../../models/order.model';

import { RestClient } from './rest-client';

/**
 * Acceso REST a las vistas agregadas del dashboard y a los pedidos que
 * alimentan sus gráficos.
 */
@Injectable({ providedIn: 'root' })
export class DashboardApi {
  private readonly rest = inject(RestClient);

  /**
   * Indicadores agregados de `v_kpis`.
   *
   * @returns KPIs; si la vista no devuelve fila, valores a cero
   */
  kpis(): Observable<DashboardKpis> {
    return this.rest.list<DashboardKpis>('v_kpis').pipe(map((rows) => rows[0] ?? EMPTY_KPIS));
  }

  /**
   * Productos y unidades en stock por categoría (`v_products_by_category`).
   */
  productsByCategory(): Observable<ProductsByCategory[]> {
    return this.rest.list<ProductsByCategory>('v_products_by_category');
  }

  /**
   * Pedidos ordenados del más reciente al más antiguo. El dashboard agrega
   * estos datos por mes y por estado en el cliente.
   *
   * @param limit Número máximo de pedidos a recuperar
   */
  orders(limit = 500): Observable<OrderSummary[]> {
    return this.rest.list<OrderSummary>('orders', {
      select: 'id,status,total,created_at',
      order: 'created_at.desc',
      limit,
    });
  }
}
