import type { ProductsByCategory } from '../../core/models/dashboard.model';
import type { OrderSummary } from '../../core/models/order.model';

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
