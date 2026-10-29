import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { toErrorMessage } from '../http/api-error';
import type { Category } from '../models/category.model';
import type { ProductInput, ProductWithCategory } from '../models/product.model';

import { ActivityLogService } from './activity-log.service';
import { CategoriesApi } from './sql/categories.api';
import { ProductsApi } from './sql/products.api';

interface ProductsState {
  items: ProductWithCategory[];
  categories: Category[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  categoryId: number | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  categories: [],
  total: 0,
  page: 1,
  pageSize: 25,
  search: '',
  categoryId: null,
  loading: false,
  error: null,
};

/**
 * Estado de la feature de productos: listado paginado, filtros y CRUD.
 *
 * Cada operación de escritura registra la actividad correspondiente.
 */
export const ProductsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
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
       * Carga la página actual aplicando los filtros activos.
       */
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const { rows, total } = await firstValueFrom(
            productsApi.page({
              page: store.page(),
              pageSize: store.pageSize(),
              search: store.search(),
              categoryId: store.categoryId(),
            }),
          );
          patchState(store, { items: rows, total: total ?? rows.length, loading: false });
        } catch (error: unknown) {
          patchState(store, { loading: false, error: toErrorMessage(error) });
        }
      },

      /**
       * Cambia el texto de búsqueda y recarga desde la primera página.
       *
       * @param search Texto a buscar en el nombre
       */
      async setSearch(search: string): Promise<void> {
        patchState(store, { search, page: 1 });
        await this.load();
      },

      /**
       * Filtra por categoría y recarga desde la primera página.
       *
       * @param categoryId Identificador de la categoría o `null` para todas
       */
      async setCategory(categoryId: number | null): Promise<void> {
        patchState(store, { categoryId, page: 1 });
        await this.load();
      },

      /**
       * Cambia de página y recarga.
       *
       * @param page Número de página (1-based)
       */
      async setPage(page: number): Promise<void> {
        patchState(store, { page: Math.max(page, 1) });
        await this.load();
      },

      /**
       * Crea un producto, registra la actividad y recarga el listado.
       *
       * @param input Datos del producto
       * @returns `true` si la operación se completó correctamente
       */
      async create(input: ProductInput): Promise<boolean> {
        try {
          const created = await firstValueFrom(productsApi.create(input));
          activity.log('create', 'product', created.id, `Producto creado: ${created.name}`);
          await this.load();
          return true;
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
          return false;
        }
      },

      /**
       * Actualiza un producto, registra la actividad y recarga el listado.
       *
       * @param id Identificador del producto
       * @param input Campos a modificar
       * @returns `true` si la operación se completó correctamente
       */
      async update(id: number, input: Partial<ProductInput>): Promise<boolean> {
        try {
          const updated = await firstValueFrom(productsApi.update(id, input));
          activity.log('update', 'product', id, `Producto actualizado: ${updated.name}`);
          await this.load();
          return true;
        } catch (error: unknown) {
          patchState(store, { error: toErrorMessage(error) });
          return false;
        }
      },

      /**
       * Elimina un producto, registra la actividad y recarga el listado.
       *
       * @param product Producto a eliminar
       * @returns `true` si la operación se completó correctamente
       */
      async remove(product: ProductWithCategory): Promise<boolean> {
        try {
          await firstValueFrom(productsApi.remove(product.id));
          activity.log('delete', 'product', product.id, `Producto eliminado: ${product.name}`);
          await this.load();
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
