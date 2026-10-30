import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import type { OrderStatus } from '../../../core/models/order.model';

import { OrderStatusFilterComponent } from './order-status-filter.component';

describe('OrderStatusFilterComponent', () => {
  let fixture: ComponentFixture<OrderStatusFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OrderStatusFilterComponent] }).compileComponents();
    fixture = TestBed.createComponent(OrderStatusFilterComponent);
    fixture.detectChanges();
  });

  function select(): HTMLSelectElement {
    const element = (fixture.nativeElement as HTMLElement).querySelector('select');
    if (!element) throw new Error('No se encontró el selector de estado');
    return element;
  }

  it('muestra todos los estados con etiquetas en español', () => {
    const options = Array.from(select().options).map((option) => option.textContent?.trim());

    expect(options).toEqual(['Todos los estados', 'Pendiente', 'Pagado', 'Enviado', 'Cancelado']);
  });

  it('asocia la etiqueta a un id propio de cada instancia', () => {
    const other = TestBed.createComponent(OrderStatusFilterComponent);
    other.detectChanges();
    const otherSelect = (other.nativeElement as HTMLElement).querySelector('select');
    const label = (fixture.nativeElement as HTMLElement).querySelector('label');

    expect(label?.getAttribute('for')).toBe(select().id);
    expect(otherSelect?.id).not.toBe(select().id);
  });

  it('refleja el valor recibido mediante model()', () => {
    fixture.componentRef.setInput('value', 'paid');
    fixture.detectChanges();

    expect(select().value).toBe('paid');
  });

  it('emite el estado seleccionado y permite volver a «todos»', () => {
    const emitted: (OrderStatus | null)[] = [];
    fixture.componentInstance.value.subscribe((value) => emitted.push(value));

    select().value = 'shipped';
    select().dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.value()).toBe('shipped');
    expect(emitted).toEqual(['shipped']);

    select().value = '';
    select().dispatchEvent(new Event('change'));

    expect(fixture.componentInstance.value()).toBeNull();
    expect(emitted).toEqual(['shipped', null]);
  });
});
