import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Profile, UserRole } from '../models/auth.model';

import { AuthService } from './auth.service';

/** Estado de la sesión y del perfil del usuario. */
interface AuthState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  role: UserRole | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

/** Estado sin usuario y con la sesión aún sin restaurar. */
const initialState: AuthState = {
  userId: null,
  email: null,
  profile: null,
  role: null,
  initialized: false,
  loading: false,
  error: null,
};

/**
 * Store global de autenticación.
 *
 * Expone el usuario, su perfil y su rol como signals, junto con `isAdmin` e
 * `isAuthenticated`. Los guards esperan a `initialized` antes de decidir.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAdmin: computed(() => store.role() === 'admin'),
    isAuthenticated: computed(() => !!store.userId()),
  })),
  withMethods((store, authService = inject(AuthService)) => ({
    /** Restaura la sesión guardada y carga el perfil. Siempre deja `initialized` a `true`. */
    async init(): Promise<void> {
      patchState(store, { loading: true, error: null });
      try {
        const { data } = await authService.getSession();
        const session = data.session;
        if (!session?.user) {
          patchState(store, { ...initialState, initialized: true });
          return;
        }
        const userId = session.user.id;
        const email = session.user.email ?? null;
        const { data: profile, error } = await authService.getProfile(userId);
        if (error) {
          patchState(store, {
            userId,
            email,
            profile: null,
            role: null,
            initialized: true,
            loading: false,
            error: error.message,
          });
          return;
        }
        patchState(store, {
          userId,
          email,
          profile: profile as Profile,
          role: (profile as Profile)?.role ?? 'user',
          initialized: true,
          loading: false,
          error: null,
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Error de autenticación';
        patchState(store, { ...initialState, initialized: true, error: message });
      }
    },
    /**
     * Inicia sesión con email y contraseña y carga el perfil.
     *
     * @param email Correo electrónico
     * @param password Contraseña
     * @returns Objeto con el error producido o `null` si ha ido bien
     */
    async signIn(email: string, password: string): Promise<{ error: unknown | null }> {
      patchState(store, { loading: true, error: null });
      try {
        const { error } = await authService.signIn(email, password);
        if (error) {
          patchState(store, { loading: false, error: error.message });
          return { error };
        }
        await this.init();
        return { error: null };
      } catch (e: any) {
        patchState(store, { loading: false, error: e?.message ?? 'Error al iniciar sesión' });
        return { error: e };
      }
    },
    /**
     * Limpia la sesión del estado dejándolo como "sin usuario" pero ya
     * inicializado, para que los guards no esperen indefinidamente.
     */
    clearSession(): void {
      patchState(store, { ...initialState, initialized: true });
    },
    /** Cierra la sesión. El estado local se limpia aunque Supabase no responda. */
    async signOut(): Promise<void> {
      patchState(store, { loading: true });
      try {
        await authService.signOut();
      } catch {
        // Si Supabase no responde la sesión local se limpia igualmente: el
        // usuario espera salir de la aplicación aunque no haya red.
      }
      this.clearSession();
    },
    /**
     * Fija o limpia el mensaje de error.
     *
     * @param message Mensaje que se muestra o `null` para limpiarlo
     */
    setError(message: string | null): void {
      patchState(store, { error: message });
    },
  })),
);
