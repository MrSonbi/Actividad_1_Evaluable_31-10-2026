import { helpQueryParams } from './help-link';

describe('helpQueryParams', () => {
  it('apunta a la sección de la pantalla actual', () => {
    expect(helpQueryParams('/products')).toEqual({ section: 'products' });
  });

  it('ignora los parámetros y fragmentos de la URL', () => {
    expect(helpQueryParams('/orders?status=paid#top')).toEqual({ section: 'orders' });
  });

  it('no añade sección si la pantalla no tiene ayuda propia', () => {
    expect(helpQueryParams('/help?section=orders')).toEqual({});
    expect(helpQueryParams('/')).toEqual({});
  });
});
