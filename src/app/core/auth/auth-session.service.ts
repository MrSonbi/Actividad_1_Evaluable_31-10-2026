import { inject, Injectable } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthChangeEvent, Subscription } from '@supabase/supabase-js';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

/** Ruta a la que se redirige cuando no hay sesión. */
const LOGIN_URL = '/login';

/**
 * Coordina el cierre de sesión y las redirecciones asociadas.
 *
 * Centraliza dos escenarios que antes dejaban al usuario en una página
 * protegida sin sesión:
 *
 * 1. Cierre de sesión explícito: limpia el estado y navega a `/login`.
 * 2. Cierre de sesión externo (token caducado o logout desde otra pestaña):
 *    Supabase emite `SIGNED_OUT` y este servicio limpia el estado y navega.
 */
@Injectable({ providedIn: 'root' })
export class AuthSessionService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  private subscription: Subscription | null = null;

  /**
   * Empieza a escuchar los cambios de estado de autenticación.
   *
   * Es idempotente: llamarlo varias veces registra una única suscripción.
   */
  start(): void {
    if (this.subscription) return;

    const { data } = this.authService.onAuthStateChange((event) => this.handleAuthEvent(event));
    this.subscription = data.subscription;
  }

  /**
   * Cierra la sesión y navega a `/login` sin dejar la página anterior en el
   * historial, de modo que el botón "Atrás" no vuelva a una vista protegida.
   */
  async signOut(): Promise<void> {
    await this.store.signOut();
    await this.redirectToLogin();
  }

  /** Libera la suscripción de Supabase al destruirse el servicio. */
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.subscription = null;
  }

  /**
   * Reacciona a los eventos de Supabase que implican pérdida de sesión.
   *
   * @param event Evento emitido por `onAuthStateChange`
   */
  private handleAuthEvent(event: AuthChangeEvent): void {
    if (event !== 'SIGNED_OUT') return;
    // Si el estado ya está limpio (logout propio o arranque sin sesión) no hay
    // nada que redirigir: evita navegaciones duplicadas al cargar la app.
    if (!this.store.isAuthenticated()) return;

    this.store.clearSession();
    void this.redirectToLogin();
  }

  /** Navega a `/login` salvo que ya se esté en esa ruta. */
  private async redirectToLogin(): Promise<void> {
    if (this.router.url.startsWith(LOGIN_URL)) return;
    await this.router.navigate([LOGIN_URL], { replaceUrl: true });
  }
}
