import type { OnDestroy, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { ViewWillEnter } from '@ionic/angular/standalone';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCol,
  IonGrid,
  IonMenuButton,
  IonRow,
  IonContent,
  IonHeader,
  IonIcon,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import type { ChartData, ChartOptions } from 'chart.js';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cartOutline,
  cashOutline,
  cubeOutline,
  notificationsOutline,
  peopleOutline,
  receiptOutline,
} from 'ionicons/icons';
import type { Subscription } from 'rxjs';

import { DashboardStore } from '../../core/data/dashboard.store';
import type { OrderStatus } from '../../core/models/order.model';
import { ORDER_STATUS_LABELS } from '../../core/models/order.model';
import { ActivityFeedComponent } from '../../shared/components/activity-feed/activity-feed.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { ThemeToggleComponent } from '../../shared/components/theme-toggle/theme-toggle.component';
import type { TableColumn } from '../../shared/models/table.model';
import { ChartThemeService } from '../../shared/utils/chart-theme.service';
import { ReportService } from '../../shared/utils/report/report.service';
import type { ReportFormat } from '../../shared/utils/report/report.service';
import { OrderStatusFilterComponent } from '../orders/order-status-filter/order-status-filter.component';

import {
  DASHBOARD_PERIODS,
  filterOrders,
  monthlyRevenueSeries,
  ordersByStatusSeries,
  periodTotals,
  productsByCategorySeries,
} from './dashboard-charts';
import type { ChartSeries, DashboardPeriod } from './dashboard-charts';

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

/** Fila del resumen exportable del dashboard. */
interface SummaryRow {
  /** Bloque al que pertenece el dato. */
  section: string;
  /** Nombre del dato. */
  indicator: string;
  /** Valor ya formateado. */
  value: string;
}

/** Columnas del resumen exportable. */
const SUMMARY_COLUMNS: readonly TableColumn<SummaryRow>[] = [
  { key: 'section', label: 'Sección' },
  { key: 'indicator', label: 'Indicador' },
  { key: 'value', label: 'Valor' },
];

/**
 * Dashboard de administración.
 *
 * Muestra los cinco indicadores principales, los indicadores y gráficos filtrables
 * por periodo y estado, y el feed de actividad en vivo. Los datos se cargan en
 * paralelo desde {@link DashboardStore}; mientras llegan se muestra un spinner
 * y, si la carga falla, un aviso con el botón «Reintentar».
 *
 * Los filtros son señales que recalculan los `computed` sobre los pedidos ya
 * cargados, sin volver a pedir datos.
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
    IonButtons,
    IonCol,
    IonGrid,
    IonMenuButton,
    IonRow,
    IonBadge,
    IonIcon,
    StatCardComponent,
    ChartComponent,
    EmptyStateComponent,
    ActivityFeedComponent,
    OrderStatusFilterComponent,
    ThemeToggleComponent,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit, OnDestroy, ViewWillEnter {
  /** Estado del dashboard (KPIs, series, actividad, carga y error). */
  readonly store = inject(DashboardStore);

  private readonly reports = inject(ReportService);
  private readonly theme = inject(ChartThemeService);
  private readonly toastController = inject(ToastController);

  /** Periodos disponibles en el filtro. */
  protected readonly periods = DASHBOARD_PERIODS;

  /** Periodo seleccionado, en meses. */
  protected readonly period = signal<DashboardPeriod>(12);

  /** Estado seleccionado; `null` representa «todos los estados». */
  protected readonly status = signal<OrderStatus | null>(null);

  /** Pedidos ya cargados que cumplen los filtros. */
  protected readonly filteredOrders = computed(() =>
    filterOrders(this.store.orders(), { months: this.period(), status: this.status() }),
  );

  /** Etiqueta accesible del gráfico de ingresos. */
  protected readonly revenueAriaLabel = computed(() => `Ingresos por mes de los últimos ${this.period()} meses`);

  /** Etiqueta accesible del gráfico de pedidos por estado. */
  protected readonly statusAriaLabel = computed(() => `Pedidos por estado de los últimos ${this.period()} meses`);

  /** Etiqueta accesible del gráfico de productos por categoría. */
  protected readonly categoryAriaLabel = 'Productos por categoría';

  private readonly integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
  private readonly currencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

  private liveSubscription: Subscription | null = null;

  /** Indica si Ionic ya ha mostrado la página; la primera entrada la cubre `load()`. */
  private hasEntered = false;

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

  /** Tarjetas de los indicadores que dependen de los filtros. */
  protected readonly periodCards = computed<readonly KpiCard[]>(() => {
    const totals = periodTotals(this.filteredOrders());

    return [
      {
        title: 'Pedidos del periodo',
        value: this.integerFormat.format(totals.orders),
        icon: 'cart-outline',
        hint: 'Según los filtros',
      },
      {
        title: 'Ingresos del periodo',
        value: this.currencyFormat.format(totals.revenue),
        icon: 'cash-outline',
        hint: 'Sin contar los cancelados',
      },
      {
        title: 'Importe medio',
        value: this.currencyFormat.format(totals.averageTicket),
        icon: 'receipt-outline',
        hint: 'Por pedido no cancelado',
      },
    ];
  });

  /** Resultado de los filtros, anunciado a lectores de pantalla. */
  protected readonly filterSummary = computed(() => {
    const count = this.filteredOrders().length;
    const status = this.status();
    const orders = `${this.integerFormat.format(count)} ${count === 1 ? 'pedido' : 'pedidos'}`;
    const suffix = status === null ? '' : `, estado ${ORDER_STATUS_LABELS[status].toLowerCase()}`;
    return `${orders} en los últimos ${this.period()} meses${suffix}.`;
  });

  /** Texto accesible del contador de eventos nuevos. */
  protected readonly newEventsLabel = computed(() => {
    const count = this.store.newEvents();
    if (count === 0) return 'Sin eventos nuevos';
    return `${count} ${count === 1 ? 'evento nuevo' : 'eventos nuevos'}. Marcar como vistos`;
  });

  /** Serie de ingresos mensuales del periodo seleccionado. */
  protected readonly revenueSeries = computed<ChartSeries>(() =>
    monthlyRevenueSeries(this.filteredOrders(), this.period()),
  );

  /** Serie de pedidos por estado del periodo seleccionado. */
  protected readonly statusSeries = computed<ChartSeries>(() => ordersByStatusSeries(this.filteredOrders()));

  /** Serie de productos por categoría. */
  protected readonly categorySeries = computed<ChartSeries>(() => productsByCategorySeries(this.store.byCategory()));

  /** Datos del gráfico de líneas de ingresos. */
  protected readonly revenueData = computed<ChartData<'line'>>(() => {
    const { primary } = this.theme.colors();

    return {
      labels: this.revenueSeries().labels,
      datasets: [
        {
          label: 'Ingresos',
          data: this.revenueSeries().values,
          borderColor: primary,
          backgroundColor: `${primary}26`,
          pointBackgroundColor: primary,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    };
  });

  /** Datos del gráfico de rosquilla, con un color fijo por estado. */
  protected readonly statusData = computed<ChartData<'doughnut'>>(() => ({
    labels: this.statusSeries().labels,
    datasets: [
      {
        label: 'Pedidos',
        data: this.statusSeries().values,
        backgroundColor: [...this.theme.colors().status],
        borderColor: this.theme.colors().surface,
        borderWidth: 2,
      },
    ],
  }));

  /** Datos del gráfico de barras de productos por categoría. */
  protected readonly categoryData = computed<ChartData<'bar'>>(() => {
    const { primary } = this.theme.colors();

    return {
      labels: this.categorySeries().labels,
      datasets: [
        {
          label: 'Productos',
          data: this.categorySeries().values,
          backgroundColor: `${primary}a6`,
          borderColor: primary,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  });

  /** Datos que se exportan: lo que muestran las tarjetas y los gráficos. */
  private readonly summaryRows = computed<readonly SummaryRow[]>(() => {
    const revenue = this.revenueSeries();
    const status = this.statusSeries();
    const category = this.categorySeries();

    return [
      ...this.kpiCards().map((card) => ({
        section: 'Indicadores generales',
        indicator: card.title,
        value: card.value,
      })),
      ...this.periodCards().map((card) => ({ section: 'Periodo', indicator: card.title, value: card.value })),
      ...revenue.labels.map((label, index) => ({
        section: 'Ingresos por mes',
        indicator: label,
        value: this.currencyFormat.format(revenue.values[index]),
      })),
      ...status.labels.map((label, index) => ({
        section: 'Pedidos por estado',
        indicator: label,
        value: this.integerFormat.format(status.values[index]),
      })),
      ...category.labels.map((label, index) => ({
        section: 'Productos por categoría',
        indicator: label,
        value: this.integerFormat.format(category.values[index]),
      })),
    ];
  });

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

  /** Opciones del gráfico de pedidos por estado. */
  protected readonly statusOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
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
    addIcons({
      cubeOutline,
      peopleOutline,
      cartOutline,
      cashOutline,
      alertCircleOutline,
      receiptOutline,
      notificationsOutline,
    });
  }

  /** Abre la actividad en vivo y carga los datos al entrar en la pantalla. */
  ngOnInit(): void {
    this.liveSubscription = this.store.connectActivity();
    void this.store.load();
  }

  /**
   * Recarga en silencio al volver a la pantalla: Ionic conserva la página en
   * memoria y no repite `ngOnInit`. Los filtros se mantienen porque viven en la
   * propia página.
   */
  ionViewWillEnter(): void {
    if (this.hasEntered) {
      void this.store.refresh();
    }
    this.hasEntered = true;
  }

  /** Cancela la suscripción a la actividad en vivo. */
  ngOnDestroy(): void {
    this.liveSubscription?.unsubscribe();
  }

  /**
   * Exporta el resumen del dashboard con los filtros aplicados.
   *
   * @param format Formato solicitado
   */
  protected async exportSummary(format: ReportFormat): Promise<void> {
    try {
      await this.reports.exportTable(format, {
        title: 'Resumen del dashboard',
        subtitle: this.filterSummary(),
        columns: SUMMARY_COLUMNS,
        rows: this.summaryRows(),
        filename: 'dashboard',
      });
    } catch {
      const toast = await this.toastController.create({
        message: 'No se pudo generar el informe.',
        duration: 3500,
        color: 'danger',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  /** Vuelve a intentar la carga tras un error. */
  protected retry(): void {
    void this.store.load();
  }

  /**
   * Actualiza el periodo cuando el usuario cambia la selección.
   *
   * @param event Evento `change` del elemento `select`
   */
  protected onPeriodChange(event: Event): void {
    const selected = (event.target as HTMLSelectElement).value;
    this.period.set(DASHBOARD_PERIODS.find((months) => String(months) === selected) ?? 12);
  }
}
