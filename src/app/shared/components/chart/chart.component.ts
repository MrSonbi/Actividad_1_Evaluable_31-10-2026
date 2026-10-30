import { ChangeDetectionStrategy, Component, effect, input, output, viewChild } from '@angular/core';
import type { ElementRef, OnDestroy } from '@angular/core';
import type { ChartData, ChartOptions, ChartType } from 'chart.js';
import Chart from 'chart.js/auto';

import type { ChartPoint } from '../../models/chart.model';

/**
 * Envoltorio accesible de Chart.js.
 *
 * Crea el gráfico cuando la vista está lista, lo vuelve a crear cuando cambian
 * sus `input()` y lo destruye siempre en `ngOnDestroy` para liberar la instancia
 * de Chart.js y sus listeners.
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
  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const canvas = this.canvas();
      const type = this.type();
      const data = this.data();
      const options = this.options();

      if (!canvas) return;
      this.render(canvas.nativeElement, type, data, options);
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
   */
  private render(canvas: HTMLCanvasElement, type: ChartType, data: ChartData, options: ChartOptions): void {
    this.destroyChart();
    this.chart = new Chart(canvas, {
      type,
      data,
      options: this.withPointSelection(options),
    });
  }

  /**
   * Añade la emisión de `pointSelect` a las opciones del gráfico, respetando
   * el manejador `onClick` que haya configurado la página. Fuerza además
   * `maintainAspectRatio: false` para que el gráfico se ajuste a la altura del
   * contenedor, sea cual sea su tipo.
   *
   * @param options Opciones originales
   * @returns Opciones con el manejador de selección
   */
  private withPointSelection(options: ChartOptions): ChartOptions {
    return {
      ...options,
      maintainAspectRatio: false,
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
