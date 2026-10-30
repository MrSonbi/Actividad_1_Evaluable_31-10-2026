import type { ProductsByCategory } from '../../core/models/dashboard.model';
import type { OrderStatus, OrderSummary } from '../../core/models/order.model';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../core/models/order.model';

/** Periodos, en meses, que se pueden elegir en el dashboard. */
export const DASHBOARD_PERIODS = [3, 6, 12] as const;

/** Periodo seleccionable del dashboard. */
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

/** Filtros del dashboard. */
export interface OrderFilters {
  /** Meses naturales de la ventana, incluido el actual. */
  months: DashboardPeriod;
  /** Estado seleccionado; `null` representa «todos los estados». */
  status: OrderStatus | null;
}

/** Indicadores calculados a partir de los pedidos filtrados. */
export interface PeriodTotals {
  /** Número de pedidos, cancelados incluidos. */
  orders: number;
  /** Importe de los pedidos no cancelados. */
  revenue: number;
  /** Importe medio de los pedidos no cancelados. */
  averageTicket: number;
}

/** Serie ya preparada para alimentar `app-chart`. */
export interface ChartSeries {
  /** Etiquetas del eje X. */
  labels: string[];
  /** Valores del eje Y. */
  values: number[];
  /** Resumen textual para lectores de pantalla. */
  summary: string[];
}

/** Formato corto de mes y año usado en las etiquetas del gráfico. */
const shortMonth = new Intl.DateTimeFormat('es-ES', { month: 'short', year: '2-digit' });

/** Formato largo de mes y año usado en el resumen textual. */
const longMonth = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

/** Formato monetario en euros. */
const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

/**
 * Devuelve el primer día de cada mes de la ventana temporal, del más antiguo al
 * más reciente.
 *
 * @param count Número de meses de la ventana
 * @param now Fecha de referencia
 */
export function monthWindow(count: number, now: Date = new Date()): Date[] {
  const months = Math.max(1, Math.trunc(count));
  return Array.from(
    { length: months },
    (_, index) => new Date(now.getFullYear(), now.getMonth() - (months - 1 - index), 1),
  );
}

/**
 * Clave de agrupación de un mes (`2026-09`).
 *
 * @param date Fecha del pedido
 */
function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Agrupa los ingresos de los pedidos por mes.
 *
 * Los pedidos cancelados no suman, igual que en la vista `v_kpis`. Los meses sin
 * pedidos se mantienen en la serie con valor cero para que el eje temporal no
 * tenga huecos.
 *
 * @param orders Pedidos de la ventana temporal
 * @param months Número de meses que se representan
 * @param now Fecha de referencia
 */
export function monthlyRevenueSeries(
  orders: readonly OrderSummary[],
  months = 12,
  now: Date = new Date(),
): ChartSeries {
  const window = monthWindow(months, now);
  const totals = new Map<string, number>();

  for (const order of orders) {
    if (order.status === 'cancelled') continue;
    const date = new Date(order.created_at);
    if (Number.isNaN(date.getTime())) continue;

    const key = monthKey(date);
    totals.set(key, (totals.get(key) ?? 0) + order.total);
  }

  const values = window.map((month) => Math.round((totals.get(monthKey(month)) ?? 0) * 100) / 100);

  return {
    labels: window.map((month) => shortMonth.format(month)),
    values,
    summary: window.map((month, index) => `${longMonth.format(month)}: ${currency.format(values[index])}`),
  };
}

/**
 * Filtra en memoria los pedidos ya cargados por periodo y estado.
 *
 * El periodo usa los mismos meses naturales que {@link monthWindow}, de modo que
 * los indicadores y los gráficos abarcan siempre las mismas fechas.
 *
 * @param orders Pedidos cargados
 * @param filters Periodo y estado seleccionados
 * @param now Fecha de referencia
 */
export function filterOrders<TOrder extends OrderSummary>(
  orders: readonly TOrder[],
  filters: OrderFilters,
  now: Date = new Date(),
): TOrder[] {
  const from = monthWindow(filters.months, now)[0].getTime();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

  return orders.filter((order) => {
    const time = new Date(order.created_at).getTime();
    return time >= from && time < to && (filters.status === null || order.status === filters.status);
  });
}

/**
 * Calcula los indicadores de un conjunto de pedidos.
 *
 * Los cancelados cuentan como pedidos pero no suman ingresos, igual que en la
 * vista `v_kpis`.
 *
 * @param orders Pedidos ya filtrados
 */
export function periodTotals(orders: readonly OrderSummary[]): PeriodTotals {
  const billable = orders.filter((order) => order.status !== 'cancelled');
  const revenue = billable.reduce((sum, order) => sum + order.total, 0);

  return {
    orders: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    averageTicket: billable.length === 0 ? 0 : Math.round((revenue / billable.length) * 100) / 100,
  };
}

/**
 * Cuenta los pedidos de cada estado.
 *
 * Mantiene siempre los cuatro estados, también los que no tienen pedidos, para
 * que la leyenda y los colores del gráfico no cambien al filtrar.
 *
 * @param orders Pedidos ya filtrados
 */
export function ordersByStatusSeries(orders: readonly OrderSummary[]): ChartSeries {
  const values = ORDER_STATUSES.map((status) => orders.filter((order) => order.status === status).length);

  return {
    labels: ORDER_STATUSES.map((status) => ORDER_STATUS_LABELS[status]),
    values,
    summary: ORDER_STATUSES.map((status, index) => {
      const share = orders.length === 0 ? 0 : Math.round((values[index] / orders.length) * 100);
      return `${ORDER_STATUS_LABELS[status]}: ${countLabel(values[index], 'pedido', 'pedidos')} (${share} %)`;
    }),
  };
}

/**
 * Prepara la serie de productos por categoría.
 *
 * @param rows Filas de la vista `v_products_by_category`
 */
export function productsByCategorySeries(rows: readonly ProductsByCategory[]): ChartSeries {
  return {
    labels: rows.map((row) => row.category),
    values: rows.map((row) => row.products),
    summary: rows.map(
      (row) =>
        `${row.category}: ${countLabel(row.products, 'producto', 'productos')}, ${countLabel(
          row.units_in_stock,
          'unidad en stock',
          'unidades en stock',
        )}`,
    ),
  };
}

/**
 * Escribe una cantidad con la unidad en singular o plural.
 *
 * @param count Cantidad
 * @param singular Unidad en singular
 * @param plural Unidad en plural
 */
function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
