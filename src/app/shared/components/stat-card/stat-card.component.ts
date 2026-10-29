import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';

import type { StatTrend, TrendDirection } from '../../models/stat-card.model';

/**
 * Tarjeta que muestra un indicador (KPI) con un valor destacado.
 *
 * Componente agnóstico: solo recibe datos por `input()`. Si se muestra un
 * icono, la página que lo usa debe registrarlo con `addIcons`.
 *
 * `ion-icon` se usa como elemento personalizado (registrado por Ionic en el
 * shell) para no arrastrar dependencias de Ionic al componente.
 */
@Component({
  selector: 'app-stat-card',
  standalone: true,
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  /** Título del indicador. */
  readonly title = input.required<string>();

  /** Valor principal, ya formateado o numérico. */
  readonly value = input.required<string | number>();

  /** Nombre del icono de Ionicons que acompaña al indicador. */
  readonly icon = input('');

  /** Tendencia opcional que se muestra bajo el valor. */
  readonly trend = input<StatTrend | null>(null);

  /** Nota aclaratoria opcional bajo la tendencia. */
  readonly hint = input('');

  /**
   * Símbolo que representa la dirección de la tendencia.
   *
   * @param direction Dirección de la tendencia
   * @returns Símbolo textual
   */
  protected trendSymbol(direction: TrendDirection): string {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  }
}
