import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import type { TableColumn } from '../../models/table.model';

import { DataTableComponent } from './data-table.component';

interface DemoRow {
  id: number;
  name: string;
  price: number;
}

const columns: TableColumn<DemoRow>[] = [
  { key: 'name', label: 'Nombre', sortable: true },
  { key: 'price', label: 'Precio', type: 'currency', sortable: true },
];

const rows: DemoRow[] = [
  { id: 1, name: 'Ratón', price: 10 },
  { id: 2, name: 'Teclado', price: 20 },
  { id: 3, name: 'Monitor', price: 100 },
];

describe('DataTableComponent', () => {
  let fixture: ComponentFixture<DataTableComponent<DemoRow>>;

  function createTable(pageSize = 10): void {
    fixture = TestBed.createComponent(DataTableComponent<DemoRow>);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('caption', 'Productos de prueba');
    fixture.detectChanges();
  }

  function cellTexts(): string[] {
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr:first-child td')).map((cell) =>
      (cell.textContent ?? '').trim(),
    );
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTableComponent] }).compileComponents();
  });

  it('renderiza la cabecera, el caption y las filas con formato', () => {
    createTable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('caption')?.textContent).toContain('Productos de prueba');
    expect(element.querySelectorAll('thead th')).toHaveLength(3);
    expect(element.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(cellTexts()[1]).toContain('10,00');
  });

  it('filtra las filas y emite el texto de búsqueda', async () => {
    createTable();
    const searchSpy = vi.fn();
    fixture.componentInstance.searchChange.subscribe(searchSpy);

    const input = (fixture.nativeElement as HTMLElement).querySelector('input[type="search"]') as HTMLInputElement;
    input.value = 'monitor';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(searchSpy).toHaveBeenCalledWith('monitor');
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr')).toHaveLength(1);
    expect(cellTexts()[0]).toContain('Monitor');
  });

  it('ordena de forma ascendente y descendente al pulsar la cabecera', () => {
    createTable();
    const element = fixture.nativeElement as HTMLElement;
    const sortButtons = element.querySelectorAll<HTMLButtonElement>('.sort-button');

    sortButtons[1].click();
    fixture.detectChanges();
    expect(cellTexts()[0]).toContain('Ratón');
    expect(element.querySelectorAll('thead th')[1].getAttribute('aria-sort')).toBe('ascending');

    sortButtons[1].click();
    fixture.detectChanges();
    expect(cellTexts()[0]).toContain('Monitor');
    expect(element.querySelectorAll('thead th')[1].getAttribute('aria-sort')).toBe('descending');
  });

  it('pagina los resultados y avisa del número de página', () => {
    createTable(2);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(element.querySelector('.pagination')?.textContent).toContain('Página 1 de 2');

    const next = element.querySelectorAll<HTMLButtonElement>('.page-button')[1];
    next.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(cellTexts()[0]).toContain('Monitor');
    expect(element.querySelector('.pagination')?.textContent).toContain('Página 2 de 2');
  });

  it('ordena todas las filas antes de paginar, no solo la página visible', () => {
    createTable(5);
    const manyRows: DemoRow[] = Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      name: String.fromCharCode(90 - index),
      price: index,
    }));
    fixture.componentRef.setInput('rows', manyRows);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.pagination')?.textContent).toContain('Página 1 de 3');

    element.querySelectorAll<HTMLButtonElement>('.sort-button')[0].click();
    fixture.detectChanges();

    expect(cellTexts()[0]).toContain('O');
    expect(element.querySelector('.pagination')?.textContent).toContain('Página 1 de 3');
  });

  it('emite rowSelect, edit y remove desde los botones de acción', () => {
    createTable();
    fixture.componentRef.setInput('editable', true);
    fixture.componentRef.setInput('removable', true);
    fixture.detectChanges();

    const selected = vi.fn();
    const edited = vi.fn();
    const removed = vi.fn();
    fixture.componentInstance.rowSelect.subscribe(selected);
    fixture.componentInstance.edit.subscribe(edited);
    fixture.componentInstance.remove.subscribe(removed);

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      'tbody tr:first-child .action-button',
    );
    buttons.forEach((button) => button.click());

    expect(selected).toHaveBeenCalledWith(rows[0]);
    expect(edited).toHaveBeenCalledWith(rows[0]);
    expect(removed).toHaveBeenCalledWith(rows[0]);
  });

  it('muestra el estado de carga y el mensaje de lista vacía', () => {
    createTable();
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.data-table')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('.message')?.textContent).toContain('Cargando datos');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('rows', []);
    fixture.detectChanges();

    expect(element.querySelector('.message')?.textContent).toContain('No hay resultados');
  });
});
