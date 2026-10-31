import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { ChartData } from 'chart.js';

import { ChartThemeService } from '../../utils/chart-theme.service';
import type { ChartThemeColors } from '../../utils/chart-theme.service';

import { ChartComponent } from './chart.component';

interface MockChartInstance {
  config: unknown;
  destroyed: boolean;
  destroy: () => void;
  data: ChartData;
  options: unknown;
  updates: unknown[];
}

const chartState = vi.hoisted(() => ({
  instances: [] as MockChartInstance[],
}));

vi.mock('chart.js/auto', () => {
  class MockChart {
    static defaults: Record<string, unknown> = {};

    destroyed = false;
    data: ChartData;
    options: unknown;
    updates: unknown[] = [];

    constructor(
      public canvas: HTMLCanvasElement,
      public config: { data: ChartData; options: unknown },
    ) {
      this.data = config.data;
      this.options = config.options;
      chartState.instances.push(this);
    }

    update(mode?: unknown): void {
      this.updates.push(mode);
    }

    destroy(): void {
      this.destroyed = true;
    }
  }

  return { default: MockChart };
});

describe('ChartComponent', () => {
  let fixture: ComponentFixture<ChartComponent>;
  let colors: WritableSignal<ChartThemeColors>;

  const LIGHT: ChartThemeColors = {
    text: '#111111',
    grid: '#222222',
    surface: '#ffffff',
    primary: '#0054e9',
    status: [],
  };

  beforeEach(async () => {
    chartState.instances.length = 0;
    colors = signal(LIGHT);
    await TestBed.configureTestingModule({
      imports: [ChartComponent],
      providers: [{ provide: ChartThemeService, useValue: { colors } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartComponent);
    fixture.componentRef.setInput('type', 'bar');
    fixture.componentRef.setInput('data', {
      labels: ['Enero', 'Febrero'],
      datasets: [{ label: 'Pedidos', data: [2, 4] }],
    });
    fixture.componentRef.setInput('ariaLabel', 'Pedidos por mes');
    fixture.detectChanges();
  });

  it('crea el gráfico con el tipo y los datos recibidos', () => {
    expect(chartState.instances).toHaveLength(1);
    const config = chartState.instances[0].config as {
      type: string;
      data: { labels?: string[] };
    };
    expect(config.type).toBe('bar');
    expect(config.data.labels).toEqual(['Enero', 'Febrero']);
  });

  it('destruye el gráfico en ngOnDestroy', () => {
    const instance = chartState.instances[0];

    fixture.destroy();

    expect(instance.destroyed).toBe(true);
  });

  it('actualiza la misma instancia al cambiar los datos, sin destruirla', () => {
    const chart = chartState.instances[0];
    const dataset = chart.data.datasets[0];

    fixture.componentRef.setInput('data', {
      labels: ['Marzo'],
      datasets: [{ label: 'Pedidos', data: [8] }],
    });
    fixture.detectChanges();

    expect(chartState.instances).toHaveLength(1);
    expect(chart.destroyed).toBe(false);
    expect(chart.updates).toEqual([undefined]);
    expect(chart.data.labels).toEqual(['Marzo']);
    expect(chart.data.datasets[0].data).toEqual([8]);
    expect(chart.data.datasets[0]).toBe(dataset);
  });

  it('añade y quita series al actualizar', () => {
    const chart = chartState.instances[0];

    fixture.componentRef.setInput('data', {
      labels: ['Marzo'],
      datasets: [
        { label: 'Pedidos', data: [8] },
        { label: 'Devoluciones', data: [1] },
      ],
    });
    fixture.detectChanges();
    expect(chart.data.datasets).toHaveLength(2);

    fixture.componentRef.setInput('data', { labels: [], datasets: [] });
    fixture.detectChanges();
    expect(chart.data.datasets).toHaveLength(0);
  });

  it('actualiza sin animación si el usuario pide reducir el movimiento', () => {
    const chart = chartState.instances[0];
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);

    fixture.componentRef.setInput('data', { labels: ['Marzo'], datasets: [{ label: 'Pedidos', data: [8] }] });
    fixture.detectChanges();

    expect(chart.updates).toEqual(['none']);
    expect((chart.options as { animation: unknown }).animation).toBe(false);
    vi.restoreAllMocks();
  });

  it('vuelve a crear el gráfico si cambia el tipo', () => {
    const first = chartState.instances[0];

    fixture.componentRef.setInput('type', 'line');
    fixture.detectChanges();

    expect(chartState.instances).toHaveLength(2);
    expect(first.destroyed).toBe(true);
  });

  it('vuelve a crear el gráfico con los colores nuevos si cambia el tema', async () => {
    const first = chartState.instances[0];
    const { default: Chart } = await import('chart.js/auto');

    colors.set({ ...LIGHT, text: '#eeeeee', grid: '#333333' });
    fixture.detectChanges();

    expect(first.destroyed).toBe(true);
    expect(chartState.instances).toHaveLength(2);
    expect(Chart.defaults.color).toBe('#eeeeee');
    expect(Chart.defaults.borderColor).toBe('#333333');
  });

  it('emite el punto seleccionado al hacer clic', () => {
    const pointSpy = vi.fn();
    fixture.componentInstance.pointSelect.subscribe(pointSpy);

    const config = chartState.instances[0].config as {
      options: { onClick: (event: unknown, elements: unknown[], chart: unknown) => void };
    };
    config.options.onClick({}, [{ index: 1, datasetIndex: 0 }], chartState.instances[0]);

    expect(pointSpy).toHaveBeenCalledWith({ index: 1, datasetIndex: 0 });
  });

  it('aplica la altura al contenedor del lienzo y no al lienzo', () => {
    fixture.componentRef.setInput('height', '18rem');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const container = element.querySelector<HTMLElement>('.chart__canvas');
    expect(container?.style.height).toBe('18rem');
    expect(container?.querySelector('canvas')?.style.height).toBe('');
  });

  it('mantiene maintainAspectRatio en false aunque las opciones pidan lo contrario', () => {
    fixture.componentRef.setInput('options', { maintainAspectRatio: true });
    fixture.detectChanges();

    const config = chartState.instances[chartState.instances.length - 1].config as {
      options: { maintainAspectRatio: boolean };
    };
    expect(config.options.maintainAspectRatio).toBe(false);
  });

  it('expone el lienzo como imagen accesible con resumen textual', () => {
    fixture.componentRef.setInput('summary', ['Enero: 2 pedidos', 'Febrero: 4 pedidos']);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const canvas = element.querySelector('canvas');
    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toBe('Pedidos por mes');
    expect(element.querySelector('figcaption')?.textContent).toContain('Enero: 2 pedidos');
  });
});
