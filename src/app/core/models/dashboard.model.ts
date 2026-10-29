/** Indicadores agregados de la vista `v_kpis`. */
export interface DashboardKpis {
  total_products: number;
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  low_stock_products: number;
}

/** Fila de la vista `v_products_by_category`. */
export interface ProductsByCategory {
  category_id: number;
  category: string;
  products: number;
  units_in_stock: number;
}

/** KPIs a cero, usados mientras no hay datos o si la vista devuelve vacío. */
export const EMPTY_KPIS: DashboardKpis = {
  total_products: 0,
  total_customers: 0,
  total_orders: 0,
  total_revenue: 0,
  low_stock_products: 0,
};
