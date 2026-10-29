import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import type { ActivityData, DocumentRecord } from '../models/document.model';

import { ActivityLogService } from './activity-log.service';
import { DOCUMENT_STORE } from './documents/document-store';

const RECORD: DocumentRecord<ActivityData> = {
  id: 'doc-1',
  collection: 'activity',
  data: {
    action: 'create',
    entity: 'product',
    entityId: 1,
    summary: 'Producto creado',
    actor: 'demo@example.com',
    at: '2026-01-01T00:00:00Z',
  },
  created_by: null,
  created_at: '2026-01-01T00:00:00Z',
};

describe('ActivityLogService', () => {
  let documents: {
    add: ReturnType<typeof vi.fn>;
    latest: ReturnType<typeof vi.fn>;
    changes$: ReturnType<typeof vi.fn>;
  };
  let service: ActivityLogService;

  beforeEach(() => {
    documents = {
      add: vi.fn(() => of(RECORD)),
      latest: vi.fn(() => of([RECORD])),
      changes$: vi.fn(() => of(RECORD)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: DOCUMENT_STORE, useValue: documents },
        { provide: AuthStore, useValue: { email: () => 'demo@example.com' } },
      ],
    });

    service = TestBed.inject(ActivityLogService);
  });

  it('registra la actividad con la acción, entidad y actor', () => {
    service.log('create', 'product', 1, 'Producto creado');

    expect(documents.add).toHaveBeenCalledTimes(1);
    const [collection, data] = documents.add.mock.calls[0] as [string, ActivityData];
    expect(collection).toBe('activity');
    expect(data).toMatchObject({
      action: 'create',
      entity: 'product',
      entityId: 1,
      summary: 'Producto creado',
      actor: 'demo@example.com',
    });
    expect(typeof data.at).toBe('string');
  });

  it('no interrumpe la operación si el registro falla', () => {
    documents.add.mockReturnValue(throwError(() => new Error('sin conexión')));

    expect(() => service.log('delete', 'customer', 2, 'Cliente eliminado')).not.toThrow();
  });

  it('expone el feed y las novedades en vivo', async () => {
    await expect(firstValueFrom(service.latest(10))).resolves.toEqual([RECORD]);
    expect(documents.latest).toHaveBeenCalledWith('activity', 10);

    expect(documents.changes$).toBeDefined();
    service.changes$().subscribe();
    expect(documents.changes$).toHaveBeenCalledWith('activity');
  });
});
