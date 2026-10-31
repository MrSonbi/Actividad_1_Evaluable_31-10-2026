import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { AuthStore } from '../../../core/auth/auth.store';

/** Pantalla de acceso con correo electrónico y contraseña. */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonSpinner,
    IonText,
  ],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  /** Estado de la sesión: carga y error del acceso. */
  readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);

  /** Formulario tipado de acceso. */
  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /**
   * Valida el formulario, inicia sesión y redirige según el rol. Si hay errores,
   * lleva el foco al primer campo inválido.
   */
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const firstInvalid = document.querySelector<HTMLElement & { setFocus(): Promise<void> }>(
        'app-login ion-input.ng-invalid',
      );
      void firstInvalid?.setFocus();
      return;
    }
    const { email, password } = this.form.getRawValue();
    const result = await this.authStore.signIn(email, password);
    if (!result.error) {
      if (this.authStore.isAdmin()) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/products']);
      }
    }
  }
}
