/** Categoría de producto. */
export interface Category {
  /** Identificador. */
  id: number;
  /** Nombre de la categoría. */
  name: string;
}

/** Datos editables de una categoría. */
export type CategoryInput = Omit<Category, 'id'>;
