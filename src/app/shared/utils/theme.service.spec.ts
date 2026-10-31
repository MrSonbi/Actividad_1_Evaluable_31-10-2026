import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let listeners: ((event: MediaQueryListEvent) => void)[];

  /**
   * Simula el modo del sistema antes de crear el servicio.
   *
   * @param matches Si el sistema está en modo oscuro
   */
  function mockSystem(matches: boolean): void {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.push(listener),
    } as unknown as MediaQueryList);
  }

  /** Indica si `<html>` tiene la clase de la paleta oscura. */
  function hasDarkClass(): boolean {
    return document.documentElement.classList.contains('ion-palette-dark');
  }

  beforeEach(() => {
    listeners = [];
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
  });

  it('respeta el modo del sistema si no hay una elección guardada', () => {
    mockSystem(true);

    expect(TestBed.inject(ThemeService).isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('da prioridad a la elección guardada sobre el sistema', () => {
    mockSystem(true);
    localStorage.setItem('app-theme', 'light');

    expect(TestBed.inject(ThemeService).isDark()).toBe(false);
    expect(hasDarkClass()).toBe(false);
  });

  it('ignora un valor guardado que no es válido', () => {
    mockSystem(true);
    localStorage.setItem('app-theme', 'sepia');

    expect(TestBed.inject(ThemeService).isDark()).toBe(true);
  });

  it('alterna el modo, cambia la clase y guarda la elección', () => {
    mockSystem(false);
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
    expect(localStorage.getItem('app-theme')).toBe('dark');

    service.toggle();
    expect(service.isDark()).toBe(false);
    expect(hasDarkClass()).toBe(false);
    expect(localStorage.getItem('app-theme')).toBe('light');
  });

  it('sigue los cambios del sistema mientras no se haya elegido un modo', () => {
    mockSystem(false);
    const service = TestBed.inject(ThemeService);

    listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));

    expect(service.isDark()).toBe(true);
    expect(hasDarkClass()).toBe(true);
  });

  it('no cambia con el sistema si ya se ha elegido un modo', () => {
    mockSystem(false);
    const service = TestBed.inject(ThemeService);
    service.toggle();

    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));

    expect(service.isDark()).toBe(true);
  });

  it('funciona aunque el almacenamiento falle', () => {
    mockSystem(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const service = TestBed.inject(ThemeService);

    expect(() => service.toggle()).not.toThrow();
    expect(service.isDark()).toBe(true);
  });
});
