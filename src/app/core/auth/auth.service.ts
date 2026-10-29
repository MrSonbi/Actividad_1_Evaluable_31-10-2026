import { inject, Injectable } from '@angular/core';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';

import type { Profile } from '../models/auth.model';
import { SUPABASE_CLIENT } from '../supabase/supabase.token';

/** Firma del callback que Supabase invoca en cada cambio de estado de autenticación. */
export type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

/** Resultado de un inicio de sesión con email y contraseña. */
type SignInResult = Awaited<ReturnType<SupabaseClient['auth']['signInWithPassword']>>;

/** Resultado del cierre de sesión. */
type SignOutResult = Awaited<ReturnType<SupabaseClient['auth']['signOut']>>;

/** Resultado de la restauración de la sesión persistida. */
type SessionResult = Awaited<ReturnType<SupabaseClient['auth']['getSession']>>;

/**
 * Envoltorio de la API de autenticación de Supabase.
 *
 * Solo expone lo necesario para la sesión (login, logout, restauración y
 * observación de cambios de estado); el resto de datos se consulta por REST.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);

  /**
   * Inicia sesión con email y contraseña.
   *
   * @param email Correo del usuario
   * @param password Contraseña del usuario
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  /**
   * Cierra la sesión en Supabase (local y, si procede, en el servidor).
   */
  async signOut(): Promise<SignOutResult> {
    return this.supabase.auth.signOut();
  }

  /**
   * Recupera la sesión persistida en el navegador.
   */
  async getSession(): Promise<SessionResult> {
    return this.supabase.auth.getSession();
  }

  /**
   * Se suscribe a los cambios de estado de autenticación.
   *
   * Los eventos relevantes para la app son `SIGNED_OUT` (cierre de sesión,
   * caducidad del token o cierre desde otra pestaña) y `INITIAL_SESSION`.
   *
   * @param callback Función que se ejecuta en cada cambio de estado
   */
  onAuthStateChange(callback: AuthStateCallback): ReturnType<SupabaseClient['auth']['onAuthStateChange']> {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Obtiene el perfil (`profiles`) del usuario autenticado.
   *
   * @param userId Identificador del usuario (`auth.uid()`)
   */
  async getProfile(userId: string): Promise<{ data: Profile | null; error: { message: string } | null }> {
    return this.supabase.from('profiles').select('*').eq('id', userId).single();
  }
}
