import type { ElementRef, OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, effect, inject, signal, viewChild } from '@angular/core';
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
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, saveOutline, trashOutline } from 'ionicons/icons';

import { AuthStore } from '../../core/auth/auth.store';
import { CustomersStore } from '../../core/data/customers.store';
import { CustomersApi } from '../../core/data/sql/customers.api';
import type { Customer, CustomerInput } from '../../core/models/customer.model';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import type { TableColumn } from '../../shared/models/table.model';
import { ReportService, reportCount } from '../../shared/utils/report/report.service';
import type { ReportFormat } from '../../shared/utils/report/report.service';
import { uniqueFieldValidator } from '../../shared/validators/unique-field.validator';

/** Controles del formulario de cliente. */
type CustomerFormControls = {
  full_name: FormControl<string>;
  email: FormControl<string>;
  phone: FormControl<string | null>;
  city: FormControl<string | null>;
};

/** Formulario tipado de alta y edición de clientes. */
type CustomerForm = FormGroup<CustomerFormControls>;

/** Campos del formulario sobre los que se muestran errores. */
type CustomerField = keyof CustomerFormControls;

/**
 * Listado y gestión de clientes.
 *
 * Ambos roles pueden crear y editar clientes; solo los administradores ven el
 * botón de borrado (la base de datos impone además la restricción con RLS).
 */
@Component({
  selector: 'app-customers',
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
    IonSpinner,
    IonText,
    DataTableComponent,
  ],
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomersPage implements OnInit {
  /** Estado de autenticación, para mostrar u ocultar el borrado. */
  readonly authStore = inject(AuthStore);

  /** Estado de los clientes. */
  readonly store = inject(CustomersStore);

  private readonly customersApi = inject(CustomersApi);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly alertController = inject(AlertController);
  private readonly toastController = inject(ToastController);
  private readonly reports = inject(ReportService);

  private readonly formElement = viewChild<ElementRef<HTMLFormElement>>('customerForm');

  /** Indica si el modal del formulario está abierto. */
  protected readonly formOpen = signal(false);

  /** Cliente que se está editando; `null` al crear uno nuevo. */
  protected readonly editing = signal<Customer | null>(null);

  /** Indica que el usuario ya intentó enviar el formulario. */
  protected readonly submitted = signal(false);

  /** Indica que la operación de guardado está en curso. */
  protected readonly saving = signal(false);

  /** Formulario activo (se recrea al abrir el modal). */
  protected readonly form = signal<CustomerForm>(this.buildForm(null));

  /** Versión del formulario, para repintar cuando cambia el estado de los controles. */
  private readonly formRevision = signal(0);

  /** Columnas visibles del listado. */
  protected readonly columns: readonly TableColumn<Customer>[] = [
    { key: 'full_name', label: 'Cliente', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'phone', label: 'Teléfono', sortable: true },
    { key: 'city', label: 'Ciudad', sortable: true },
    { key: 'created_at', label: 'Alta', type: 'date', sortable: true },
  ];

  constructor() {
    addIcons({ addOutline, closeOutline, saveOutline, trashOutline });

    effect((onCleanup) => {
      const subscriptions = Object.values(this.form().controls).map((control) =>
        control.events.subscribe(() => {
          this.formRevision.update((version) => version + 1);
        }),
      );
      onCleanup(() => subscriptions.forEach((subscription) => subscription.unsubscribe()));
    });
  }

  /** Carga los clientes al entrar en la pantalla. */
  ngOnInit(): void {
    void this.store.load();
  }

  /** Abre el formulario para crear un cliente. */
  protected openCreate(): void {
    this.editing.set(null);
    this.submitted.set(false);
    this.form.set(this.buildForm(null));
    this.formOpen.set(true);
  }

  /**
   * Abre el formulario con los datos del cliente seleccionado.
   *
   * @param customer Cliente que se quiere editar
   */
  protected openEdit(customer: Customer): void {
    this.editing.set(customer);
    this.submitted.set(false);
    this.form.set(this.buildForm(customer));
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

  /** Guarda el cliente del formulario (alta o edición). */
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
    const payload: CustomerInput = {
      full_name: values.full_name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: this.emptyToNull(values.phone),
      city: this.emptyToNull(values.city),
    };

    const current = this.editing();
    const saved = current ? await this.store.update(current.id, payload) : await this.store.create(payload);
    this.saving.set(false);

    if (saved) {
      const message = current
        ? `Cliente «${payload.full_name}» actualizado.`
        : `Cliente «${payload.full_name}» creado.`;
      this.formOpen.set(false);
      await this.toast(message, 'success');
      return;
    }

    await this.toast(this.store.error() ?? 'No se pudo guardar el cliente.', 'danger');
  }

  /**
   * Pide confirmación antes de eliminar un cliente.
   *
   * @param customer Cliente que se quiere eliminar
   */
  protected async confirmRemove(customer: Customer): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Eliminar cliente',
      message: `¿Seguro que quieres eliminar «${customer.full_name}»? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            void this.removeCustomer(customer);
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
  protected showError(field: CustomerField): boolean {
    this.formRevision();
    const control = this.form().controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  /**
   * Indica si un campo está pendiente de una validación asíncrona.
   *
   * @param field Campo del formulario
   */
  protected isPending(field: CustomerField): boolean {
    this.formRevision();
    return this.form().controls[field].pending;
  }

  /**
   * Identificadores de los textos que describen un campo (`aria-describedby`).
   *
   * @param field Campo del formulario
   * @returns Identificador del error, del estado pendiente o `null`
   */
  protected describedBy(field: CustomerField): string | null {
    if (this.showError(field)) return `${field}-error`;
    if (this.isPending(field)) return `${field}-status`;
    return null;
  }

  /**
   * Mensaje de error legible del campo indicado.
   *
   * @param field Campo del formulario
   */
  protected errorFor(field: CustomerField): string {
    const control = this.form().controls[field];
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('email')) return 'Introduce un correo electrónico válido.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('uniqueField')) return 'Ya existe un cliente con ese email.';
    return 'Revisa este campo.';
  }

  /**
   * Construye el formulario tipado de cliente.
   *
   * @param customer Cliente a editar o `null` para un alta
   */
  private buildForm(customer: Customer | null): CustomerForm {
    return this.formBuilder.group({
      full_name: this.formBuilder.control(customer?.full_name ?? '', [Validators.required, Validators.maxLength(120)]),
      email: this.formBuilder.control(customer?.email ?? '', {
        validators: [Validators.required, Validators.email, Validators.maxLength(160)],
        asyncValidators: [uniqueFieldValidator(this.customersApi, 'email', customer?.id)],
      }),
      phone: this.formBuilder.control<string | null>(customer?.phone ?? null, [Validators.maxLength(30)]),
      city: this.formBuilder.control<string | null>(customer?.city ?? null, [Validators.maxLength(80)]),
    });
  }

  /**
   * Elimina el cliente después de la confirmación y avisa del resultado.
   *
   * @param customer Cliente confirmado
   */
  private async removeCustomer(customer: Customer): Promise<void> {
    this.store.clearError();
    const removed = await this.store.remove(customer);
    const message = removed
      ? `Cliente «${customer.full_name}» eliminado.`
      : (this.store.error() ?? 'No se pudo eliminar el cliente.');
    await this.toast(message, removed ? 'success' : 'danger');
  }

  /**
   * Convierte un texto vacío en `null` para los campos opcionales.
   *
   * @param value Valor original
   */
  private emptyToNull(value: string | null): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 ? trimmed : null;
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
   * Exporta las filas que muestra la tabla, con la búsqueda y el orden aplicados.
   *
   * @param format Formato solicitado
   * @param rows Filas filtradas y ordenadas de la tabla
   */
  protected async onExport(format: ReportFormat, rows: readonly Customer[]): Promise<void> {
    try {
      await this.reports.exportTable(format, {
        title: 'Directorio de clientes',
        subtitle: reportCount(rows.length),
        columns: this.columns,
        rows,
        filename: 'clientes',
      });
    } catch {
      await this.toast('No se pudo generar el informe.', 'danger');
    }
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
