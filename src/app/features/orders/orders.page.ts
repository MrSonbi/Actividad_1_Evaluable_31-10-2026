import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';

import { OrdersStore } from '../../core/data/orders.store';
import type { OrderStatus, OrderWithCustomer } from '../../core/models/order.model';
import { ORDER_STATUS_LABELS } from '../../core/models/order.model';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { TableColumn } from '../../shared/models/table.model';
import { ReportService, reportCount } from '../../shared/utils/report/report.service';
import type { ReportFormat } from '../../shared/utils/report/report.service';

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
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonText,
    DataTableComponent,
    OrderStatusFilterComponent,
  ],
  templateUrl: './orders.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrdersPage implements OnInit {
  /** Estado de los pedidos (listado, filtro, carga y error). */
  readonly store = inject(OrdersStore);

  private readonly toastController = inject(ToastController);
  private readonly reports = inject(ReportService);

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

  /**
   * Exporta las filas que muestra la tabla, con la búsqueda y el orden aplicados.
   *
   * @param format Formato solicitado
   * @param rows Filas filtradas y ordenadas de la tabla
   */
  protected async onExport(format: ReportFormat, rows: readonly OrderTableRow[]): Promise<void> {
    try {
      await this.reports.exportTable(format, {
        title: 'Listado de pedidos',
        subtitle: this.exportSubtitle(rows.length),
        columns: this.columns,
        rows,
        filename: 'pedidos',
      });
    } catch {
      const toast = await this.toastController.create({
        message: 'No se pudo generar el informe.',
        duration: 3500,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  /**
   * Describe el filtro de estado y el número de registros del informe.
   *
   * @param count Número de filas exportadas
   */
  private exportSubtitle(count: number): string {
    const status = this.status();
    const filter = status === null ? 'Todos los estados' : `Estado: ${ORDER_STATUS_LABELS[status]}`;
    return `${filter} · ${reportCount(count)}`;
  }
}
