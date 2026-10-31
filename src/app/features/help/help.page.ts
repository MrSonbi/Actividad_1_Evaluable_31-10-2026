import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonAccordion,
  IonAccordionGroup,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonMenuButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { AuthStore } from '../../core/auth/auth.store';

import { HELP_SECTIONS } from './help-content';

/** Sección que se abre si la URL no indica ninguna válida. */
const DEFAULT_SECTION = 'access';

/**
 * Página de ayuda: resumen del manual de usuario en un acordeón.
 *
 * Muestra solo las secciones que corresponden al rol y abre la indicada en el
 * parámetro `?section=`, que el menú rellena con la pantalla de origen.
 */
@Component({
  selector: 'app-help',
  standalone: true,
  imports: [
    IonAccordion,
    IonAccordionGroup,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonMenuButton,
    IonTitle,
    IonToolbar,
  ],
  templateUrl: './help.page.html',
  styleUrls: ['./help.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpPage {
  private readonly authStore = inject(AuthStore);
  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParams, { initialValue: {} });

  /** Secciones visibles para el rol actual. */
  readonly sections = computed(() => HELP_SECTIONS.filter((section) => !section.adminOnly || this.authStore.isAdmin()));

  /** Identificador de la sección abierta al entrar en la página. */
  readonly openSection = computed(() => {
    const requested: unknown = (this.queryParams() as Record<string, unknown>)['section'];
    return this.sections().some((section) => section.id === requested) ? (requested as string) : DEFAULT_SECTION;
  });
}
