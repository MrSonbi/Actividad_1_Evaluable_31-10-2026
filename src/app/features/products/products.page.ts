import type { ElementRef, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { FormControl, FormGroup } from '@angular/forms';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, createOutline, saveOutline, trashOutline } from 'ionicons/icons';
import { debounceTime, Subject } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';
import { ProductsStore } from '../../core/data/products.store';
import { ProductsApi } from '../../core/data/sql/products.api';
import type { ProductInput, ProductWithCategory } from '../../core/models/product.model';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { TableColumn } from '../../shared/models/table.model';
import { uniqueFieldValidator } from '../../shared/validators/unique-field.validator';

/** Controles del formulario de producto. */
type ProductFormControls = {
  sku: FormControl<string>;
  name: FormControl<string>;
  category_id: FormControl<number | null>;
  price: FormControl<number>;
  stock: FormControl<number>;
};

/** Formulario tipado de alta y edición de productos. */
type ProductForm = FormGroup<ProductFormControls>;

/** Campos del formulario sobre los que se muestran errores. */
type ProductField = keyof ProductFormControls;

/**
 * Listado y gestión de productos.
 *
 * Cualquier usuario autenticado puede consultar el catálogo; solo los
 * administradores ven los botones de alta, edición y borrado (la base de datos
 * impone además la restricción con RLS).
 */
@Component({
  selector: 'app-products',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonModal,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonText,
    DataTableComponent,
  ],
  templateUrl: './products.page.html',
  styleUrls: ['./products.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage implements OnInit {
  /** Estado de autenticación, para mostrar u ocultar acciones de escritura. */
  readonly authStore = inject(AuthStore);

  /** Estado de los productos y las categorías. */
  readonly store = inject(ProductsStore);

  private readonly productsApi = inject(ProductsApi);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);

  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('productForm');
  private readonly searchTerms = new Subject<string>();

  /** Indica si el modal del formulario está abierto. */
  protected readonly formOpen = signal(false);

  /** Producto que se está editando; `null` al crear uno nuevo. */
  protected readonly editing = signal<ProductWithCategory | null>(null);

  /** Indica que el usuario ya intentó enviar el formulario. */
  protected readonly submitted = signal(false);

  /** Indica que la operación de guardado está en curso. */
  protected readonly saving = signal(false);

  /** Formulario activo (se recrea al abrir el modal). */
  protected readonly form = signal<ProductForm>(this.buildForm(null));

  /** Versión del formulario, para repintar cuando cambia el estado de los controles. */
  private readonly formRevision = signal(0);

  /** Columnas visibles del listado. */
  protected readonly columns: readonly TableColumn<ProductWithCategory>[] = [
    { key: 'sku', label: 'SKU', sortable: true },
    { key: 'name', label: 'Producto', sortable: true },
    { key: 'category_name', label: 'Categoría', sortable: true },
    { key: 'price', label: 'Precio', type: 'currency', sortable: true },
    { key: 'stock', label: 'Stock', type: 'number', sortable: true },
    { key: 'created_at', label: 'Alta', type: 'date', sortable: true },
  ];

  constructor() {
    addIcons({ addOutline, closeOutline, createOutline, saveOutline, trashOutline });

    this.searchTerms.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((term) => {
      void this.store.setSearch(term);
    });

    effect((onCleanup) => {
      const subscriptions = Object.values(this.form().controls).map((control) =>
        control.events.subscribe(() => {
          this.formRevision.update((version) => version + 1);
        }),
      );
      onCleanup(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
    });
  }

  /** Carga el catálogo y las categorías al entrar en la pantalla. */
  ngOnInit(): void {
    void this.store.load();
    if (this.store.categories().length === 0) {
      void this.store.loadCategories();
    }
  }

  /**
   * Abre el formulario para crear un producto.
   */
  protected openCreate(): void {
    this.editing.set(null);
    this.submitted.set(false);
    this.form.set(this.buildForm(null));
    this.formOpen.set(true);
  }

  /**
   * Abre el formulario con los datos del producto seleccionado.
   *
   * @param product Producto que se quiere editar
   */
  protected openEdit(product: ProductWithCategory): void {
    this.editing.set(product);
    this.submitted.set(false);
    this.form.set(this.buildForm(product));
    this.formOpen.set(true);
  }

  /** Cierra el modal del formulario. */
  protected closeForm(): void {
    this.formOpen.set(false);
  }

  /** Restablece el estado del formulario al terminar de cerrarse el modal. */
  protected onModalDismiss(): void {
    this.formOpen.set(false);
    this.editing.set(null);
    this.submitted.set(false);
  }

  /**
   * Aplica el texto de búsqueda con un pequeño retardo.
   *
   * @param term Texto introducido en la tabla
   */
  protected onSearch(term: string): void {
    this.searchTerms.next(term);
  }

  /**
   * Guarda el producto del formulario (alta o edición).
   */
  protected async onSubmit(): Promise<void> {
    if (this.saving()) return;

    this.submitted.set(true);
    const form = this.form();
    if (form.invalid || form.pending) {
      form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }

    this.saving.set(true);
    this.store.clearError();
    const values = form.getRawValue();
    const payload: ProductInput = {
      sku: values.sku.trim(),
      name: values.name.trim(),
      category_id: values.category_id,
      price: Math.round(values.price * 100) / 100,
      stock: Math.trunc(values.stock),
    };

    const current = this.editing();
    const saved = current ? await this.store.update(current.id, payload) : await this.store.create(payload);
    this.saving.set(false);

    if (saved) {
      const message = current ? `Producto «${payload.name}» actualizado.` : `Producto «${payload.name}» creado.`;
      this.formOpen.set(false);
      await this.toast(message, 'success');
      return;
    }

    await this.toast(this.store.error() ?? 'No se pudo guardar el producto.', 'danger');
  }

  /**
   * Pide confirmación antes de eliminar un producto.
   *
   * @param product Producto que se quiere eliminar
   */
  protected async confirmRemove(product: ProductWithCategory): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar producto',
      message: `¿Seguro que quieres eliminar «${product.name}»? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            void this.removeProduct(product);
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * Indica si un campo debe mostrar su error.
   *
   * @param field Campo del formulario
   */
  protected showError(field: ProductField): boolean {
    this.formRevision();
    const control = this.form().controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /**
   * Indica si un campo está pendiente de una validación asíncrona.
   *
   * @param field Campo del formulario
   */
  protected isPending(field: ProductField): boolean {
    this.formRevision();
    return this.form().controls[field].pending;
  }

  /**
   * Identificadores de los textos que describen un campo (`aria-describedby`).
   *
   * @param field Campo del formulario
   * @returns Identificador del error, del estado pendiente o `null`
   */
  protected describedBy(field: ProductField): string | null {
    if (this.showError(field)) return `${field}-error`;
    if (this.isPending(field)) return `${field}-status`;
    return null;
  }

  /**
   * Mensaje de error legible del campo indicado.
   *
   * @param field Campo del formulario
   */
  protected errorFor(field: ProductField): string {
    const control = this.form().controls[field];
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('min')) return 'El valor no puede ser negativo.';
    if (control.hasError('uniqueField')) return 'Ese SKU ya está en uso.';
    return 'Revisa este campo.';
  }

  /**
   * Construye el formulario tipado de producto.
   *
   * @param product Producto a editar o `null` para un alta
   */
  private buildForm(product: ProductWithCategory | null): ProductForm {
    return this.formBuilder.group({
      sku: this.formBuilder.control(product?.sku ?? '', {
        validators: [Validators.required, Validators.maxLength(40)],
        asyncValidators: [uniqueFieldValidator(this.productsApi, 'sku', product?.id)],
      }),
      name: this.formBuilder.control(product?.name ?? '', [Validators.required, Validators.maxLength(120)]),
      category_id: this.formBuilder.control<number | null>(product?.category_id ?? null),
      price: this.formBuilder.control(product?.price ?? 0, [Validators.required, Validators.min(0)]),
      stock: this.formBuilder.control(product?.stock ?? 0, [Validators.required, Validators.min(0)]),
    });
  }

  /**
   * Elimina el producto después de la confirmación y avisa del resultado.
   *
   * @param product Producto confirmado
   */
  private async removeProduct(product: ProductWithCategory): Promise<void> {
    this.store.clearError();
    const removed = await this.store.remove(product);
    const message = removed
      ? `Producto «${product.name}» eliminado.`
      : (this.store.error() ?? 'No se pudo eliminar el producto.');
    await this.toast(message, removed ? 'success' : 'danger');
  }

  /**
   * Lleva el foco al primer control inválido del formulario.
   */
  private focusFirstInvalid(): void {
    const form = this.formElement()?.nativeElement;
    const control = form?.querySelector<HTMLElement>('.ng-invalid[formControlName]');
    if (!control) return;

    const focusable = control as HTMLElement & { setFocus?: () => Promise<void> | void };
    if (typeof focusable.setFocus === 'function') {
      void focusable.setFocus();
      return;
    }

    const native = control.querySelector<HTMLElement>('input, select, textarea, button');
    (native ?? control).focus();
  }

  /**
   * Muestra un aviso emergente con el resultado de la operación.
   *
   * @param message Texto del aviso
   * @param color Color semántico de Ionic
   */
  private async toast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastController.create({ message, duration: 3500, color, position: 'bottom' });
    await toast.present();
  }
}
