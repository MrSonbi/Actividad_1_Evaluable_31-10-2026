import { DOCUMENT, inject, Injectable, InjectionToken } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type autoTable from 'jspdf-autotable';

import { AuthStore } from '../../../core/auth/auth.store';
import type { TableColumn } from '../../models/table.model';

import { buildCsv } from './csv.util';

/** Formatos de exportación disponibles. */
export type ReportFormat = 'csv' | 'pdf';

/**
 * Datos de un informe.
 *
 * @typeParam T Tipo de fila
 */
export interface ReportOptions<T> {
  /** Título del informe. */
  title: string;
  /** Línea descriptiva bajo el título (por ejemplo, los filtros aplicados). */
  subtitle?: string;
  /** Columnas que se exportan, en orden. */
  columns: readonly TableColumn<T>[];
  /** Filas que se exportan. */
  rows: readonly T[];
  /** Nombre base del archivo, sin fecha ni extensión. */
  filename: string;
}

/** Bibliotecas necesarias para generar un PDF. */
export interface PdfLibrary {
  /** Crea un documento A4 vertical con el punto como unidad. */
  createDocument: () => jsPDF;
  /** Función que dibuja la tabla en el documento. */
  autoTable: typeof autoTable;
}

/**
 * Carga las bibliotecas de PDF bajo demanda, para que no aumenten la carga
 * inicial de la aplicación.
 */
async function loadPdfLibrary(): Promise<PdfLibrary> {
  const [{ jsPDF: JsPdf }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);

  return {
    createDocument: () => new JsPdf({ orientation: 'portrait', unit: 'pt', format: 'a4' }),
    autoTable: autoTableModule.default,
  };
}

/** Cargador de las bibliotecas de PDF; se puede sustituir en los tests. */
export const PDF_LIBRARY = new InjectionToken<() => Promise<PdfLibrary>>('PDF_LIBRARY', {
  providedIn: 'root',
  factory: () => loadPdfLibrary,
});

/** Margen lateral de la página, en puntos. */
const PAGE_MARGIN = 40;

/** Espacio reservado para la cabecera de cada página, en puntos. */
const HEADER_HEIGHT = 96;

/** Espacio reservado para el pie de cada página, en puntos. */
const FOOTER_HEIGHT = 48;

const currencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const numberFormat = new Intl.NumberFormat('es-ES');
const dateFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' });
const timestampFormat = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' });

/**
 * Convierte un valor en el texto de su celda del PDF. Sustituye los espacios
 * especiales de `Intl` por espacios normales, que la fuente estándar sí incluye.
 *
 * @param value Valor de la fila
 * @param type Tipo de la columna
 */
function pdfCell(value: unknown, type: TableColumn<unknown>['type']): string {
  if (value === null || value === undefined) return '-';

  let text = String(value);
  if (typeof value === 'number' && type === 'currency') text = currencyFormat.format(value);
  if (typeof value === 'number' && type === 'number') text = numberFormat.format(value);
  if (typeof value === 'string' && type === 'date') {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) text = dateFormat.format(date);
  }

  return text.replace(/[  ]/g, ' ');
}

/**
 * Fecha local en formato `AAAA-MM-DD` para el nombre del archivo.
 *
 * @param date Fecha de generación
 */
function fileDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Texto con el número de registros de un informe.
 *
 * @param count Número de filas exportadas
 */
export function reportCount(count: number): string {
  return `${count} ${count === 1 ? 'registro' : 'registros'}`;
}

/**
 * Genera y descarga informes en CSV y PDF.
 *
 * Exporta exactamente las filas que recibe: la página decide cuáles son, de
 * modo que el informe respeta los filtros y el orden que ve el usuario.
 */
@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly document = inject(DOCUMENT);
  private readonly authStore = inject(AuthStore);
  private readonly loadPdf = inject(PDF_LIBRARY);

  /**
   * Genera el informe en el formato indicado.
   *
   * @typeParam T Tipo de fila
   * @param format Formato solicitado
   * @param options Datos del informe
   */
  async exportTable<T>(format: ReportFormat, options: ReportOptions<T>): Promise<void> {
    if (format === 'csv') {
      this.exportCsv(options.columns, options.rows, options.filename);
      return;
    }
    await this.exportPdf(options);
  }

  /**
   * Descarga un CSV en UTF-8 con BOM y separador `;`.
   *
   * @typeParam T Tipo de fila
   * @param columns Columnas que se exportan
   * @param rows Filas que se exportan
   * @param filename Nombre base del archivo
   */
  exportCsv<T>(columns: readonly TableColumn<T>[], rows: readonly T[], filename: string): void {
    const blob = new Blob([buildCsv(columns, rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = this.document.createElement('a');
    link.href = url;
    link.download = `${filename}-${fileDate(new Date())}.csv`;
    this.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * Descarga un PDF con cabecera (título, fecha y usuario que lo genera), filas
   * alternas y pie «Página X de Y».
   *
   * @typeParam T Tipo de fila
   * @param options Datos del informe
   */
  async exportPdf<T>(options: ReportOptions<T>): Promise<void> {
    const { createDocument, autoTable: drawTable } = await this.loadPdf();
    const doc = createDocument();
    const now = new Date();

    drawTable(doc, {
      head: [options.columns.map((column) => column.label)],
      body: options.rows.map((row) => options.columns.map((column) => pdfCell(row[column.key], column.type))),
      margin: { top: HEADER_HEIGHT, right: PAGE_MARGIN, bottom: FOOTER_HEIGHT, left: PAGE_MARGIN },
      styles: { fontSize: 9, cellPadding: 5, textColor: [33, 37, 41] },
      headStyles: { fillColor: [0, 84, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [238, 243, 252] },
      didDrawPage: () => this.drawHeader(doc, options, now),
    });

    this.drawFooters(doc);
    doc.save(`${options.filename}-${fileDate(now)}.pdf`);
  }

  /**
   * Dibuja la cabecera de una página.
   *
   * @typeParam T Tipo de fila
   * @param doc Documento
   * @param options Datos del informe
   * @param generatedAt Fecha de generación
   */
  private drawHeader<T>(doc: jsPDF, options: ReportOptions<T>, generatedAt: Date): void {
    const user = this.authStore.profile()?.full_name || this.authStore.email() || 'Usuario';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(33, 37, 41);
    doc.text(options.title, PAGE_MARGIN, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(84, 92, 104);
    if (options.subtitle) doc.text(options.subtitle, PAGE_MARGIN, 58);
    doc.text(`Generado el ${timestampFormat.format(generatedAt)} por ${user}`, PAGE_MARGIN, 72);
  }

  /**
   * Escribe «Página X de Y» en todas las páginas, una vez conocido el total.
   *
   * @param doc Documento
   */
  private drawFooters(doc: jsPDF): void {
    const total = doc.getNumberOfPages();
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(84, 92, 104);
    for (let page = 1; page <= total; page++) {
      doc.setPage(page);
      doc.text(`Página ${page} de ${total}`, width - PAGE_MARGIN, height - 24, { align: 'right' });
    }
  }
}
