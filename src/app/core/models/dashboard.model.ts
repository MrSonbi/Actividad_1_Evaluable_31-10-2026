/** Indicadores agregados de la vista `v_kpis`. */
export interface DashboardKpis {
  /** Productos del catálogo. */
  total_products: number;
  /** Clientes registrados. */
  total_customers: number;
  /** Pedidos registrados. */
  total_orders: number;
  /** Ingresos totales según la vista `v_kpis`. */
  total_revenue: number;
  /** Productos con menos de 10 unidades. */
  low_stock_products: number;
}

/** Fila de la vista `v_products_by_category`. */
export interface ProductsByCategory {
  /** Identificador de la categoría. */
  category_id: number;
  /** Nombre de la categoría. */
  category: string;
  /** Número de productos distintos. */
  products: number;
  /** Unidades en stock. */
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
