import { ChangeDetectionStrategy, Component, model } from '@angular/core';

import type { OrderStatus } from '../../../core/models/order.model';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '../../../core/models/order.model';

/** Contador para que cada instancia tenga un `id` propio en el DOM. */
let nextSelectId = 0;

/**
 * Selector del estado de los pedidos.
 *
 * Es un componente agnóstico: no conoce el store de pedidos. Expone el estado
 * seleccionado mediante un `model()` de Angular, de modo que la página lo
 * enlaza con `[(value)]` y decide qué hacer con el cambio.
 */
@Component({
  selector: 'app-order-status-filter',
  standalone: true,
  templateUrl: './order-status-filter.component.html',
  styleUrls: ['./order-status-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderStatusFilterComponent {
  /** Estado seleccionado; `null` representa «todos los estados». */
  readonly value = model<OrderStatus | null>(null);

  /**
   * Identificador del `select`. Ionic mantiene en el DOM las páginas visitadas,
   * así que pedidos y dashboard pueden tener este filtro a la vez.
   */
  protected readonly selectId = `order-status-${nextSelectId++}`;

  /** Estados disponibles, en el orden definido por el modelo. */
  protected readonly statuses = ORDER_STATUSES;

  /** Etiquetas en español de cada estado. */
  protected readonly labels = ORDER_STATUS_LABELS;

  /**
   * Actualiza el valor enlazado cuando el usuario cambia la selección.
   *
   * @param event Evento `change` del elemento `select`
   */
  protected onChange(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value;
    this.value.set(ORDER_STATUSES.find((status) => status === selected) ?? null);
  }
}
