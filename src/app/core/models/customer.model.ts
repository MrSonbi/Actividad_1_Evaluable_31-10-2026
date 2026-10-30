/** Cliente de la empresa. */
export interface Customer {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  created_at: string;
}

/** Datos editables de un cliente. */
export type CustomerInput = Omit<Customer, 'id' | 'created_at'>;
