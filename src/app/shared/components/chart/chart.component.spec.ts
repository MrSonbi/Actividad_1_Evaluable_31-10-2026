import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';

import { ChartComponent } from './chart.component';

interface MockChartInstance {
  config: unknown;
  destroyed: boolean;
  destroy: () => void;
}

const chartState = vi.hoisted(() => ({
  instances: [] as MockChartInstance[],
}));

vi.mock('chart.js/auto', () => {
  class MockChart {
    destroyed = false;

    constructor(
      public canvas: HTMLCanvasElement,
      public config: unknown,
    ) {
      chartState.instances.push(this);
    }

    destroy(): void {
      this.destroyed = true;
    }
  }

  return { default: MockChart };
});

describe('ChartComponent', () => {
  let fixture: ComponentFixture<ChartComponent>;

  beforeEach(async () => {
    chartState.instances.length = 0;
    await TestBed.configureTestingModule({ imports: [ChartComponent] }).compileComponents();

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

  it('vuelve a crear el gráfico al cambiar los datos y destruye el anterior', () => {
    const first = chartState.instances[0];

    fixture.componentRef.setInput('data', {
      labels: ['Marzo'],
      datasets: [{ label: 'Pedidos', data: [8] }],
    });
    fixture.detectChanges();

    expect(chartState.instances).toHaveLength(2);
    expect(first.destroyed).toBe(true);
    expect(chartState.instances[1].destroyed).toBe(false);
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
