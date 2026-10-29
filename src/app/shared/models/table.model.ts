/** Formato que `app-data-table` aplica al contenido de una celda. */
export type TableCellType = 'text' | 'number' | 'currency' | 'date' | 'badge';

/** Dirección de ordenación de una columna. */
export type SortDirection = 'asc' | 'desc';

/**
 * Definición de una columna de `app-data-table`.
 *
 * @typeParam T Tipo de fila que muestra la tabla
 */
export interface TableColumn<T> {
  /** Propiedad de la fila que se muestra en la columna. */
  key: keyof T & string;
  /** Texto visible en la cabecera. */
  label: string;
  /** Formato aplicado al valor de la celda. Por defecto, `text`. */
  type?: TableCellType;
  /** Indica si la columna se puede ordenar. */
  sortable?: boolean;
}
