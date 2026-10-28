import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  let authService: any;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    authService = {
      getSession: vi.fn(),
      getProfile: vi.fn(),
      signInWithPassword: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authService }],
    });

    store = TestBed.inject(AuthStore);
  });

  it('should have initial state', () => {
    expect(store.userId()).toBeNull();
    expect(store.initialized()).toBe(false);
    expect(store.isAdmin()).toBe(false);
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should restore session and profile', async () => {
    authService.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: '123', email: 'test@test.com' } } },
    });
    authService.getProfile = vi.fn().mockResolvedValue({
      data: { id: '123', email: 'test@test.com', full_name: 'Test', role: 'admin' },
      error: null,
    });

    await store.init();

    expect(store.initialized()).toBe(true);
    expect(store.userId()).toBe('123');
    expect(store.isAdmin()).toBe(true);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('should handle no session', async () => {
    authService.getSession = vi.fn().mockResolvedValue({ data: { session: null } });

    await store.init();

    expect(store.initialized()).toBe(true);
    expect(store.userId()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('should login and call init', async () => {
    authService.signIn = vi.fn().mockResolvedValue({ error: null });
    authService.getSession = vi.fn().mockResolvedValue({
      data: { session: { user: { id: '456', email: 'user@test.com' } } },
    });
    authService.getProfile = vi.fn().mockResolvedValue({
      data: { id: '456', email: 'user@test.com', role: 'user' },
      error: null,
    });

    const result = await store.signIn('user@test.com', 'password');

    expect(result.error).toBeNull();
    expect(authService.signIn).toHaveBeenCalledWith('user@test.com', 'password');
    expect(store.isAdmin()).toBe(false);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('should logout and reset state', async () => {
    authService.signOut = vi.fn().mockResolvedValue({});

    await store.signOut();

    expect(authService.signOut).toHaveBeenCalled();
    expect(store.userId()).toBeNull();
    expect(store.initialized()).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
  });
});
