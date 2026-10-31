/** Pantallas que tienen una sección propia en la página de ayuda. */
const CONTEXTUAL_SECTIONS: readonly string[] = ['dashboard', 'products', 'customers', 'orders'];

/**
 * Calcula los parámetros del enlace a la ayuda según la pantalla actual.
 *
 * @param url URL actual del enrutador, por ejemplo `/orders?x=1`
 * @returns `{ section }` si la pantalla tiene ayuda propia; si no, un objeto vacío
 */
export function helpQueryParams(url: string): { section?: string } {
  const screen = url.split(/[/?#]/)[1] ?? '';
  return CONTEXTUAL_SECTIONS.includes(screen) ? { section: screen } : {};
}
