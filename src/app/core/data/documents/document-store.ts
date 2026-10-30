import { inject, InjectionToken } from '@angular/core';
import type { Observable } from 'rxjs';

import type { DocumentRecord, JsonObject } from '../../models/document.model';

import { SupabaseDocumentStore } from './supabase-document-store';

/**
 * Contrato de la colección de documentos "NoSQL" simulada.
 *
 * Aislar el acceso en esta interfaz permite sustituir Supabase por otra
 * implementación (por ejemplo Firestore) sin tocar servicios ni componentes:
 * basta con registrar otro proveedor para {@link DOCUMENT_STORE}.
 */
export interface DocumentStore {
  /**
   * Añade un documento a una colección.
   *
   * @param collection Nombre de la colección
   * @param data Contenido del documento (columna `data`)
   */
  add<TData extends JsonObject>(collection: string, data: TData): Observable<DocumentRecord<TData>>;

  /**
   * Recupera los últimos documentos de una colección, del más reciente al más
   * antiguo.
   *
   * @param collection Nombre de la colección
   * @param limit Número máximo de documentos
   */
  latest<TData extends JsonObject>(collection: string, limit: number): Observable<DocumentRecord<TData>[]>;

  /**
   * Emite cada nuevo documento insertado en la colección (tiempo real).
   *
   * @param collection Nombre de la colección
   */
  changes$<TData extends JsonObject>(collection: string): Observable<DocumentRecord<TData>>;
}

/** Token de inyección de la implementación activa de {@link DocumentStore}. */
export const DOCUMENT_STORE = new InjectionToken<DocumentStore>('DOCUMENT_STORE', {
  providedIn: 'root',
  factory: () => inject(SupabaseDocumentStore),
});
