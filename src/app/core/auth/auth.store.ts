import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Profile, UserRole } from '../models/auth.model';

import { AuthService } from './auth.service';

interface AuthState {
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  role: UserRole | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  userId: null,
  email: null,
  profile: null,
  role: null,
  initialized: false,
  loading: false,
  error: null,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isAdmin: computed(() => store.role() === 'admin'),
    isAuthenticated: computed(() => !!store.userId()),
  })),
  withMethods((store, authService = inject(AuthService)) => ({
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
    setError(message: string | null): void {
      patchState(store, { error: message });
    },
  })),
);
