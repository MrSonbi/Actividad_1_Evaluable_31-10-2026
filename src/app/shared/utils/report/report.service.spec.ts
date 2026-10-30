import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthStore } from '../../../core/auth/auth.store';
import type { TableColumn } from '../../models/table.model';

import { PDF_LIBRARY, ReportService } from './report.service';

interface DemoRow {
  name: string | null;
  price: number;
  created_at: string;
}

interface TableConfig {
  head: string[][];
  body: string[][];
  alternateRowStyles: { fillColor: number[] };
  didDrawPage: () => void;
}

const COLUMNS: TableColumn<DemoRow>[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'price', label: 'Precio', type: 'currency' },
  { key: 'created_at', label: 'Fecha', type: 'date' },
];

const ROWS: DemoRow[] = [
  { name: 'Ratón', price: 1234.5, created_at: new Date(2026, 9, 15, 12).toISOString() },
  { name: null, price: 10, created_at: 'sin fecha' },
];

describe('ReportService', () => {
  let service: ReportService;
  let doc: {
    setFont: ReturnType<typeof vi.fn>;
    setFontSize: ReturnType<typeof vi.fn>;
    setTextColor: ReturnType<typeof vi.fn>;
    setPage: ReturnType<typeof vi.fn>;
    text: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    getNumberOfPages: ReturnType<typeof vi.fn>;
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  };
  let autoTable: ReturnType<typeof vi.fn>;
  let fullName: string;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 12));
    fullName = 'Admin Demo';

    doc = {
      setFont: vi.fn(),
      setFontSize: vi.fn(),
      setTextColor: vi.fn(),
      setPage: vi.fn(),
      text: vi.fn(),
      save: vi.fn(),
      getNumberOfPages: vi.fn(() => 2),
      internal: { pageSize: { getWidth: () => 600, getHeight: () => 800 } },
    };
    autoTable = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: {
            profile: signal({ full_name: fullName }),
            email: signal('demo@example.com'),
          },
        },
        {
          provide: PDF_LIBRARY,
          useValue: async () => ({ createDocument: () => doc, autoTable }),
        },
      ],
    });
    service = TestBed.inject(ReportService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  /** Textos escritos en el documento. */
  function writtenTexts(): string[] {
    return doc.text.mock.calls.map((call) => String(call[0]));
  }

  /** Configuración recibida por autotable. */
  function tableConfig(): TableConfig {
    return autoTable.mock.calls[0][1] as TableConfig;
  }

  describe('exportCsv', () => {
    let createObjectURL: ReturnType<typeof vi.fn>;
    let revokeObjectURL: ReturnType<typeof vi.fn>;
    let downloads: { name: string; href: string }[];

    beforeEach(() => {
      createObjectURL = vi.fn(() => 'blob:informe');
      revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
      downloads = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ name: this.download, href: this.href });
      });
    });

    it('descarga un CSV con la fecha en el nombre y libera la URL', () => {
      service.exportCsv(COLUMNS, ROWS, 'productos');

      expect(downloads).toEqual([{ name: 'productos-2026-10-05.csv', href: 'blob:informe' }]);
      const blob = createObjectURL.mock.calls[0][0] as Blob;
      expect(blob.type).toBe('text/csv;charset=utf-8');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:informe');
    });

    it('no deja el enlace temporal en el documento', () => {
      service.exportCsv(COLUMNS, ROWS, 'productos');

      expect(document.querySelector('a[download]')).toBeNull();
    });

    it('exportTable usa el CSV sin cargar las bibliotecas de PDF', async () => {
      await service.exportTable('csv', { title: 'Productos', columns: COLUMNS, rows: ROWS, filename: 'productos' });

      expect(downloads).toHaveLength(1);
      expect(autoTable).not.toHaveBeenCalled();
    });
  });

  describe('exportPdf', () => {
    const OPTIONS = {
      title: 'Productos',
      subtitle: '2 registros',
      columns: COLUMNS,
      rows: ROWS,
      filename: 'productos',
    };

    it('dibuja la tabla con todas las filas formateadas y filas alternas', async () => {
      await service.exportPdf(OPTIONS);

      const config = tableConfig();
      expect(config.head).toEqual([['Nombre', 'Precio', 'Fecha']]);
      expect(config.body).toHaveLength(2);
      expect(config.body[0][0]).toBe('Ratón');
      expect(config.body[0][1]).toBe('1234,50 €');
      expect(config.body[0][2]).toContain('2026');
      expect(config.body[1]).toEqual(['-', '10,00 €', 'sin fecha']);
      expect(config.alternateRowStyles.fillColor).toHaveLength(3);
    });

    it('escribe en la cabecera el título, el subtítulo, la fecha y el usuario', async () => {
      await service.exportPdf(OPTIONS);

      tableConfig().didDrawPage();

      const texts = writtenTexts();
      expect(texts).toContain('Productos');
      expect(texts).toContain('2 registros');
      const generated = texts.find((text) => text.startsWith('Generado el'));
      expect(generated).toContain('2026');
      expect(generated).toContain('por Admin Demo');
    });

    it('escribe «Página X de Y» en cada página y guarda el archivo', async () => {
      await service.exportPdf(OPTIONS);

      expect(doc.setPage.mock.calls.map((call) => call[0])).toEqual([1, 2]);
      expect(writtenTexts()).toEqual(['Página 1 de 2', 'Página 2 de 2']);
      expect(doc.save).toHaveBeenCalledWith('productos-2026-10-05.pdf');
    });

    it('exportTable usa el PDF', async () => {
      await service.exportTable('pdf', OPTIONS);

      expect(autoTable).toHaveBeenCalledTimes(1);
      expect(doc.save).toHaveBeenCalledTimes(1);
    });

    it('propaga el error si no se pueden cargar las bibliotecas', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: AuthStore, useValue: { profile: signal(null), email: signal(null) } },
          { provide: PDF_LIBRARY, useValue: () => Promise.reject(new Error('sin red')) },
        ],
      });

      await expect(TestBed.inject(ReportService).exportPdf(OPTIONS)).rejects.toThrow('sin red');
    });
  });
});
