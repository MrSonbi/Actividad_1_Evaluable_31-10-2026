import type { ActivityAction, ActivityEntity } from '../../core/models/document.model';

/**
 * Entrada que muestra `app-activity-feed`.
 *
 * Es una versión estructural de la actividad registrada en la colección
 * `activity`, con el identificador del documento incluido.
 */
export interface ActivityFeedItem {
  /** Identificador del documento de actividad. */
  id: string;
  /** Acción realizada. */
  action: ActivityAction;
  /** Entidad afectada. */
  entity: ActivityEntity;
  /** Identificador del registro afectado. */
  entityId?: string | number;
  /** Resumen legible de la operación. */
  summary: string;
  /** Correo del usuario que realizó la acción. */
  actor: string | null;
  /** Fecha ISO 8601 en la que se registró la actividad. */
  at: string;
}
