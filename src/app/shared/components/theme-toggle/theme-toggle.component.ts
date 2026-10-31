import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ThemeService } from '../../utils/theme.service';

/**
 * Botón de la cabecera que activa o desactiva el modo oscuro.
 *
 * Es un `<button>` nativo porque `ion-button` copia `aria-pressed` a su botón
 * interno solo al cargarse, y aquí ese estado cambia con cada pulsación.
 */
@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeToggleComponent {
  /** Estado y acción del tema. */
  readonly theme = inject(ThemeService);
}
