import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { EMPTY } from 'rxjs';
import { catchError, take } from 'rxjs/operators';

import { AuthStore } from '../auth/auth.store';
import type { ActivityAction, ActivityData, ActivityEntity, DocumentRecord } from '../models/document.model';
import { ACTIVITY_COLLECTION } from '../models/document.model';

import { DOCUMENT_STORE } from './documents/document-store';

/**
 * Registra en la colección `activity` las altas, ediciones y borrados que
 * realizan los usuarios, y expone el feed en vivo para el dashboard.
 */
@Injectable({ providedIn: 'root' })
export class ActivityLogService {
  private readonly documents = inject(DOCUMENT_STORE);
  private readonly authStore = inject(AuthStore);

  /**
   * Registra una actividad. Es "fire and forget": un fallo al registrar nunca
   * interrumpe la operación que el usuario está realizando.
   *
   * @param action Acción realizada
   * @param entity Entidad afectada
   * @param entityId Identificador del registro afectado
   * @param summary Resumen legible de la operación
   */
  log(action: ActivityAction, entity: ActivityEntity, entityId: string | number, summary: string): void {
    const data: ActivityData = {
      action,
      entity,
      entityId,
      summary,
      actor: this.authStore.email(),
      at: new Date().toISOString(),
    };

    this.documents
      .add(ACTIVITY_COLLECTION, data)
      .pipe(
        take(1),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  /**
   * Últimas actividades registradas.
   *
   * @param limit Número máximo de entradas
   */
  latest(limit = 20): Observable<DocumentRecord<ActivityData>[]> {
    return this.documents.latest<ActivityData>(ACTIVITY_COLLECTION, limit);
  }

  /**
   * Nuevas actividades en tiempo real.
   */
  changes$(): Observable<DocumentRecord<ActivityData>> {
    return this.documents.changes$<ActivityData>(ACTIVITY_COLLECTION);
  }
}
