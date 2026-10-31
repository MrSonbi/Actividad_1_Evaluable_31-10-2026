import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

/** Página 404 para rutas que no existen. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonButton, RouterLink],
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {}
