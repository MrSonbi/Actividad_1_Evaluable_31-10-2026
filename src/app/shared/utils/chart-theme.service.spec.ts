import { TestBed } from '@angular/core/testing';

import { ChartThemeService } from './chart-theme.service';

describe('ChartThemeService', () => {
  let listeners: (() => void)[];

  beforeEach(() => {
    listeners = [];
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    } as unknown as MediaQueryList);
    document.documentElement.style.removeProperty('--app-chart-text');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty('--app-chart-text');
  });

  it('usa los colores del modo claro si las variables no están definidas', () => {
    const colors = TestBed.inject(ChartThemeService).colors();

    expect(colors.text).toBe('#3f4650');
    expect(colors.surface).toBe('#ffffff');
    expect(colors.status).toHaveLength(4);
  });

  it('lee los colores de las variables CSS', () => {
    document.documentElement.style.setProperty('--app-chart-text', '#d6d8dc');

    expect(TestBed.inject(ChartThemeService).colors().text).toBe('#d6d8dc');
  });

  it('actualiza los colores cuando cambia el modo del sistema', () => {
    const service = TestBed.inject(ChartThemeService);
    expect(service.colors().text).toBe('#3f4650');

    document.documentElement.style.setProperty('--app-chart-text', '#d6d8dc');
    listeners.forEach((listener) => listener());

    expect(service.colors().text).toBe('#d6d8dc');
  });
});
