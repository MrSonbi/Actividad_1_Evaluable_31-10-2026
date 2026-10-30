import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { IonContent, IonHeader, IonText, IonTitle, IonToolbar } from '@ionic/angular/standalone';

import { OrdersStore } from '../../core/data/orders.store';
import type { OrderStatus, OrderWithCustomer } from '../../core/models/order.model';
import { ORDER_STATUS_LABELS } from '../../core/models/order.model';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { TableColumn } from '../../shared/models/table.model';

import { OrderStatusFilterComponent } from './order-status-filter/order-status-filter.component';

/** Fila del listado: pedido con el nombre del cliente y su estado traducido. */
interface OrderTableRow extends OrderWithCustomer {
  /** Etiqueta en español del estado, usada en el distintivo de la tabla. */
  status_label: string;
}

/**
 * Listado de pedidos de solo lectura.
 *
 * Cualquier usuario autenticado puede consultar los pedidos y filtrarlos por
 * estado. La edición de pedidos no se ofrece en esta pantalla.
 */
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonText, DataTableComponent, OrderStatusFilterComponent],
  templateUrl: './orders.page.html',
  styleUrls: ['./orders.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage implements OnInit {
  /** Estado de los pedidos (listado, filtro, carga y error). */
  readonly store = inject(OrdersStore);

  /** Estado seleccionado en el filtro; `null` muestra todos. */
  protected readonly status = signal<OrderStatus | null>(this.store.status());

  /** Columnas visibles del listado. */
  protected readonly columns: readonly TableColumn<OrderTableRow>[] = [
    { key: 'id', label: 'Pedido', type: 'number', sortable: true },
    { key: 'customer_name', label: 'Cliente', sortable: true },
    { key: 'status_label', label: 'Estado', type: 'badge', sortable: true },
    { key: 'total', label: 'Total', type: 'currency', sortable: true },
    { key: 'created_at', label: 'Fecha', type: 'date', sortable: true },
  ];

  /** Filas de la tabla, con el estado traducido al español. */
  protected readonly rows = computed<readonly OrderTableRow[]>(() =>
    this.store.items().map((order) => ({
      ...order,
      status_label: ORDER_STATUS_LABELS[order.status],
    })),
  );

  /** Carga los pedidos al entrar en la pantalla. */
  ngOnInit(): void {
    void this.store.load();
  }

  /**
   * Recarga el listado al cambiar el filtro de estado.
   *
   * @param status Estado seleccionado o `null` para todos
   */
  protected onStatusChange(status: OrderStatus | null): void {
    void this.store.setStatus(status);
  }
}
