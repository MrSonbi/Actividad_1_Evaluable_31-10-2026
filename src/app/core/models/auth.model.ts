/** Rol de un usuario de la aplicación. */
export type UserRole = 'admin' | 'user';

/** Perfil de un usuario (tabla `profiles`). */
export interface Profile {
  /** Identificador, igual al del usuario de Supabase Auth. */
  id: string;
  /** Correo electrónico. */
  email: string;
  /** Nombre completo, si se conoce. */
  full_name: string | null;
  /** Rol del usuario. */
  role: UserRole;
  /** Fecha de creación en ISO 8601. */
  created_at: string;
}
