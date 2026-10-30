import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonSpinner, IonText, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import type { ChartData, ChartOptions } from 'chart.js';
import { addIcons } from 'ionicons';
import { alertCircleOutline, cartOutline, cashOutline, cubeOutline, peopleOutline } from 'ionicons/icons';

import { DASHBOARD_MONTHS, DashboardStore } from '../../core/data/dashboard.store';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

import { monthlyRevenueSeries, productsByCategorySeries } from './dashboard-charts';
import type { ChartSeries } from './dashboard-charts';

/** Indicador que se pinta con `app-stat-card`. */
interface KpiCard {
  /** Título del indicador. */
  title: string;
  /** Valor ya formateado. */
  value: string;
  /** Icono de Ionicons. */
  icon: string;
  /** Nota aclaratoria. */
  hint: string;
}

/**
 * Dashboard de administración.
 *
 * Muestra los cinco indicadores principales y dos gráficos: los ingresos de los
 * últimos doce meses y los productos por categoría. Los datos se cargan en
 * paralelo desde {@link DashboardStore}; mientras llegan se muestra un spinner
 * y, si la carga falla, un aviso con el botón «Reintentar».
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonSpinner,
    IonText,
    IonButton,
    StatCardComponent,
    ChartComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  /** Estado del dashboard (KPIs, series, actividad, carga y error). */
  readonly store = inject(DashboardStore);

  /** Meses que abarca la ventana temporal del dashboard. */
  protected readonly months = DASHBOARD_MONTHS;

  /** Etiqueta accesible del gráfico de ingresos. */
  protected readonly revenueAriaLabel = `Ingresos por mes de los últimos ${DASHBOARD_MONTHS} meses`;

  /** Etiqueta accesible del gráfico de productos por categoría. */
  protected readonly categoryAriaLabel = 'Productos por categoría';

  private readonly integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  private readonly currencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  /** Tarjetas de los cinco indicadores, ya formateadas. */
  protected readonly kpiCards = computed<readonly KpiCard[]>(() => {
    const kpis = this.store.kpis();

    return [
      {
        title: 'Productos',
        value: this.integerFormat.format(kpis.total_products),
        icon: 'cube-outline',
        hint: 'Referencias en catálogo',
      },
      {
        title: 'Clientes',
        value: this.integerFormat.format(kpis.total_customers),
        icon: 'people-outline',
        hint: 'Clientes registrados',
      },
      {
        title: 'Pedidos',
        value: this.integerFormat.format(kpis.total_orders),
        icon: 'cart-outline',
        hint: 'Pedidos históricos',
      },
      {
        title: 'Ingresos',
        value: this.currencyFormat.format(kpis.total_revenue),
        icon: 'cash-outline',
        hint: 'Sin contar los cancelados',
      },
      {
        title: 'Productos con poco stock',
        value: this.integerFormat.format(kpis.low_stock_products),
        icon: 'alert-circle-outline',
        hint: 'Menos de 10 unidades',
      },
    ];
  });

  /** Serie de ingresos mensuales de la ventana temporal del dashboard. */
  protected readonly revenueSeries = computed<ChartSeries>(() =>
    monthlyRevenueSeries(this.store.orders(), DASHBOARD_MONTHS),
  );

  /** Serie de productos por categoría. */
  protected readonly categorySeries = computed<ChartSeries>(() => productsByCategorySeries(this.store.byCategory()));

  /** Datos del gráfico de líneas de ingresos. */
  protected readonly revenueData = computed<ChartData<'line'>>(() => ({
    labels: this.revenueSeries().labels,
    datasets: [
      {
        label: 'Ingresos',
        data: this.revenueSeries().values,
        borderColor: '#0054e9',
        backgroundColor: 'rgba(0, 84, 233, 0.15)',
        pointBackgroundColor: '#0054e9',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  }));

  /** Datos del gráfico de barras de productos por categoría. */
  protected readonly categoryData = computed<ChartData<'bar'>>(() => ({
    labels: this.categorySeries().labels,
    datasets: [
      {
        label: 'Productos',
        data: this.categorySeries().values,
        backgroundColor: 'rgba(0, 84, 233, 0.65)',
        borderColor: '#0054e9',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }));

  /** Opciones del gráfico de ingresos. */
  protected readonly revenueOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value) => `${value} €` },
      },
    },
  };

  /** Opciones del gráfico de productos por categoría. */
  protected readonly categoryOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
      },
    },
  };

  constructor() {
    addIcons({ cubeOutline, peopleOutline, cartOutline, cashOutline, alertCircleOutline });
  }

  /** Carga los datos del dashboard al entrar en la pantalla. */
  ngOnInit(): void {
    void this.store.load();
  }

  /** Vuelve a intentar la carga tras un error. */
  protected retry(): void {
    void this.store.load();
  }
}
