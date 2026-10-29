/** Dirección de una tendencia mostrada en `app-stat-card`. */
export type TrendDirection = 'up' | 'down' | 'flat';

/** Tendencia opcional de un indicador. */
export interface StatTrend {
  /** Sentido de la variación. */
  direction: TrendDirection;
  /** Texto descriptivo, por ejemplo `+12 % este mes`. */
  label: string;
}
