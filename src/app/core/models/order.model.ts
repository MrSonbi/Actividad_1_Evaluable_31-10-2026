/** Estados posibles de un pedido (coinciden con el `check` de la tabla). */
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

/** Pedido de un cliente. */
export interface Order {
  /** Identificador. */
  id: number;
  /** Cliente que hace el pedido. */
  customer_id: number;
  /** Estado actual. */
  status: OrderStatus;
  /** Importe total en euros. */
  total: number;
  /** Fecha de creación en ISO 8601. */
  created_at: string;
}

/** Pedido enriquecido con el nombre del cliente (join PostgREST). */
export interface OrderWithCustomer extends Order {
  /** Nombre del cliente, si existe. */
  customer_name: string | null;
}

/** Datos editables de un pedido. */
export type OrderInput = Omit<Order, 'id' | 'created_at'>;

/** Fila tal y como la devuelve PostgREST al pedir `*,customers(full_name)`. */
export interface OrderRow extends Order {
  /** Cliente embebido por PostgREST. */
  customers: { full_name: string } | null;
}

/** Resumen de pedido usado por el dashboard (sin datos del cliente). */
export type OrderSummary = Pick<Order, 'id' | 'status' | 'total' | 'created_at'>;

/** Lista ordenada de estados para filtros y selects. */
export const ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'paid', 'shipped', 'cancelled'];

/** Etiquetas en español de cada estado. */
export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  shipped: 'Enviado',
  cancelled: 'Cancelado',
};
