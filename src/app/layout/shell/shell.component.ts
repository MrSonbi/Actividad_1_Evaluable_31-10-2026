import { Component, DOCUMENT, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonRouterOutlet,
  IonSplitPane,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, cubeOutline, helpCircleOutline, homeOutline, logOutOutline, peopleOutline } from 'ionicons/icons';
import { filter, map } from 'rxjs/operators';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AuthStore } from '../../core/auth/auth.store';
import { helpQueryParams } from '../../shared/utils/help-link';

/** Estructura de la zona privada: menú lateral por rol, datos del usuario y contenido. */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonMenuToggle,
    IonRouterOutlet,
    IonButton,
    IonIcon,
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent {
  /** Sesión y rol, usados para decidir qué se muestra en el menú. */
  readonly authStore = inject(AuthStore);
  private readonly session = inject(AuthSessionService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** Parámetros del enlace a la ayuda: abren la sección de la pantalla actual. */
  readonly helpLinkParams = computed(() => helpQueryParams(this.currentUrl()));

  constructor() {
    addIcons({ homeOutline, cubeOutline, cartOutline, helpCircleOutline, logOutOutline, peopleOutline });
  }

  /**
   * Lleva el foco al contenido de la página visible. Se hace por código porque,
   * con `<base href="/">`, un enlace `#` navegaría a la raíz de la aplicación.
   *
   * @param event Clic o pulsación de teclado sobre el enlace
   */
  skipToContent(event: Event): void {
    event.preventDefault();
    const content = this.document.querySelector<HTMLElement>(
      '#main-content > .ion-page:not(.ion-page-hidden) ion-content',
    );
    content?.setAttribute('tabindex', '-1');
    content?.focus();
  }

  /**
   * Cierra la sesión y vuelve a la pantalla de acceso.
   */
  async signOut(): Promise<void> {
    await this.session.signOut();
  }
}
