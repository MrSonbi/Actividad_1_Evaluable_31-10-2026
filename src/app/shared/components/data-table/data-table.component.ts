import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import type { SortDirection, TableColumn } from '../../models/table.model';

/**
 * Tabla de datos reutilizable, accesible y adaptada a móvil.
 *
 * Es un componente agnóstico: no inyecta stores ni servicios de ninguna
 * feature. Recibe las columnas y las filas por `input()` y notifica las
 * acciones del usuario mediante `output()`.
 *
 * @typeParam T Tipo de fila que muestra la tabla
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent<T> {
  /** Columnas que se muestran, en orden. */
  readonly columns = input.required<readonly TableColumn<T>[]>();

  /** Filas de la página actual. */
  readonly rows = input<readonly T[]>([]);

  /** Indica que los datos se están cargando. */
  readonly loading = input(false);

  /** Número de filas por página. */
  readonly pageSize = input(10);

  /** Texto descriptivo de la tabla (`<caption>`). */
  readonly caption = input('Listado de datos');

  /** Muestra los botones de exportación (se activan en la fase de informes). */
  readonly exportable = input(true);

  /** Muestra el botón de detalle en cada fila. */
  readonly selectable = input(true);

  /** Muestra el botón de edición en cada fila. */
  readonly editable = input(false);

  /** Muestra el botón de borrado en cada fila. */
  readonly removable = input(false);

  /** Emite la fila seleccionada para ver su detalle. */
  readonly rowSelect = output<T>();

  /** Emite la fila que el usuario quiere editar. */
  readonly edit = output<T>();

  /** Emite la fila que el usuario quiere eliminar. */
  readonly remove = output<T>();

  /** Emite el formato de exportación solicitado. */
  readonly exportRequested = output<'csv' | 'pdf'>();

  /** Emite el texto de búsqueda aplicado. */
  readonly searchChange = output<string>();

  /** Texto del buscador (enlazado con `[(ngModel)]`). */
  protected searchTerm = '';

  private readonly search = signal('');
  private readonly sortKey = signal<(keyof T & string) | null>(null);
  private readonly sortDirection = signal<SortDirection>('asc');
  private readonly page = signal(1);

  private readonly numberFormatter = new Intl.NumberFormat('es-ES');
  private readonly currencyFormatter = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
  private readonly dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });

  /** Filas que cumplen el texto de búsqueda. */
  protected readonly filteredRows = computed<readonly T[]>(() => {
    const term = this.search().trim().toLowerCase();
    const rows = this.rows();
    if (!term) return rows;

    return rows.filter((row) =>
      this.columns().some((column) => this.cellValue(row, column).toLowerCase().includes(term)),
    );
  });

  /** Filas ordenadas según la columna activa. */
  protected readonly sortedRows = computed<readonly T[]>(() => {
    const key = this.sortKey();
    if (!key) return this.filteredRows();

    const direction = this.sortDirection() === 'asc' ? 1 : -1;
    return [...this.filteredRows()].sort((first, second) => direction * compareValues(first[key], second[key]));
  });

  /** Indica si la columna de acciones tiene algún botón visible. */
  protected readonly hasActions = computed(() => this.selectable() || this.editable() || this.removable());

  /** Columnas que ocupa una fila de mensaje. */
  protected readonly messageColspan = computed(() => this.columns().length + (this.hasActions() ? 1 : 0));

  /** Número total de páginas (siempre al menos una). */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedRows().length / Math.max(1, this.pageSize()))),
  );

  /** Página actual, ajustada si el número de filas se reduce. */
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));

  /** Filas visibles en la página actual. */
  protected readonly pagedRows = computed<readonly T[]>(() => {
    const size = Math.max(1, this.pageSize());
    const start = (this.currentPage() - 1) * size;
    return this.sortedRows().slice(start, start + size);
  });

  /** Resumen textual del número de resultados (región `aria-live`). */
  protected readonly resultsText = computed(() => {
    const filtered = this.filteredRows().length;
    const total = this.rows().length;
    return filtered === total ? `${total} registros` : `${filtered} de ${total} registros`;
  });

  /**
   * Aplica el texto de búsqueda, vuelve a la primera página y lo notifica.
   *
   * @param value Texto introducido por el usuario
   */
  protected onSearchChange(value: string): void {
    this.searchTerm = value;
    this.search.set(value);
    this.page.set(1);
    this.searchChange.emit(value);
  }

  /**
   * Ordena por la columna indicada, alternando ascendente y descendente.
   *
   * @param column Columna sobre la que se ordena
   */
  protected sortBy(column: TableColumn<T>): void {
    if (!column.sortable) return;

    if (this.sortKey() === column.key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(column.key);
      this.sortDirection.set('asc');
    }
    this.page.set(1);
  }

  /**
   * Valor de `aria-sort` para la cabecera de una columna.
   *
   * @param column Columna de la cabecera
   * @returns Estado de ordenación de la columna
   */
  protected ariaSort(column: TableColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== column.key) return 'none';
    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Etiqueta accesible del botón de ordenación.
   *
   * @param column Columna que se puede ordenar
   * @returns Descripción para lectores de pantalla
   */
  protected sortAriaLabel(column: TableColumn<T>): string {
    const current = this.ariaSort(column);
    if (current === 'ascending') return `Ordenar ${column.label} de forma descendente`;
    if (current === 'descending') return `Ordenar ${column.label} de forma ascendente`;
    return `Ordenar por ${column.label}`;
  }

  /**
   * Indicador visual del estado de ordenación.
   *
   * @param column Columna de la cabecera
   * @returns Símbolo que representa la dirección
   */
  protected sortIndicator(column: TableColumn<T>): string {
    if (this.sortKey() !== column.key) return '↕';
    return this.sortDirection() === 'asc' ? '▲' : '▼';
  }

  /**
   * Formatea el valor de una celda según el tipo de la columna.
   *
   * @param row Fila de la que se extrae el valor
   * @param column Columna que define el formato
   * @returns Valor listo para mostrar
   */
  protected cellValue(row: T, column: TableColumn<T>): string {
    const value: unknown = row[column.key];
    if (value === null || value === undefined) return '—';

    switch (column.type) {
      case 'currency':
        return typeof value === 'number' ? this.currencyFormatter.format(value) : String(value);
      case 'number':
        return typeof value === 'number' ? this.numberFormatter.format(value) : String(value);
      case 'date':
        return typeof value === 'string' ? this.formatDate(value) : String(value);
      default:
        return String(value);
    }
  }

  /**
   * Clase CSS de una celda con formato `badge`.
   *
   * @param row Fila de la que se extrae el valor
   * @param column Columna que define el contenido
   * @returns Clase del distintivo
   */
  protected badgeClass(row: T, column: TableColumn<T>): string {
    return `badge badge--${this.cellValue(row, column)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')}`;
  }

  /**
   * Descripción accesible de una fila, usando su primera columna.
   *
   * @param row Fila de la que se obtiene la descripción
   * @returns Texto identificativo de la fila
   */
  protected rowIdentifier(row: T): string {
    const column = this.columns()[0];
    if (!column) return 'registro';
    return this.cellValue(row, column);
  }

  /**
   * Notifica la selección de una fila.
   *
   * @param row Fila seleccionada
   */
  protected selectRow(row: T): void {
    this.rowSelect.emit(row);
  }

  /**
   * Notifica la petición de edición de una fila.
   *
   * @param row Fila que se quiere editar
   */
  protected editRow(row: T): void {
    this.edit.emit(row);
  }

  /**
   * Notifica la petición de borrado de una fila.
   *
   * @param row Fila que se quiere eliminar
   */
  protected removeRow(row: T): void {
    this.remove.emit(row);
  }

  /**
   * Cambia de página, sin salir de los límites.
   *
   * @param page Número de página solicitado
   */
  protected goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  /**
   * Formatea una fecha ISO con el locale español.
   *
   * @param value Fecha en formato ISO 8601
   * @returns Fecha legible o el valor original si no es válida
   */
  private formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return this.dateFormatter.format(date);
  }
}

/**
 * Compara dos valores de celda de forma estable.
 *
 * @param first Primer valor
 * @param second Segundo valor
 * @returns Negativo si `first` va antes, positivo si va después
 */
function compareValues(first: unknown, second: unknown): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second;
  if (first instanceof Date && second instanceof Date) return first.getTime() - second.getTime();
  return String(first ?? '').localeCompare(String(second ?? ''), 'es', { numeric: true });
}
