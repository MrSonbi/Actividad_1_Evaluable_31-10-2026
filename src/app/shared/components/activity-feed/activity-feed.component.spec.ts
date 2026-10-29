import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import type { ActivityFeedItem } from '../../models/activity-feed.model';

import { ActivityFeedComponent } from './activity-feed.component';

const items: ActivityFeedItem[] = [
  {
    id: 'act-1',
    action: 'create',
    entity: 'product',
    summary: 'Producto creado: Teclado',
    actor: 'demo@example.com',
    at: '2026-10-29T10:15:00.000Z',
  },
  {
    id: 'act-2',
    action: 'delete',
    entity: 'customer',
    summary: 'Cliente eliminado: Ana',
    actor: null,
    at: 'fecha-no-valida',
  },
];

describe('ActivityFeedComponent', () => {
  let fixture: ComponentFixture<ActivityFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ActivityFeedComponent] }).compileComponents();
    fixture = TestBed.createComponent(ActivityFeedComponent);
    fixture.detectChanges();
  });

  it('muestra el mensaje vacío y anuncia los cambios con aria-live', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.activity-feed__state')?.textContent).toContain('Todavía no hay actividad');
    expect(element.querySelector('.activity-feed__content')?.getAttribute('aria-live')).toBe('polite');
  });

  it('muestra el estado de carga', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.activity-feed')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('.activity-feed__state')?.textContent).toContain('Cargando actividad');
  });

  it('renderiza las entradas con acción, entidad y fecha', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const entries = element.querySelectorAll('.activity');
    expect(entries).toHaveLength(2);
    expect(entries[0].querySelector('.activity__badge')?.textContent).toContain('Alta');
    expect(entries[0].querySelector('.activity__summary')?.textContent).toContain('Teclado');
    expect(entries[0].querySelector('.activity__meta')?.textContent).toContain('Producto');
    expect(entries[0].querySelector('time')?.getAttribute('datetime')).toBe('2026-10-29T10:15:00.000Z');
    expect(entries[1].querySelector('.activity__badge')?.textContent).toContain('Borrado');
    expect(entries[1].querySelector('.activity__meta')?.textContent).toContain('Cliente');
  });

  it('gestiona el actor opcional y las fechas no válidas', () => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const entries = element.querySelectorAll('.activity');
    expect(entries[0].querySelector('.activity__meta')?.textContent).toContain('demo@example.com');
    expect(entries[1].querySelector('.activity__meta')?.textContent).not.toContain('@');
    expect(entries[1].querySelector('time')?.textContent).toBe('fecha-no-valida');
  });

  it('usa el título recibido como nombre accesible del bloque', () => {
    fixture.componentRef.setInput('title', 'Últimos movimientos');
    fixture.detectChanges();

    const section = (fixture.nativeElement as HTMLElement).querySelector('.activity-feed');
    expect(section?.getAttribute('aria-label')).toBe('Últimos movimientos');
    expect(section?.querySelector('h3')?.textContent).toContain('Últimos movimientos');
  });
});
