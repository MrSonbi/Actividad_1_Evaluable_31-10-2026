import { inject, Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_CLIENT } from '../supabase/supabase.token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  async getSession() {
    return this.supabase.auth.getSession();
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.supabase.auth.onAuthStateChange(callback);
  }

  async getProfile(userId: string) {
    return this.supabase.from('profiles').select('*').eq('id', userId).single();
  }
}
