import { TestBed } from '@angular/core/testing';
import type { SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom, of } from 'rxjs';

import type { ActivityData, DocumentRecord } from '../../models/document.model';
import { SUPABASE_CLIENT } from '../../supabase/supabase.token';
import { RestClient } from '../sql/rest-client';

import { SupabaseDocumentStore } from './supabase-document-store';

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

describe('SupabaseDocumentStore', () => {
  let rest: { create: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
  let supabase: { channel: ReturnType<typeof vi.fn>; removeChannel: ReturnType<typeof vi.fn> };
  let store: SupabaseDocumentStore;
  let realtimeHandler: ((payload: { new: unknown }) => void) | undefined;
  let statusHandler: ((status: string) => void) | undefined;
  let realtimeChannel: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    realtimeHandler = undefined;
    statusHandler = undefined;

    realtimeChannel = {
      on: vi.fn((_type: string, _filter: unknown, callback: (payload: { new: unknown }) => void) => {
        realtimeHandler = callback;
        return realtimeChannel;
      }),
      subscribe: vi.fn((callback: (status: string) => void) => {
        statusHandler = callback;
        // Supabase devuelve el propio canal para poder encadenar llamadas.
        return realtimeChannel;
      }),
    };

    supabase = {
      channel: vi.fn(() => realtimeChannel),
      removeChannel: vi.fn().mockResolvedValue('ok'),
    };

    rest = {
      create: vi.fn(() => of(RECORD)),
      list: vi.fn(() => of([RECORD])),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: RestClient, useValue: rest },
        { provide: SUPABASE_CLIENT, useValue: supabase as unknown as SupabaseClient },
      ],
    });

    store = TestBed.inject(SupabaseDocumentStore);
  });

  it('inserta documentos por REST', async () => {
    const { id: _id, collection: _collection, created_by: _by, created_at: _at, ...data } = RECORD;
    await expect(firstValueFrom(store.add('activity', data.data))).resolves.toEqual(RECORD);
    expect(rest.create).toHaveBeenCalledWith('documents', { collection: 'activity', data: data.data });
  });

  it('recupera los últimos documentos de una colección', async () => {
    await expect(firstValueFrom(store.latest('activity', 5))).resolves.toEqual([RECORD]);
    expect(rest.list).toHaveBeenCalledWith('documents', {
      filters: { collection: 'eq.activity' },
      order: 'created_at.desc',
      limit: 5,
    });
  });

  it('emite los INSERT de la colección por Realtime', async () => {
    const received: DocumentRecord<ActivityData>[] = [];
    const subscription = store.changes$<ActivityData>('activity').subscribe((record) => received.push(record));

    expect(supabase.channel).toHaveBeenCalledWith('documents:activity');
    realtimeHandler?.({ new: RECORD });

    expect(received).toEqual([RECORD]);
    subscription.unsubscribe();
  });

  it('elimina el canal al cancelar la suscripción', () => {
    const subscription = store.changes$('activity').subscribe();
    subscription.unsubscribe();

    expect(supabase.removeChannel).toHaveBeenCalledWith(realtimeChannel);
  });

  it('propaga un error legible si el canal falla', () => {
    const errors: Error[] = [];
    store.changes$('activity').subscribe({ error: (error: Error) => errors.push(error) });

    statusHandler?.('CHANNEL_ERROR');
    expect(errors[0].message).toContain('tiempo real');
  });
});
