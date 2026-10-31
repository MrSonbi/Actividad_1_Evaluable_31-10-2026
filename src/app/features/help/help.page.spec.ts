import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { of } from 'rxjs';

import { AuthStore } from '../../core/auth/auth.store';

import { HelpPage } from './help.page';

describe('HelpPage', () => {
  /**
   * Crea la página con el rol y los parámetros de URL indicados.
   *
   * @param isAdmin Si el usuario es administrador
   * @param queryParams Parámetros de la URL
   */
  async function setup(isAdmin: boolean, queryParams: Record<string, string> = {}): Promise<ComponentFixture<HelpPage>> {
    await TestBed.configureTestingModule({
      imports: [HelpPage],
      providers: [
        provideIonicAngular(),
        { provide: AuthStore, useValue: { isAdmin: signal(isAdmin) } },
        { provide: ActivatedRoute, useValue: { queryParams: of(queryParams) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HelpPage);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra un encabezado y las secciones en el acordeón', async () => {
    const fixture = await setup(false);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('h1')?.textContent).toContain('Ayuda');
    expect(element.querySelectorAll('ion-accordion').length).toBe(fixture.componentInstance.sections().length);
    expect(element.textContent).toContain('Exportar a CSV y PDF');
  });

  it('oculta el dashboard a los usuarios sin rol de administrador', async () => {
    const fixture = await setup(false);

    expect(fixture.componentInstance.sections().some((section) => section.id === 'dashboard')).toBe(false);
  });

  it('muestra el dashboard a los administradores', async () => {
    const fixture = await setup(true);

    expect(fixture.componentInstance.sections().some((section) => section.id === 'dashboard')).toBe(true);
  });

  it('abre la sección indicada en la URL', async () => {
    const fixture = await setup(false, { section: 'orders' });

    expect(fixture.componentInstance.openSection()).toBe('orders');
  });

  it('abre la sección inicial si la indicada no existe o no corresponde al rol', async () => {
    const fixture = await setup(false, { section: 'dashboard' });

    expect(fixture.componentInstance.openSection()).toBe('access');
  });
});
