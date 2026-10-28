import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { LoginPage } from './login.page';
import { AuthStore } from '../../../core/auth/auth.store';

describe('LoginPage', () => {
  let component: LoginPage;
  let fixture: ComponentFixture<LoginPage>;
  let authStore: any;
  let router: any;

  beforeEach(async () => {
    authStore = {
      signIn: vi.fn(),
      error: () => null,
      loading: () => false,
      isAdmin: () => false,
    };
    router = { navigate: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginPage, ReactiveFormsModule],
      providers: [
        { provide: AuthStore, useValue: authStore },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should be invalid when empty', () => {
    expect(component.form.valid).toBe(false);
  });

  it('should mark all as touched on invalid submit', async () => {
    const markAllAsTouchedSpy = vi.spyOn(component.form, 'markAllAsTouched');
    await component.onSubmit();
    expect(markAllAsTouchedSpy).toHaveBeenCalled();
  });

  it('should show error if signIn fails', async () => {
    component.form.setValue({ email: 'test@test.com', password: '123456' });
    authStore.error = () => 'Credenciales inválidas';
    authStore.signIn = vi.fn().mockResolvedValue({ error: 'error' });
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Credenciales inválidas');
  });

  it('should navigate to /dashboard if admin on success', async () => {
    component.form.setValue({ email: 'admin@test.com', password: '123456' });
    authStore.signIn = vi.fn().mockResolvedValue({ error: null });
    authStore.isAdmin = () => true;
    await component.onSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to /products if user on success', async () => {
    component.form.setValue({ email: 'user@test.com', password: '123456' });
    authStore.signIn = vi.fn().mockResolvedValue({ error: null });
    authStore.isAdmin = () => false;
    await component.onSubmit();
    expect(router.navigate).toHaveBeenCalledWith(['/products']);
  });
});
