import type { AbstractControl } from '@angular/forms';
import { FormControl } from '@angular/forms';
import type { Observable } from 'rxjs';
import { of, throwError } from 'rxjs';

import { UNIQUE_FIELD_DEBOUNCE_MS, uniqueFieldValidator } from './unique-field.validator';

type ExistsCheck = (value: string, excludeId?: number) => Observable<boolean>;

/**
 * Espera a que el control salga del estado `PENDING` (validación resuelta).
 *
 * @param control Control con validador asíncrono
 * @param timeout Tiempo máximo de espera en milisegundos
 */
async function waitForStatus(control: AbstractControl, timeout = 2000): Promise<void> {
  if (control.status !== 'PENDING') return;

  await new Promise<void>((resolve, reject) => {
    let timer = 0;
    const subscription = control.statusChanges.subscribe((status) => {
      if (status === 'PENDING') return;
      clearTimeout(timer);
      subscription.unsubscribe();
      resolve();
    });

    timer = setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error('La validación asíncrona no terminó a tiempo'));
    }, timeout);
  });
}

describe('uniqueFieldValidator', () => {
  it('no consulta la API si el campo está vacío', async () => {
    const exists = vi.fn<ExistsCheck>(() => of(true));
    const control = new FormControl('', { asyncValidators: [uniqueFieldValidator({ exists }, 'sku')] });

    await waitForStatus(control);

    expect(exists).not.toHaveBeenCalled();
    expect(control.valid).toBe(true);
  });

  it('valida el valor libre tras el retardo de espera', async () => {
    const exists = vi.fn<ExistsCheck>(() => of(false));
    const control = new FormControl('  TEC-001  ', {
      asyncValidators: [uniqueFieldValidator({ exists }, 'sku')],
    });

    await waitForStatus(control);

    expect(exists).toHaveBeenCalledWith('TEC-001', undefined);
    expect(control.valid).toBe(true);
  });

  it('marca el control como inválido si el valor ya existe', async () => {
    const exists = vi.fn<ExistsCheck>(() => of(true));
    const control = new FormControl('TEC-001', { asyncValidators: [uniqueFieldValidator({ exists }, 'sku')] });

    await waitForStatus(control);

    expect(control.hasError('uniqueField')).toBe(true);
    expect(control.getError('uniqueField')).toEqual({ column: 'sku' });
    expect(control.invalid).toBe(true);
  });

  it('excluye el propio registro al editar', async () => {
    const exists = vi.fn<ExistsCheck>(() => of(false));
    const control = new FormControl('CLI-1', { asyncValidators: [uniqueFieldValidator({ exists }, 'email', 7)] });

    await waitForStatus(control);

    expect(exists).toHaveBeenCalledWith('CLI-1', 7);
  });

  it('espera el debounce antes de consultar la API', async () => {
    const exists = vi.fn<ExistsCheck>(() => of(false));
    const control = new FormControl('TEC-001', { asyncValidators: [uniqueFieldValidator({ exists }, 'sku')] });

    await new Promise((resolve) => setTimeout(resolve, UNIQUE_FIELD_DEBOUNCE_MS - 150));
    expect(exists).not.toHaveBeenCalled();
    expect(control.pending).toBe(true);

    await waitForStatus(control);
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it('no bloquea el formulario si la comprobación falla', async () => {
    const exists = vi.fn<ExistsCheck>(() => throwError(() => new Error('sin red')));
    const control = new FormControl('TEC-001', { asyncValidators: [uniqueFieldValidator({ exists }, 'sku')] });

    await waitForStatus(control);

    expect(control.valid).toBe(true);
    expect(control.hasError('uniqueField')).toBe(false);
  });
});
