import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';

import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AuthStore } from '../../core/auth/auth.store';

import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideIonicAngular(),
        provideRouter([]),
        { provide: AuthSessionService, useValue: { signOut: vi.fn() } },
        {
          provide: AuthStore,
          useValue: {
            isAuthenticated: signal(true),
            isAdmin: signal(true),
            profile: signal({ full_name: 'Admin Demo' }),
            email: signal('demo@example.com'),
            role: signal('admin'),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
  });

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('agrupa el menú en una navegación con nombre accesible', () => {
    const nav = element().querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Menú principal');
    expect(nav?.querySelectorAll('ion-item')).toHaveLength(4);
  });

  it('el enlace de salto no navega y lleva el foco al contenido visible', () => {
    const content = document.createElement('ion-content');
    const page = document.createElement('div');
    page.className = 'ion-page';
    page.append(content);
    element().querySelector('#main-content')?.append(page);
    const focus = vi.spyOn(content, 'focus');

    const event = new MouseEvent('click', { cancelable: true });
    element().querySelector('.skip-link')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(content.getAttribute('tabindex')).toBe('-1');
    expect(focus).toHaveBeenCalled();
  });

  it('ignora las páginas que Ionic mantiene ocultas', () => {
    const hidden = document.createElement('div');
    hidden.className = 'ion-page ion-page-hidden';
    const hiddenContent = document.createElement('ion-content');
    hidden.append(hiddenContent);
    element().querySelector('#main-content')?.append(hidden);
    const focus = vi.spyOn(hiddenContent, 'focus');

    element()
      .querySelector('.skip-link')
      ?.dispatchEvent(new MouseEvent('click', { cancelable: true }));

    expect(focus).not.toHaveBeenCalled();
  });
});
