/** Valor JSON válido (subconjunto del estándar, sin `undefined`). */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Objeto JSON genérico almacenado en la columna `documents.data`. */
export type JsonObject = { [key: string]: JsonValue };

/** Colección usada por el feed de actividad. */
export const ACTIVITY_COLLECTION = 'activity';

/** Acción registrada en el feed de actividad. */
export type ActivityAction = 'create' | 'update' | 'delete';

/** Entidad afectada por la acción. */
export type ActivityEntity = 'product' | 'customer' | 'order';

/** Contenido del documento de actividad (columna `data`). */
export type ActivityData = JsonObject & {
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string | number;
  summary: string;
  actor: string | null;
  at: string;
};

/** Documento de la colección "NoSQL" simulada. */
export interface DocumentRecord<TData extends JsonObject = JsonObject> {
  /** Identificador del documento. */
  id: string;
  /** Colección a la que pertenece. */
  collection: string;
  /** Contenido JSON. */
  data: TData;
  /** Usuario que lo creó. */
  created_by: string | null;
  /** Fecha de creación en ISO 8601. */
  created_at: string;
}
