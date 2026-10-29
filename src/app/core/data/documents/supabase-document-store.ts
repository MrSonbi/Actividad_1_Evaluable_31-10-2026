import { inject, Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Observable } from 'rxjs';

import type { DocumentRecord, JsonObject } from '../../models/document.model';
import { SUPABASE_CLIENT } from '../../supabase/supabase.token';
import { RestClient } from '../sql/rest-client';

import type { DocumentStore } from './document-store';

/** Tabla que almacena los documentos. */
const TABLE = 'documents';

/**
 * Implementación de {@link DocumentStore} sobre Supabase: las lecturas y
 * escrituras van por REST (PostgREST) y las inserciones en vivo por Realtime.
 */
@Injectable({ providedIn: 'root' })
export class SupabaseDocumentStore implements DocumentStore {
  private readonly rest = inject(RestClient);
  private readonly supabase = inject<SupabaseClient>(SUPABASE_CLIENT);

  /**
   * Inserta un documento y devuelve la fila guardada.
   *
   * @param collection Nombre de la colección
   * @param data Contenido del documento
   */
  add<TData extends JsonObject>(collection: string, data: TData): Observable<DocumentRecord<TData>> {
    return this.rest.create<DocumentRecord<TData>>(TABLE, { collection, data });
  }

  /**
   * Recupera los últimos documentos de la colección.
   *
   * @param collection Nombre de la colección
   * @param limit Número máximo de documentos
   */
  latest<TData extends JsonObject>(collection: string, limit: number): Observable<DocumentRecord<TData>[]> {
    return this.rest.list<DocumentRecord<TData>>(TABLE, {
      filters: { collection: `eq.${collection}` },
      order: 'created_at.desc',
      limit,
    });
  }

  /**
   * Escucha las inserciones de la colección mediante Supabase Realtime.
   *
   * El canal se elimina al cancelar la suscripción (`unsubscribe`), de modo que
   * no quedan conexiones abiertas al salir de la pantalla.
   *
   * @param collection Nombre de la colección
   */
  changes$<TData extends JsonObject>(collection: string): Observable<DocumentRecord<TData>> {
    return new Observable<DocumentRecord<TData>>((subscriber) => {
      const channel = this.supabase
        .channel(`documents:${collection}`)
        .on<DocumentRecord<TData>>(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: TABLE,
            filter: `collection=eq.${collection}`,
          },
          (payload) => subscriber.next(payload.new),
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            subscriber.error(new Error('No se pudo conectar con el canal de tiempo real.'));
          }
        });

      return () => {
        void this.supabase.removeChannel(channel);
      };
    });
  }
}
