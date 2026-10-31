import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

import { ThemeService } from './theme.service';

/** Colores del tema activo que necesitan los gráficos. */
export interface ChartThemeColors {
  /** Color de textos: ejes y leyendas. */
  text: string;
  /** Color de las líneas de la cuadrícula. */
  grid: string;
  /** Color de fondo del panel, usado para separar sectores. */
  surface: string;
  /** Color principal de las series. */
  primary: string;
  /** Colores de los pedidos, en el orden de `ORDER_STATUSES`. */
  status: readonly string[];
}

/**
 * Lee de las variables CSS los colores del tema para Chart.js, que dibuja en un
 * lienzo y no puede usar `var()`. Los actualiza si cambia el modo claro u oscuro,
 * ya sea por el sistema o por el botón de la cabecera.
 */
@Injectable({ providedIn: 'root' })
export class ChartThemeService {
  private readonly document = inject(DOCUMENT);
  // Se crea antes de la primera lectura: es quien pone la clase del tema en `<html>`.
  private readonly themeService = inject(ThemeService);
  private readonly current = signal(this.read(), {
    equal: (first, second) => JSON.stringify(first) === JSON.stringify(second),
  });

  /** Colores del tema activo. */
  readonly colors = this.current.asReadonly();

  constructor() {
    effect(() => {
      this.themeService.isDark();
      this.current.set(this.read());
    });

    const view = this.document.defaultView;
    view?.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.current.set(this.read()));

    // La hoja de estilos global puede cargarse después del primer dibujo.
    if (this.document.readyState !== 'complete') {
      view?.addEventListener('load', () => this.current.set(this.read()), { once: true });
    }
  }

  /** Lee los colores de las variables CSS, con los del modo claro como respaldo. */
  private read(): ChartThemeColors {
    const view = this.document.defaultView;
    const styles = view?.getComputedStyle(this.document.documentElement);
    const token = (name: string, fallback: string): string => styles?.getPropertyValue(name).trim() || fallback;

    return {
      text: token('--app-chart-text', '#3f4650'),
      grid: token('--app-chart-grid', '#d7d8da'),
      surface: token('--app-chart-surface', '#ffffff'),
      primary: token('--app-chart-primary', '#0054e9'),
      status: [
        token('--app-chart-status-pending', '#b45309'),
        token('--app-chart-status-paid', '#0054e9'),
        token('--app-chart-status-shipped', '#0f766e'),
        token('--app-chart-status-cancelled', '#b91c1c'),
      ],
    };
  }
}
