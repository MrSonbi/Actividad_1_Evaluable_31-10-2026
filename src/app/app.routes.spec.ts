import type { Route } from '@angular/router';

import { routes } from './app.routes';

/**
 * Devuelve las rutas que muestran una pantalla: las que no redirigen ni agrupan hijas.
 *
 * @param list Rutas de un nivel
 */
function screens(list: readonly Route[]): Route[] {
  return list.flatMap((route) => {
    if (route.children) return screens(route.children);
    return route.redirectTo ? [] : [route];
  });
}

describe('routes', () => {
  it('asigna un título propio a cada pantalla', () => {
    const titles = screens(routes).map((route) => route.title);

    expect(titles.every((title) => typeof title === 'string' && title.includes('Inventario'))).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
