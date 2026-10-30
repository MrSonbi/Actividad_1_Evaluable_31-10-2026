import type { ProductsByCategory } from '../../core/models/dashboard.model';
import type { OrderSummary } from '../../core/models/order.model';

import { monthWindow, monthlyRevenueSeries, productsByCategorySeries } from './dashboard-charts';

/** Fecha de referencia de los tests: 15 de octubre de 2026. */
const NOW = new Date(2026, 9, 15);

/** Identificador incremental de los pedidos de prueba. */
let nextId = 1;

/**
 * Construye un pedido de prueba con una fecha local.
 *
 * @param year Año
 * @param month Mes (0-11)
 * @param day Día
 * @param total Importe
 * @param status Estado del pedido
 */
function order(
  year: number,
  month: number,
  day: number,
  total: number,
  status: OrderSummary['status'] = 'paid',
): OrderSummary {
  return {
    id: nextId++,
    status,
    total,
    created_at: new Date(year, month, day, 12).toISOString(),
  };
}

describe('dashboard-charts', () => {
  describe('monthWindow', () => {
    it('devuelve los primeros días de los últimos meses, del más antiguo al más reciente', () => {
      const window = monthWindow(12, NOW);

      expect(window).toHaveLength(12);
      expect(window[0].getFullYear()).toBe(2025);
      expect(window[0].getMonth()).toBe(10);
      expect(window[11].getFullYear()).toBe(2026);
      expect(window[11].getMonth()).toBe(9);
      expect(window.every((date) => date.getDate() === 1)).toBe(true);
    });
  });

  describe('monthlyRevenueSeries', () => {
    it('agrupa los ingresos por mes, ignora los cancelados y rellena los meses sin datos', () => {
      const series = monthlyRevenueSeries(
        [
          order(2026, 8, 10, 100),
          order(2026, 8, 20, 50, 'cancelled'),
          order(2026, 9, 2, 25.5, 'pending'),
          order(2025, 10, 31, 999),
        ],
        12,
        NOW,
      );

      expect(series.labels).toHaveLength(12);
      expect(series.values).toHaveLength(12);
      expect(series.values[10]).toBe(100);
      expect(series.values[11]).toBe(25.5);
      expect(series.values[1]).toBe(0);
    });

    it('resume cada mes en español con el importe en euros', () => {
      const series = monthlyRevenueSeries([order(2026, 8, 10, 100), order(2026, 9, 2, 25.5)], 12, NOW);

      expect(series.summary).toHaveLength(12);
      expect(series.summary[10]).toContain('septiembre de 2026');
      expect(series.summary[10]).toContain('100,00');
      expect(series.summary[11]).toContain('octubre de 2026');
      expect(series.summary[11]).toContain('25,50');
    });

    it('descarta las fechas no válidas', () => {
      const series = monthlyRevenueSeries([{ ...order(2026, 9, 2, 10), created_at: 'no-es-una-fecha' }], 12, NOW);

      expect(series.values.every((value) => value === 0)).toBe(true);
    });
  });

  describe('productsByCategorySeries', () => {
    it('usa las categorías como etiquetas y el número de productos como valores', () => {
      const rows: ProductsByCategory[] = [
        { category_id: 1, category: 'Periféricos', products: 12, units_in_stock: 240 },
        { category_id: 2, category: 'Monitores', products: 1, units_in_stock: 1 },
      ];

      const series = productsByCategorySeries(rows);

      expect(series.labels).toEqual(['Periféricos', 'Monitores']);
      expect(series.values).toEqual([12, 1]);
      expect(series.summary[0]).toContain('12 productos');
      expect(series.summary[0]).toContain('240 unidades en stock');
      expect(series.summary[1]).toContain('1 producto,');
      expect(series.summary[1]).toContain('1 unidad en stock');
    });

    it('devuelve series vacías si no hay categorías', () => {
      expect(productsByCategorySeries([])).toEqual({ labels: [], values: [], summary: [] });
    });
  });
});
