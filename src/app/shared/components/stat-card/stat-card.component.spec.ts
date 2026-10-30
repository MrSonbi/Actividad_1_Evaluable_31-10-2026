import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StatCardComponent] }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    fixture.componentRef.setInput('title', 'Productos');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
  });

  it('muestra el título y el valor', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.stat-card__title')?.textContent).toContain('Productos');
    expect(element.querySelector('.stat-card__value')?.textContent).toContain('42');
  });

  it('no muestra icono si no se recibe', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('ion-icon')).toBeNull();
  });

  it('muestra el icono recibido como decorativo', () => {
    fixture.componentRef.setInput('icon', 'cube-outline');
    fixture.detectChanges();

    const icon = (fixture.nativeElement as HTMLElement).querySelector('ion-icon');
    expect(icon?.getAttribute('name')).toBe('cube-outline');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('muestra la tendencia con su dirección', () => {
    fixture.componentRef.setInput('trend', { direction: 'up', label: '+12 % este mes' });
    fixture.componentRef.setInput('hint', 'Frente al mes anterior');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const trend = element.querySelector('.stat-card__trend');
    expect(trend?.textContent).toContain('+12 % este mes');
    expect(trend?.classList.contains('stat-card__trend--up')).toBe(true);
    expect(trend?.textContent).toContain('↑');
    expect(element.querySelector('.stat-card__hint')?.textContent).toContain('Frente al mes anterior');
  });
});
