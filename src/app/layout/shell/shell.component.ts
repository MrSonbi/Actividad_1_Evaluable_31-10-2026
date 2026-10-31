import { Component, computed, inject } from '@angular/core';
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
   * Cierra la sesión y vuelve a la pantalla de acceso.
   */
  async signOut(): Promise<void> {
    await this.session.signOut();
  }
}
