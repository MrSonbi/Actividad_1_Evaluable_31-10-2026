import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input, output } from '@angular/core';

/**
 * Estado vacío reutilizable, con acción opcional.
 *
 * Componente agnóstico: solo recibe datos por `input()` y emite la acción
 * mediante `output()`. Si se muestra un icono, la página debe registrarlo con
 * `addIcons`.
 *
 * `ion-icon` se usa como elemento personalizado (registrado por Ionic en el
 * shell) para no arrastrar dependencias de Ionic al componente.
 */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  /** Título del estado vacío. */
  readonly title = input.required<string>();

  /** Mensaje explicativo opcional. */
  readonly message = input('');

  /** Nombre del icono de Ionicons que ilustra el estado. */
  readonly icon = input('');

  /** Texto del botón de acción. Si está vacío, no se muestra el botón. */
  readonly actionLabel = input('');

  /** Emite cuando el usuario pulsa la acción. */
  readonly action = output<void>();
}
