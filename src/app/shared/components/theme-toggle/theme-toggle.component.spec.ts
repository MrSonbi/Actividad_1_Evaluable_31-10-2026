import { computed, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import { ThemeService } from '../../utils/theme.service';

import { ThemeToggleComponent } from './theme-toggle.component';

describe('ThemeToggleComponent', () => {
  let fixture: ComponentFixture<ThemeToggleComponent>;
  const dark = signal(false);

  /** Botón renderizado. */
  function button(): HTMLButtonElement {
    return (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
  }

  beforeEach(async () => {
    dark.set(false);
    await TestBed.configureTestingModule({
      imports: [ThemeToggleComponent],
      providers: [
        {
          provide: ThemeService,
          useValue: { isDark: computed(() => dark()), toggle: () => dark.update((value) => !value) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ThemeToggleComponent);
    fixture.detectChanges();
  });

  it('tiene un nombre accesible que no cambia con el estado', () => {
    expect(button().getAttribute('aria-label')).toBe('Modo oscuro');
    expect(button().type).toBe('button');
  });

  it('indica el estado con aria-pressed', () => {
    expect(button().getAttribute('aria-pressed')).toBe('false');

    dark.set(true);
    fixture.detectChanges();

    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('alterna el modo al pulsarlo', () => {
    button().click();
    fixture.detectChanges();

    expect(dark()).toBe(true);
    expect(button().getAttribute('aria-pressed')).toBe('true');
  });

  it('oculta el icono a los lectores de pantalla', () => {
    expect(button().querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
