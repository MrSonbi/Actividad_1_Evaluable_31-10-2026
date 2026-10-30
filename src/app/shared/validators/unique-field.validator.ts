import type { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { catchError, debounceTime, map, startWith, switchMap, take } from 'rxjs/operators';

/** Tiempo de espera antes de consultar si el valor está libre (ms). */
export const UNIQUE_FIELD_DEBOUNCE_MS = 400;

/**
 * Fuente de comprobación de unicidad.
 *
 * Tanto `ProductsApi` como `CustomersApi` la implementan mediante su método
 * `exists`, de modo que el validador no conoce ninguna tabla concreta.
 */
export interface UniqueFieldApi {
  /**
   * Indica si ya existe un registro con ese valor.
   *
   * @param value Valor a comprobar
   * @param excludeId Registro que se excluye de la búsqueda (el que se edita)
   */
  exists(value: string, excludeId?: number): Observable<boolean>;
}

/**
 * Crea un validador asíncrono que comprueba que un campo no esté repetido.
 *
 * Espera {@link UNIQUE_FIELD_DEBOUNCE_MS} milisegundos antes de consultar la
 * API, cancela la petición anterior con `switchMap` si el usuario sigue
 * escribiendo y nunca bloquea el formulario ante un fallo de red (`catchError`
 * devuelve `null`). Mientras se ejecuta, Angular marca el control como
 * `PENDING`, lo que permite mostrar un indicador de progreso y `aria-busy`.
 *
 * @param api Fuente que comprueba la existencia del valor
 * @param column Nombre lógico del campo; viaja en el error devuelto
 * @param excludeId Identificador del registro que se está editando, si procede
 * @returns Validador asíncrono listo para `asyncValidators`
 */
export function uniqueFieldValidator(api: UniqueFieldApi, column: string, excludeId?: number): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    if (!hasValue(control.value)) return of(null);

    return control.valueChanges.pipe(
      startWith(control.value),
      debounceTime(UNIQUE_FIELD_DEBOUNCE_MS),
      take(1),
      switchMap((value: unknown) => api.exists(normalizeValue(value), excludeId)),
      map((exists: boolean) => (exists ? { uniqueField: { column } } : null)),
      catchError(() => of(null)),
    );
  };
}

/**
 * Indica si el valor del control tiene contenido que comprobar.
 *
 * @param value Valor actual del control
 */
function hasValue(value: unknown): boolean {
  return normalizeValue(value).length > 0;
}

/**
 * Normaliza el valor antes de enviarlo a la API.
 *
 * @param value Valor original del control
 * @returns Valor sin espacios en los extremos
 */
function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}
