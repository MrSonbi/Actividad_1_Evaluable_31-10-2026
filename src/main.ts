import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { inject, isDevMode, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import {
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
  PreloadAllModules,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { authInitializer } from './app/core/auth/auth.initializer';
import { authInterceptor } from './app/core/http/auth.interceptor';
import { errorInterceptor } from './app/core/http/error.interceptor';
import { ThemeService } from './app/shared/utils/theme.service';

bootstrapApplication(AppComponent, {
  providers: [
    provideIonicAngular({ animated: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
    provideAppInitializer(authInitializer),
    // Aplica el tema antes de pintar la primera pantalla.
    provideAppInitializer(() => {
      inject(ThemeService);
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
});
