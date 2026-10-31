import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { AuthStore } from '../../../core/auth/auth.store';

import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let fixture: ComponentFixture<LoginPage>;
  let error: WritableSignal<string | null>;
  let loading: WritableSignal<boolean>;

  beforeEach(async () => {
    error = signal<string | null>(null);
    loading = signal(false);

    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthStore, useValue: { error, loading, isAdmin: signal(false), signIn: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('tiene un único h1 y un punto de referencia principal', () => {
    expect(element().querySelectorAll('h1')).toHaveLength(1);
    expect(element().querySelector('h1')?.textContent).toContain('Iniciar sesión');
    expect(element().querySelector('ion-content')?.getAttribute('role')).toBe('main');
  });

  it('da una etiqueta propia a cada campo', () => {
    const labels = Array.from(element().querySelectorAll('ion-input')).map((input) => input.getAttribute('label'));

    expect(labels).toEqual(['Correo electrónico', 'Contraseña']);
  });

  it('anuncia los errores de validación y los asocia a su campo', () => {
    fixture.componentInstance.form.markAllAsTouched();
    fixture.componentRef.changeDetectorRef.markForCheck();
    fixture.detectChanges();

    const alerts = element().querySelectorAll('[role="alert"]');
    expect(alerts).toHaveLength(2);
    expect(element().querySelector('#login-email-error')?.textContent).toContain('correo');
    expect(element().querySelector('ion-input')?.getAttribute('aria-describedby')).toBe('login-email-error');
  });

  it('anuncia el error de acceso del store', () => {
    error.set('Credenciales no válidas');
    fixture.detectChanges();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Credenciales no válidas');
  });

  it('marca el botón como ocupado mientras se inicia sesión', () => {
    loading.set(true);
    fixture.detectChanges();

    const button = element().querySelector('ion-button');
    expect(button?.getAttribute('aria-busy')).toBe('true');
    expect(button?.textContent).toContain('Entrando');
  });
});
