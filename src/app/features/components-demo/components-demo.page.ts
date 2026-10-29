import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  IonButton,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonRow,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import type { ChartData, ChartOptions } from 'chart.js';
import { addIcons } from 'ionicons';
import { cartOutline, cashOutline, cubeOutline, peopleOutline, searchOutline } from 'ionicons/icons';

import type { ProductWithCategory } from '../../core/models/product.model';
import { ActivityFeedComponent } from '../../shared/components/activity-feed/activity-feed.component';
import { ChartComponent } from '../../shared/components/chart/chart.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import type { ActivityFeedItem } from '../../shared/models/activity-feed.model';
import type { StatTrend } from '../../shared/models/stat-card.model';
import type { TableColumn } from '../../shared/models/table.model';

interface DemoKpi {
  title: string;
  value: string;
  icon: string;
  trend: StatTrend;
  hint: string;
}

const demoActivity: readonly ActivityFeedItem[] = [
  {
    id: 'demo-1',
    action: 'create',
    entity: 'product',
    entityId: 12,
    summary: 'Producto creado: Teclado mecánico',
    actor: 'demo-admin@example.com',
    at: '2026-10-29T09:30:00.000Z',
  },
  {
    id: 'demo-2',
    action: 'update',
    entity: 'customer',
    entityId: 4,
    summary: 'Cliente actualizado: Ana Pérez',
    actor: 'demo-user@example.com',
    at: '2026-10-29T08:10:00.000Z',
  },
  {
    id: 'demo-3',
    action: 'delete',
    entity: 'order',
    entityId: 7,
    summary: 'Pedido eliminado: #7',
    actor: 'demo-admin@example.com',
    at: '2026-10-28T17:45:00.000Z',
  },
];

/**
 * Página temporal de demostración de los componentes reutilizables.
 *
 * Solo es accesible para administradores y se eliminará cuando las pantallas
 * definitivas (dashboard, productos, clientes y pedidos) usen los componentes.
 */
@Component({
  selector: 'app-components-demo',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    StatCardComponent,
    ChartComponent,
    DataTableComponent,
    EmptyStateComponent,
    ActivityFeedComponent,
  ],
  templateUrl: './components-demo.page.html',
  styleUrls: ['./components-demo.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComponentsDemoPage {
  /** Indicadores de ejemplo. */
  readonly kpis: readonly DemoKpi[] = [
    {
      title: 'Productos',
      value: '128',
      icon: 'cube-outline',
      trend: { direction: 'up', label: '+6 este mes' },
      hint: '4 con stock bajo',
    },
    {
      title: 'Clientes',
      value: '64',
      icon: 'people-outline',
      trend: { direction: 'up', label: '+9 este mes' },
      hint: 'Alta en los últimos 30 días',
    },
    {
      title: 'Pedidos',
      value: '312',
      icon: 'cart-outline',
      trend: { direction: 'flat', label: 'Sin cambios' },
      hint: '241 entregados',
    },
    {
      title: 'Ingresos',
      value: '18.940 €',
      icon: 'cash-outline',
      trend: { direction: 'down', label: '-3 % este mes' },
      hint: 'Facturación acumulada',
    },
  ];

  /** Columnas de la tabla de ejemplo. */
  readonly productColumns: readonly TableColumn<ProductWithCategory>[] = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Producto', sortable: true },
    { key: 'category_name', label: 'Categoría', sortable: true },
    { key: 'price', label: 'Precio', type: 'currency', sortable: true },
    { key: 'stock', label: 'Stock', type: 'number', sortable: true },
  ];

  /** Filas de la tabla de ejemplo. */
  readonly products: readonly ProductWithCategory[] = [
    {
      id: 1,
      sku: 'TEC-001',
      name: 'Teclado mecánico',
      category_id: 1,
      category_name: 'Periféricos',
      price: 79.9,
      stock: 12,
      created_at: '2026-09-12T10:00:00.000Z',
    },
    {
      id: 2,
      sku: 'MON-002',
      name: 'Monitor 27"',
      category_id: 2,
      category_name: 'Pantallas',
      price: 249,
      stock: 4,
      created_at: '2026-09-20T10:00:00.000Z',
    },
    {
      id: 3,
      sku: 'RAT-003',
      name: 'Ratón inalámbrico',
      category_id: 1,
      category_name: 'Periféricos',
      price: 34.5,
      stock: 0,
      created_at: '2026-10-01T10:00:00.000Z',
    },
    {
      id: 4,
      sku: 'CAJ-004',
      name: 'Caja USB-C',
      category_id: 3,
      category_name: 'Accesorios',
      price: 59,
      stock: 21,
      created_at: '2026-10-03T10:00:00.000Z',
    },
    {
      id: 5,
      sku: 'SIL-005',
      name: 'Silla ergonómica',
      category_id: 4,
      category_name: 'Mobiliario',
      price: 189,
      stock: 7,
      created_at: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 6,
      sku: 'LAM-006',
      name: 'Lámpara de escritorio',
      category_id: 4,
      category_name: 'Mobiliario',
      price: 42,
      stock: 15,
      created_at: '2026-10-18T10:00:00.000Z',
    },
  ];

  /** Serie de ingresos mensuales de ejemplo. */
  readonly revenueData: ChartData = {
    labels: ['May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Ingresos (€)',
        data: [12400, 13800, 15100, 14600, 17200, 18940],
        borderColor: '#0054e9',
        backgroundColor: 'rgba(0, 84, 233, 0.15)',
        fill: true,
        tension: 0.35,
      },
    ],
  };

  /** Opciones del gráfico de líneas. */
  readonly revenueOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  /** Resumen textual del gráfico para lectores de pantalla. */
  readonly revenueSummary: readonly string[] = [
    'Mayo: 12.400 €',
    'Junio: 13.800 €',
    'Julio: 15.100 €',
    'Agosto: 14.600 €',
    'Septiembre: 17.200 €',
    'Octubre: 18.940 €',
  ];

  /** Entradas del feed de actividad de ejemplo. */
  readonly feedItems = signal<readonly ActivityFeedItem[]>(demoActivity);

  /** Último evento emitido por los componentes, para mostrarlo en pantalla. */
  readonly lastAction = signal('');

  constructor() {
    addIcons({ cartOutline, cashOutline, cubeOutline, peopleOutline, searchOutline });
  }

  /**
   * Registra la selección de una fila.
   *
   * @param product Fila seleccionada
   */
  onRowSelect(product: ProductWithCategory): void {
    this.lastAction.set(`Detalle solicitado: ${product.name}`);
  }

  /**
   * Registra la petición de edición de una fila.
   *
   * @param product Fila que se quiere editar
   */
  onEdit(product: ProductWithCategory): void {
    this.lastAction.set(`Edición solicitada: ${product.name}`);
  }

  /**
   * Registra la petición de borrado de una fila.
   *
   * @param product Fila que se quiere eliminar
   */
  onRemove(product: ProductWithCategory): void {
    this.lastAction.set(`Borrado solicitado: ${product.name}`);
  }

  /**
   * Registra la exportación solicitada desde la tabla.
   *
   * @param format Formato de exportación
   */
  onExport(format: 'csv' | 'pdf'): void {
    this.lastAction.set(`Exportación ${format.toUpperCase()} solicitada (se implementa en F6)`);
  }

  /** Vacía el feed para comprobar el estado sin actividad. */
  clearFeed(): void {
    this.feedItems.set([]);
    this.lastAction.set('Feed vaciado: se muestra el estado vacío');
  }

  /** Restaura las entradas de ejemplo del feed. */
  restoreFeed(): void {
    this.feedItems.set(demoActivity);
    this.lastAction.set('Feed restaurado con datos de ejemplo');
  }

  /** Acción de ejemplo del componente de estado vacío. */
  onEmptyAction(): void {
    this.lastAction.set('Acción del estado vacío pulsada');
  }
}
