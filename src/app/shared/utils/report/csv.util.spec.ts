import type { TableColumn } from '../../models/table.model';

import { buildCsv } from './csv.util';

interface DemoRow {
  name: string | null;
  price: number;
  stock: number;
  created_at: string;
}

const COLUMNS: TableColumn<DemoRow>[] = [
  { key: 'name', label: 'Nombre' },
  { key: 'price', label: 'Precio', type: 'currency' },
  { key: 'stock', label: 'Stock', type: 'number' },
  { key: 'created_at', label: 'Fecha', type: 'date' },
];

/**
 * Construye una fila de prueba con el nombre indicado.
 *
 * @param name Nombre de la fila
 */
function row(name: string | null): DemoRow {
  return { name, price: 1234.5, stock: 1500, created_at: new Date(2026, 9, 15, 12).toISOString() };
}

/**
 * Devuelve las líneas de datos de un CSV de una sola columna de texto.
 *
 * @param name Nombre de la fila
 */
function nameCell(name: string): string {
  return buildCsv([{ key: 'name', label: 'Nombre' }] as TableColumn<DemoRow>[], [row(name)]).split('\r\n')[1];
}

describe('buildCsv', () => {
  it('empieza por el BOM y usa punto y coma como separador', () => {
    const csv = buildCsv(COLUMNS, []);

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1)).toBe('Nombre;Precio;Stock;Fecha');
  });

  it('separa las filas con CRLF y formatea los valores para una hoja de cálculo en español', () => {
    const lines = buildCsv(COLUMNS, [row('Ratón'), row('Teclado')]).split('\r\n');

    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('Ratón;1234,50;1500;15/10/2026');
    expect(lines[2]).toBe('Teclado;1234,50;1500;15/10/2026');
  });

  it('entrecomilla las celdas con separador, comillas o saltos de línea', () => {
    expect(nameCell('Ana; Luis')).toBe('"Ana; Luis"');
    expect(nameCell('Monitor 24"')).toBe('"Monitor 24"""');
    expect(buildCsv([{ key: 'name', label: 'Nombre' }] as TableColumn<DemoRow>[], [row('uno\ndos')])).toContain(
      '"uno\ndos"',
    );
  });

  it('neutraliza los textos que una hoja de cálculo ejecutaría como fórmula', () => {
    expect(nameCell('=SUMA(A1:A2)')).toBe("'=SUMA(A1:A2)");
    expect(nameCell('+34600000000')).toBe("'+34600000000");
    expect(nameCell('-1')).toBe("'-1");
    expect(nameCell('@cmd')).toBe("'@cmd");
  });

  it('no altera los importes negativos', () => {
    const lines = buildCsv(COLUMNS, [{ ...row('Ajuste'), price: -5 }]).split('\r\n');

    expect(lines[1]).toContain(';-5,00;');
  });

  it('deja vacías las celdas sin valor y conserva las fechas no válidas', () => {
    const lines = buildCsv(COLUMNS, [{ ...row(null), created_at: 'sin fecha' }]).split('\r\n');

    expect(lines[1]).toBe(';1234,50;1500;sin fecha');
  });
});
