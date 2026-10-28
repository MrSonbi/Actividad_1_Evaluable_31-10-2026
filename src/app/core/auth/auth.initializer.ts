import { inject } from '@angular/core';

import { AuthStore } from './auth.store';

export function authInitializer(): Promise<void> {
  const store = inject(AuthStore);
  return store.init();
}
