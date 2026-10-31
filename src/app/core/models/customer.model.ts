/** Cliente de la empresa. */
export interface Customer {
  /** Identificador. */
  id: number;
  /** Nombre completo. */
  full_name: string;
  /** Correo único, siempre en minúsculas. */
  email: string;
  /** Teléfono, opcional. */
  phone: string | null;
  /** Ciudad, opcional. */
  city: string | null;
  /** Fecha de alta en ISO 8601. */
  created_at: string;
}

/** Datos editables de un cliente. */
export type CustomerInput = Omit<Customer, 'id' | 'created_at'>;
