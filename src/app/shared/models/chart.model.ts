/** Punto de un gráfico seleccionado por el usuario. */
export interface ChartPoint {
  /** Índice del punto dentro de su conjunto de datos. */
  index: number;
  /** Índice del conjunto de datos al que pertenece el punto. */
  datasetIndex: number;
}
