import type { TableColumn } from '../../models/table.model';

/** Marca de orden de bytes: permite a Excel reconocer el archivo como UTF-8. */
const BOM = '\uFEFF';

/** Separador de columnas habitual en la configuración regional española. */
const SEPARATOR = ';';

/** Salto de línea del CSV (RFC 4180). */
const LINE_BREAK = '\r\n';

const decimalFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});
const numberFormat = new Intl.NumberFormat('es-ES', { useGrouping: false });
const dateFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Evita que una hoja de cálculo ejecute como fórmula un texto introducido por
 * un usuario, anteponiendo un apóstrofo a los caracteres que la inician.
 *
 * @param value Texto de la celda
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Convierte un valor en el texto de su celda. Los importes no llevan símbolo de
 * moneda ni separador de miles para que la hoja de cálculo los trate como números.
 *
 * @param value Valor de la fila
 * @param type Tipo de la columna
 */
function cellText(value: unknown, type: TableColumn<unknown>['type']): string {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number' && type === 'currency') return decimalFormat.format(value);
  if (typeof value === 'number' && type === 'number') return numberFormat.format(value);
  if (typeof value === 'string' && type === 'date') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? neutralizeFormula(value) : dateFormat.format(date);
  }

  return neutralizeFormula(String(value).replace(/[\u00a0\u202f]/g, ' '));
}

/**
 * Entrecomilla una celda si contiene el separador, comillas o saltos de línea.
 *
 * @param value Texto de la celda
 */
function escapeCell(value: string): string {
  return /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Genera el contenido de un CSV en UTF-8 con BOM y separador `;`.
 *
 * @typeParam T Tipo de fila
 * @param columns Columnas que se exportan, en orden
 * @param rows Filas que se exportan
 * @returns Texto completo del archivo
 */
export function buildCsv<T>(columns: readonly TableColumn<T>[], rows: readonly T[]): string {
  const header = columns.map((column) => escapeCell(column.label)).join(SEPARATOR);
  const lines = rows.map((row) =>
    columns.map((column) => escapeCell(cellText(row[column.key], column.type))).join(SEPARATOR),
  );

  return BOM + [header, ...lines].join(LINE_BREAK);
}
