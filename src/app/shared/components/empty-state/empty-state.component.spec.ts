import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [EmptyStateComponent] }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Sin productos');
    fixture.detectChanges();
  });

  it('muestra el título y el mensaje', () => {
    fixture.componentRef.setInput('message', 'Añade un producto para empezar.');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h3')?.textContent).toContain('Sin productos');
    expect(element.querySelector('.empty-state__message')?.textContent).toContain('Añade un producto');
    expect(element.querySelector('.empty-state')?.getAttribute('role')).toBe('status');
  });

  it('no muestra icono si no se recibe', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('ion-icon')).toBeNull();
  });

  it('muestra el icono recibido', () => {
    fixture.componentRef.setInput('icon', 'cube-outline');
    fixture.detectChanges();

    const icon = (fixture.nativeElement as HTMLElement).querySelector('ion-icon');
    expect(icon?.getAttribute('name')).toBe('cube-outline');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });

  it('muestra la acción solo con etiqueta y la emite al pulsar', () => {
    const element = fixture.nativeElement as HTMLElement;
    const actionSpy = vi.fn();
    fixture.componentInstance.action.subscribe(actionSpy);

    expect(element.querySelector('.empty-state__action')).toBeNull();

    fixture.componentRef.setInput('actionLabel', 'Reintentar');
    fixture.detectChanges();

    element.querySelector<HTMLButtonElement>('.empty-state__action')?.click();
    expect(actionSpy).toHaveBeenCalledTimes(1);
  });
});
