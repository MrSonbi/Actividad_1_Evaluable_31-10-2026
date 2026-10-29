# PROGRESS.md · Proyecto DI 0488

## Estado general
- Fase actual: F3 · Componentes reutilizables (RA3) completada
- Rama de trabajo: feature/f3-components
- Fecha inicio F0: 2026-10-28
- Fecha fin F0: 2026-10-28
- Fecha inicio F1: 2026-10-28
- Fecha fin F1: 2026-10-28
- Fecha inicio F2: 2026-10-29
- Fecha fin F2: 2026-10-29
- Fecha inicio F3: 2026-10-29
- Fecha fin F3: 2026-10-29

## Checklist de fases
- [x] F0 · Base del proyecto
- [x] F1 · Auth, rutas y control de acceso (RA1)
- [x] F2 · Capa de datos asíncrona (RA5)
- [x] F3 · Componentes reutilizables (RA3)
- [ ] F4 · Funcionalidades y formularios (RA2)
- [ ] F5 · Dashboard (solo admin) (RA5)
- [ ] F6 · Informes PDF y CSV (RA5)
- [ ] F7 · Accesibilidad, responsive y PWA (RA4)
- [ ] F8 · Documentación (RA6)
- [ ] F9 · CI/CD y despliegue (RA7)
- [ ] F10 · Cierre

## Decisiones
- Ionic Angular standalone con plantilla sidemenu (estructura existente adaptada).
- Entorno con `scripts/set-env.mjs` (prestart/prebuild/pretest). `.env` y `environment.ts` en `.gitignore`. Commiteados `.env.example` y `environment.example.ts`.
- Añadidas dependencias: `@supabase/supabase-js`, `@ngrx/signals`, `chart.js`, `jspdf`, `jspdf-autotable`, `@compodoc/compodoc` (dev), `@angular/pwa` (dev).
- Corregido entorno: sin fileReplacements, único `environment.ts` generado con `--prod` en prebuild, sin claves versionadas.
- Añadido `provideIonicAngular()` en `main.ts`. Vitest config con `server.deps.inline` para Ionic. Tests de guards/interceptores/AuthStore añadidos.
- `AuthSessionService` centraliza el cierre de sesión y la reacción a `SIGNED_OUT` (logout en otra pestaña o token caducado): limpia el store y navega a `/login` con `replaceUrl: true`. El shell no renderiza nada sin sesión.
- `npm test` ejecuta los tests unitarios sin watch (`ng test --watch=false`). Los e2e (`playwright`) se lanzan aparte con `npm run test:e2e`; el spec actual es del starter y se reescribirá en F7.
- `.gitattributes` con `eol=lf`: evita que Prettier falle en Windows cuando `core.autocrlf=true`.
- F2: `RestClient` genérico sobre PostgREST (`select`, filtros, `order`, `Range` + `Prefer: count=exact`, `Prefer: return=representation`), con `retry` y backoff exponencial solo en GET.
- F2: los errores PostgREST `23505` (duplicado) y `42501` (permisos) se traducen a `ApiError` con mensaje en español en `errorInterceptor`.
- F2: `DocumentStore` es una interfaz con token `DOCUMENT_STORE`; `SupabaseDocumentStore` usa REST para `add`/`latest` y Realtime para `changes$` (elimina el canal en el teardown).
- F2: los stores de feature (`ProductsStore`, `CustomersStore`, `OrdersStore`) exponen lista, total, loading, error, filtros, paginación y CRUD; cada escritura llama a `ActivityLogService`.
- F3: componentes standalone y `OnPush` en `src/app/shared/components`: `app-data-table<T>` (buscador, ordenación, paginación, exportación y acciones), `app-stat-card`, `app-chart`, `app-empty-state` y `app-activity-feed`. Solo usan `input()`/`output()`; no inyectan stores de features.
- F3: `app-data-table` usa `[(ngModel)]` para el buscador, muestra `<caption>`, `aria-sort`, región `aria-live` con el número de resultados y filas en tarjetas con `data-label` en móvil.
- F3: `app-chart` envuelve Chart.js directamente, actualiza/recrea el gráfico con `effect()` y **destruye la instancia en `ngOnDestroy`**. Incluye `<canvas role="img">` y resumen textual oculto.
- F3: los iconos de `app-stat-card`/`app-empty-state` se pintan con `ion-icon` como elemento personalizado (`CUSTOM_ELEMENTS_SCHEMA`) para no acoplar los componentes a `@ionic/angular` y poder testearlos en jsdom.
- F3: `src/test-setup.ts` define `document.adoptedStyleSheets` (jsdom no lo implementa) para que los componentes de Ionic puedan inicializarse en tests futuros.
- F3: página temporal `/components-demo` (solo admin, con `canActivate` + `canMatch`) y entrada de menú visible únicamente para administradores.
- F3: tests de los cinco componentes (búsqueda, ordenación, paginación, acciones, estados de carga/vacío, creación/actualización/destrucción del gráfico y emisión de puntos). Total: 83 tests.

## Bitácora
- 2026-10-28: Creado PROGRESS.md. Inicio F0. Leídos AGENTS.md y 01_schema.sql.
- 2026-10-28: F0 completado - dependencias, scripts de entorno, .gitignore/.env.example, lint+test+build OK. Commit y merge a develop.
- 2026-10-28: F1 completado - auth (cliente, modelos, service/store, initializer, guards canActivate/canMatch, interceptores), shell con menú por rol/skip-link, rutas lazy, redirecciones. Lint/test/build OK. Merge a develop.
- 2026-10-28: Correcciones F1 (fix/f1-calidad) - prettier, provideIonicAngular, vitest inline, tests de guards/interceptores/AuthStore, lint/test/build OK.
- 2026-10-29: Fix del logout (fix/logout-redirect, PR #1) - `AuthSessionService`, redirección con `replaceUrl`, reacción a `SIGNED_OUT`, shell oculto sin sesión, tests (25). Lint/test/build OK.
- 2026-10-29: F2 completado - modelos, `RestClient`, APIs (products, categories, customers, orders, dashboard), `DocumentStore` + Realtime, `ActivityLogService`, stores de feature y tests con `HttpTestingController` (59 tests). Lint/test/build OK.
- 2026-10-29: F3 completado - modelos compartidos y cinco componentes reutilizables (`app-data-table`, `app-stat-card`, `app-chart`, `app-empty-state`, `app-activity-feed`) con TSDoc y 3+ tests cada uno; página temporal `/components-demo` solo para admin. Lint/test/build OK (83 tests).
