import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { ApiError } from '../http/api-error';
import type { Customer } from '../models/customer.model';

import { ActivityLogService } from './activity-log.service';
import { CustomersStore } from './customers.store';
import { CustomersApi } from './sql/customers.api';

const CUSTOMER: Customer = {
  id: 1,
  full_name: 'Ana Pérez',
  email: 'ana.perez@example.com',
  phone: '600000000',
  city: 'Valencia',
  created_at: '2026-01-01T00:00:00Z',
};

const CREATED: Customer = {
  id: 2,
  full_name: 'Luis Gómez',
  email: 'luis.gomez@example.com',
  phone: null,
  city: 'Sevilla',
  created_at: '2026-02-01T00:00:00Z',
};

/** Directorio ficticio de 30 clientes, como el del entorno real. */
const DIRECTORY: Customer[] = Array.from({ length: 30 }, (_, index) => ({
  ...CUSTOMER,
  id: index + 1,
  full_name: `Cliente ${String(index + 1).padStart(2, '0')}`,
  email: `cliente${index + 1}@example.com`,
}));

describe('CustomersStore', () => {
  let api: {
    listAll: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let activity: { log: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof CustomersStore>;

  beforeEach(() => {
    api = {
      listAll: vi.fn(() => of(DIRECTORY)),
      create: vi.fn(() => of(CREATED)),
      update: vi.fn(() => of(CUSTOMER)),
      remove: vi.fn(() => of(undefined)),
    };
    activity = { log: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        { provide: CustomersApi, useValue: api },
        { provide: ActivityLogService, useValue: activity },
      ],
    });

    store = TestBed.inject(CustomersStore);
  });

  it('carga el directorio completo, no solo la primera página', async () => {
    await store.load();

    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(store.items()).toHaveLength(30);
    expect(store.total()).toBe(30);
    expect(store.loading()).toBe(false);
    expect(store.isEmpty()).toBe(false);
  });

  it('guarda el mensaje de error si la carga falla', async () => {
    api.listAll.mockReturnValue(throwError(() => new ApiError('Sin conexión', 0)));

    await store.load();

    expect(store.error()).toBe('Sin conexión');
    expect(store.loading()).toBe(false);
    expect(store.hasError()).toBe(true);
  });

  it('inserta el alta al principio de la lista sin recargar el directorio', async () => {
    await store.load();

    const created = await store.create({
      full_name: 'Luis Gómez',
      email: 'luis.gomez@example.com',
      phone: null,
      city: 'Sevilla',
    });

    expect(created).toBe(true);
    expect(store.items()[0]).toEqual(CREATED);
    expect(store.total()).toBe(31);
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('create', 'customer', 2, 'Cliente creado: Luis Gómez');
  });

  it('reemplaza la fila editada sin recargar el directorio', async () => {
    await store.load();
    api.update.mockReturnValue(of({ ...CUSTOMER, city: 'Madrid' }));

    const updated = await store.update(1, { city: 'Madrid' });

    expect(updated).toBe(true);
    expect(store.items()).toHaveLength(30);
    expect(store.items()[0]).toMatchObject({ id: 1, city: 'Madrid' });
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('update', 'customer', 1, 'Cliente actualizado: Ana Pérez');
  });

  it('elimina la fila de la lista sin recargar el directorio', async () => {
    await store.load();

    const removed = await store.remove(CUSTOMER);

    expect(removed).toBe(true);
    expect(store.items()).toHaveLength(29);
    expect(store.items().some((customer) => customer.id === CUSTOMER.id)).toBe(false);
    expect(api.listAll).toHaveBeenCalledTimes(1);
    expect(activity.log).toHaveBeenCalledWith('delete', 'customer', 1, 'Cliente eliminado: Ana Pérez');
  });
});
