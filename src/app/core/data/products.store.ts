import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { Category } from '../models/category.model';
import type { Product, ProductInput, ProductWithCategory } from '../models/product.model';

import { ActivityLogService } from './activity-log.service';
import { CategoriesApi } from './sql/categories.api';
import { ProductsApi } from './sql/products.api';

interface ProductsState {
  /** Catálogo completo cargado del servidor. */
  items: ProductWithCategory[];
  categories: Category[];
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  categories: [],
  loading: false,
  error: null,
};

/**
 * Enriquece un producto con el nombre de su categoría usando el catálogo ya
 * cargado en el store, sin lanzar una petición adicional tras crear o editar.
 *
 * @param product Producto devuelto por PostgREST
 * @param categories Categorías disponibles en el store
 */
function withCategoryName(product: Product, categories: readonly Category[]): ProductWithCategory {
  return {
    ...product,
    category_name: categories.find((category) => category.id === product.category_id)?.name ?? null,
  };
}

/**
 * Estado de la feature de productos: catálogo completo y CRUD.
 *
 * El store carga todas las filas del servidor (por bloques); la búsqueda, la
 * ordenación y la paginación de la tabla se resuelven en el cliente. Cada
 * operación de escritura actualiza la lista en memoria y registra la actividad
 * correspondiente, sin volver a pedir el catálogo completo.
 */
export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    /** Número total de productos cargados. */
    total: computed(() => store.items().length),
    isEmpty: computed(() => !store.loading() && store.items().length === 0),
    hasError: computed(() => store.error() !== null),
  })),
  withMethods(
    (
      store,
      productsApi = inject(ProductsApi),
      categoriesApi = inject(CategoriesApi),
      activity = inject(ActivityLogService),
    ) => ({
      /**
       * Carga las categorías que alimentan el selector del formulario.
       */
      async loadCategories(): Promise<void> {
        try {
          const categories = await firstValueFrom(categoriesApi.list());
          patchState(store, { categories });
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
        }
      },

      /**
       * Carga el catálogo completo, pidiendo al servidor todos los bloques.
       */
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const items = await firstValueFrom(productsApi.listAll());
          patchState(store, { items, loading: false });
        } catch (error: unknown) {
          patchState(store, { loading: false, error: toErrorMessage(error) });
        }
      },

      /**
       * Crea un producto, lo inserta al principio de la lista y registra la
       * actividad.
       *
       * La inserción es local: no se recarga el catálogo, así que se conservan
       * la búsqueda, la ordenación y la página que el usuario tenga aplicadas.
       *
       * @param input Datos del producto
       * @returns `true` si la operación se completó correctamente
       */
      async create(input: ProductInput): Promise<boolean> {
        try {
          const created = await firstValueFrom(productsApi.create(input));
          const item = withCategoryName(created, store.categories());
          patchState(store, { items: [item, ...store.items()], error: null });
          activity.log('create', 'product', created.id, `Producto creado: ${created.name}`);
          return true;
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
          return false;
        }
      },

      /**
       * Actualiza un producto y reemplaza su fila en la lista, sin recargarla.
       *
       * @param id Identificador del producto
       * @param input Campos a modificar
       * @returns `true` si la operación se completó correctamente
       */
      async update(id: number, input: Partial<ProductInput>): Promise<boolean> {
        try {
          const updated = await firstValueFrom(productsApi.update(id, input));
          const item = withCategoryName(updated, store.categories());
          patchState(store, {
            items: store.items().map((existing) => (existing.id === id ? item : existing)),
            error: null,
          });
          activity.log('update', 'product', id, `Producto actualizado: ${updated.name}`);
          return true;
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
          return false;
        }
      },

      /**
       * Elimina un producto de la lista en memoria y registra la actividad.
       *
       * @param product Producto a eliminar
       * @returns `true` si la operación se completó correctamente
       */
      async remove(product: ProductWithCategory): Promise<boolean> {
        try {
          await firstValueFrom(productsApi.remove(product.id));
          patchState(store, {
            items: store.items().filter((existing) => existing.id !== product.id),
            error: null,
          });
          activity.log('delete', 'product', product.id, `Producto eliminado: ${product.name}`);
          return true;
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
          return false;
        }
      },

      /** Limpia el error actual (al cerrar un aviso, por ejemplo). */
      clearError(): void {
        patchState(store, { error: null });
      },

      /** Restablece el estado inicial (al cerrar sesión o cambiar de usuario). */
      reset(): void {
        patchState(store, { ...initialState });
      },
    }),
  ),
);
