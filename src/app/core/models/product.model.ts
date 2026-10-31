/** Producto del catálogo. */
export interface Product {
  /** Identificador. */
  id: number;
  /** Código único del producto. */
  sku: string;
  /** Nombre. */
  name: string;
  /** Categoría, si tiene. */
  category_id: number | null;
  /** Precio en euros. */
  price: number;
  /** Unidades disponibles. */
  stock: number;
  /** Fecha de alta en ISO 8601. */
  created_at: string;
}

/** Producto enriquecido con el nombre de su categoría (join PostgREST). */
export interface ProductWithCategory extends Product {
  /** Nombre de la categoría, si tiene. */
  category_name: string | null;
}

/** Datos editables de un producto. */
export type ProductInput = Omit<Product, 'id' | 'created_at'>;

/** Fila tal y como la devuelve PostgREST al pedir `*,categories(name)`. */
export interface ProductRow extends Product {
  /** Categoría embebida por PostgREST. */
  categories: { name: string } | null;
}
