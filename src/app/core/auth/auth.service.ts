import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../supabase/supabase.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);

  async signIn(email: string, password: string): Promise<ReturnType<SupabaseClient['auth']['signInWithPassword']>> {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut(): Promise<ReturnType<SupabaseClient['auth']['signOut']>> {
    return this.supabase.auth.signOut();
  }

  async getSession(): Promise<ReturnType<SupabaseClient['auth']['getSession']>> {
    return this.supabase.auth.getSession();
  }

  onAuthStateChange(
    callback: (
      event: string,
      session: any,
    ) => ReturnType<SupabaseClient['auth']['onAuthStateChange']>['data']['subscription'],
  ): ReturnType<SupabaseClient['auth']['onAuthStateChange']> {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  async getProfile(userId: string): Promise<any> {
    return this.supabase.from('profiles').select('*').eq('id', userId).single();
  }
}
