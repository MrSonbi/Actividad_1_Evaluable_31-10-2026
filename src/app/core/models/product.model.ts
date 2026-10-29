/** Producto del catálogo. */
export interface Product {
  id: number;
  sku: string;
  name: string;
  category_id: number | null;
  price: number;
  stock: number;
  created_at: string;
}

/** Producto enriquecido con el nombre de su categoría (join PostgREST). */
export interface ProductWithCategory extends Product {
  category_name: string | null;
}

/** Datos editables de un producto. */
export type ProductInput = Omit<Product, 'id' | 'created_at'>;

/** Fila tal y como la devuelve PostgREST al pedir `*,categories(name)`. */
export interface ProductRow extends Product {
  categories: { name: string } | null;
}
