import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { ActivityAction, ActivityEntity } from '../../../core/models/document.model';
import type { ActivityFeedItem } from '../../models/activity-feed.model';

/**
 * Feed de actividad reciente con anuncios para lectores de pantalla.
 *
 * Componente agnóstico: recibe las entradas por `input()`. La página que lo
 * usa es la responsable de obtenerlas (REST o Realtime).
 */
@Component({
  selector: 'app-activity-feed',
  standalone: true,
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityFeedComponent {
  /** Entradas de actividad, de la más reciente a la más antigua. */
  readonly items = input<readonly ActivityFeedItem[]>([]);

  /** Indica que la actividad se está cargando. */
  readonly loading = input(false);

  /** Título del bloque. */
  readonly title = input('Actividad reciente');

  /** Mensaje que se muestra cuando no hay actividad. */
  readonly emptyMessage = input('Todavía no hay actividad registrada.');

  private readonly dateFormatter = new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  /**
   * Etiqueta en español de la acción registrada.
   *
   * @param action Acción de la entrada
   * @returns Texto visible
   */
  protected actionLabel(action: ActivityAction): string {
    switch (action) {
      case 'create':
        return 'Alta';
      case 'update':
        return 'Edición';
      case 'delete':
        return 'Borrado';
    }
  }

  /**
   * Etiqueta en español de la entidad afectada.
   *
   * @param entity Entidad de la entrada
   * @returns Texto visible
   */
  protected entityLabel(entity: ActivityEntity): string {
    switch (entity) {
      case 'product':
        return 'Producto';
      case 'customer':
        return 'Cliente';
      case 'order':
        return 'Pedido';
    }
  }

  /**
   * Clase CSS del distintivo según la acción.
   *
   * @param action Acción de la entrada
   * @returns Clases del distintivo
   */
  protected actionClass(action: ActivityAction): string {
    return `activity__badge activity__badge--${action}`;
  }

  /**
   * Formatea la fecha de la actividad en español.
   *
   * @param value Fecha en formato ISO 8601
   * @returns Fecha legible o el valor original si no es válida
   */
  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return this.dateFormatter.format(date);
  }
}
