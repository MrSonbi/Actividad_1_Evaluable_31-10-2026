import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
import { cubeOutline, gridOutline, homeOutline, logOutOutline } from 'ionicons/icons';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AuthStore } from '../../core/auth/auth.store';

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
  readonly authStore = inject(AuthStore);
  private readonly session = inject(AuthSessionService);

  constructor() {
    addIcons({ homeOutline, cubeOutline, gridOutline, logOutOutline });
  }

  /**
   * Cierra la sesión y vuelve a la pantalla de acceso.
   */
  async signOut(): Promise<void> {
    await this.session.signOut();
  }
}
