import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Subscription } from '@supabase/supabase-js';

import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthSessionService', () => {
  let store: InstanceType<typeof AuthStore>;
  let authService: {
    signOut: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    getProfile: ReturnType<typeof vi.fn>;
    signIn: ReturnType<typeof vi.fn>;
    onAuthStateChange: ReturnType<typeof vi.fn>;
  };
  let navigate: ReturnType<typeof vi.fn>;
  let router: { url: string; navigate: ReturnType<typeof vi.fn> };
  let subscription: { unsubscribe: ReturnType<typeof vi.fn> };
  let emitAuthEvent: (event: string) => void;

  beforeEach(() => {
    let handler: ((event: string, session: unknown) => void) | undefined;
    subscription = { unsubscribe: vi.fn() };

    authService = {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: { user: { id: 'user-1', email: 'demo@example.com' } } } }),
      getProfile: vi
        .fn()
        .mockResolvedValue({ data: { id: 'user-1', email: 'demo@example.com', role: 'admin' }, error: null }),
      signIn: vi.fn(),
      onAuthStateChange: vi.fn((callback: (event: string, session: unknown) => void) => {
        handler = callback;
        return { data: { subscription: subscription as unknown as Subscription } };
      }),
    };

    emitAuthEvent = (event: string) => handler?.(event, null);
    navigate = vi.fn().mockResolvedValue(true);
    router = { url: '/dashboard', navigate };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('navega a /login con replaceUrl al cerrar sesión', async () => {
    await store.init();
    expect(store.isAuthenticated()).toBe(true);

    const service = TestBed.inject(AuthSessionService);
    await service.signOut();

    expect(authService.signOut).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.userId()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('redirige a /login cuando Supabase emite SIGNED_OUT', async () => {
    await store.init();
    const service = TestBed.inject(AuthSessionService);
    service.start();

    emitAuthEvent('SIGNED_OUT');

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true }));
    expect(store.isAuthenticated()).toBe(false);
    expect(store.userId()).toBeNull();
  });

  it('no redirige con SIGNED_OUT si ya no había sesión', async () => {
    const service = TestBed.inject(AuthSessionService);
    service.start();

    emitAuthEvent('SIGNED_OUT');
    await Promise.resolve();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('no redirige si ya está en /login', async () => {
    router.url = '/login';
    await store.init();
    const service = TestBed.inject(AuthSessionService);
    service.start();

    emitAuthEvent('SIGNED_OUT');
    await Promise.resolve();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('registra una única suscripción y la libera al destruirse', () => {
    const service = TestBed.inject(AuthSessionService);
    service.start();
    service.start();

    expect(authService.onAuthStateChange).toHaveBeenCalledTimes(1);

    service.ngOnDestroy();
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
