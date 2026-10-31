import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { AuthStore } from '../../../core/auth/auth.store';

import { LoginPage } from './login.page';

describe('LoginPage: etiquetas', () => {
  it('da una etiqueta propia a cada ion-input', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthStore, useValue: { error: signal(null), loading: signal(false), isAdmin: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('ion-input'));

    expect(inputs.map((input) => input.label)).toEqual(['Correo electrónico', 'Contraseña']);
    expect(inputs.map((input) => input.labelPlacement)).toEqual(['stacked', 'stacked']);
  });
});
