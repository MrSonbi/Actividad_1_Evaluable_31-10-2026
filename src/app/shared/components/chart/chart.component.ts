import { ChangeDetectionStrategy, Component, effect, inject, input, output, viewChild } from '@angular/core';
import type { ElementRef, OnDestroy } from '@angular/core';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';
import Chart from 'chart.js/auto';

import type { ChartPoint } from '../../models/chart.model';
import { ChartThemeService } from '../../utils/chart-theme.service';
import type { ChartThemeColors } from '../../utils/chart-theme.service';

/**
 * Envoltorio accesible de Chart.js.
 *
 * Crea el gráfico cuando la vista está lista y lo actualiza con `chart.update()`
 * cuando cambian los datos, sin repetir la animación de entrada. Solo lo vuelve a
 * crear si cambia el tipo o el tema, y lo destruye siempre en `ngOnDestroy` para
 * liberar la instancia de Chart.js y sus listeners.
 */
@Component({
  selector: 'app-chart',
  standalone: true,
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartComponent implements OnDestroy {
  /** Tipo de gráfico de Chart.js (`line`, `bar`, `doughnut`, `pie`…). */
  readonly type = input.required<ChartType>();

  /** Datos del gráfico. */
  readonly data = input.required<ChartData>();

  /** Opciones de Chart.js. */
  readonly options = input<ChartOptions>({});

  /** Etiqueta accesible del gráfico. */
  readonly ariaLabel = input.required<string>();

  /** Resumen textual que se ofrece a lectores de pantalla. */
  readonly summary = input<readonly string[]>([]);

  /** Altura CSS del contenedor del lienzo; el gráfico la ocupa siempre entera. */
  readonly height = input('20rem');

  /** Emite el punto seleccionado al hacer clic sobre el gráfico. */
  readonly pointSelect = output<ChartPoint>();

  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private readonly theme = inject(ChartThemeService);
  private chart: Chart | null = null;
  private renderedType: ChartType | null = null;
  private renderedTheme: ChartThemeColors | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvas();
      const type = this.type();
      const data = this.data();
      const options = this.options();
      const theme = this.theme.colors();

      if (!canvas) return;
      if (this.chart && this.renderedType === type && this.renderedTheme === theme) {
        this.update(this.chart, data, options);
      } else {
        this.render(canvas.nativeElement, type, data, options, theme);
      }
    });
  }

  /** Destruye el gráfico para liberar recursos. */
  ngOnDestroy(): void {
    this.destroyChart();
  }

  /**
   * Crea una nueva instancia de Chart.js con el manejador de selección.
   *
   * @param canvas Lienzo donde se dibuja
   * @param type Tipo de gráfico
   * @param data Datos del gráfico
   * @param options Opciones del gráfico
   * @param theme Colores del tema activo
   */
  private render(
    canvas: HTMLCanvasElement,
    type: ChartType,
    data: ChartData,
    options: ChartOptions,
    theme: ChartThemeColors,
  ): void {
    this.destroyChart();
    Chart.defaults.color = theme.text;
    Chart.defaults.borderColor = theme.grid;
    this.chart = new Chart(canvas, {
      type,
      data,
      options: this.withPointSelection(options),
    });
    this.renderedType = type;
    this.renderedTheme = theme;
  }

  /**
   * Aplica los datos nuevos a la instancia actual. Conserva los objetos de cada
   * serie porque Chart.js los usa para reconocerla: si se sustituyen, la dibuja
   * de nuevo desde cero con la animación de entrada.
   *
   * @param chart Instancia actual
   * @param data Datos nuevos
   * @param options Opciones del gráfico
   */
  private update(chart: Chart, data: ChartData, options: ChartOptions): void {
    const current = chart.data;
    current.labels = data.labels;
    data.datasets.forEach((dataset, index) => {
      const existing = current.datasets[index];
      if (existing) {
        Object.assign(existing, dataset);
      } else {
        current.datasets.push(dataset);
      }
    });
    current.datasets.length = data.datasets.length;

    chart.options = this.withPointSelection(options);
    chart.update(this.prefersReducedMotion() ? 'none' : undefined);
  }

  /** Indica si el usuario ha pedido reducir las animaciones. */
  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Añade la emisión de `pointSelect` a las opciones del gráfico, respetando
   * el manejador `onClick` que haya configurado la página. Fuerza además
   * `maintainAspectRatio: false` para que el gráfico se ajuste a la altura del
   * contenedor, sea cual sea su tipo, y quita la animación si el usuario pidió
   * reducirla.
   *
   * @param options Opciones originales
   * @returns Opciones con el manejador de selección
   */
  private withPointSelection(options: ChartOptions): ChartOptions {
    return {
      ...options,
      maintainAspectRatio: false,
      ...(this.prefersReducedMotion() ? { animation: false as const } : {}),
      onClick: (event, elements, chart) => {
        options.onClick?.(event, elements, chart);
        const point = elements[0];
        if (!point) return;
        this.pointSelect.emit({ index: point.index, datasetIndex: point.datasetIndex });
      },
    };
  }

  /** Destruye la instancia activa, si existe. */
  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
