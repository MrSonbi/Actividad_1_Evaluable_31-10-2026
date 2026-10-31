import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

/** Página que se muestra al intentar entrar en una sección sin permiso. */
@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, RouterLink],
  templateUrl: './forbidden.page.html',
})
export class ForbiddenPage {}
