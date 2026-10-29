/** Categoría de producto. */
export interface Category {
  id: number;
  name: string;
}

/** Datos editables de una categoría. */
export type CategoryInput = Omit<Category, 'id'>;
