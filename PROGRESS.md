# PROGRESS.md · Proyecto DI 0488

## Estado general
<<<<<<< HEAD
- Fase actual: F4 · Funcionalidades y formularios (RA2) — mitad F4a (productos y clientes) completada; falta F4b (pedidos y cierre)
- Rama de trabajo: fix/list-sort-after-create (fix de listas y refresco tras el alta)
=======
- Fase actual: F4 · Funcionalidades y formularios (RA2) — completada (F4a y F4b); pendiente de validación de lint/test/build por el usuario
- Rama de trabajo: feature/f4b-orders
>>>>>>> origin/develop
- Fecha inicio F0: 2026-10-28
- Fecha fin F0: 2026-10-28
- Fecha inicio F1: 2026-10-28
- Fecha fin F1: 2026-10-28
- Fecha inicio F2: 2026-10-29
- Fecha fin F2: 2026-10-29
- Fecha inicio F3: 2026-10-29
- Fecha fin F3: 2026-10-29
- Fecha inicio F4a: 2026-10-29
- Fecha fin F4a: 2026-10-29
- Fecha inicio F4b: 2026-10-30
- Fecha fin F4b: 2026-10-30

## Checklist de fases
- [x] F0 · Base del proyecto
- [x] F1 · Auth, rutas y control de acceso (RA1)
- [x] F2 · Capa de datos asíncrona (RA5)
- [x] F3 · Componentes reutilizables (RA3)
- [x] F4 · Funcionalidades y formularios (RA2)
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
- F4a: `uniqueFieldValidator(api, column, excludeId?)` en `shared/validators`: espera 400 ms (`debounceTime`), cancela la comprobación anterior (`switchMap`) y no bloquea el formulario si la API falla (`catchError`). El control queda en `PENDING` mientras consulta. `ProductsApi`/`CustomersApi` exponen `exists()` para que el validador sea agnóstico.
- F4a: `ProductsStore` incluye las categorías del formulario (`loadCategories`), que se cargan una sola vez por sesión.
- F4a: `app-data-table` gana `selectable` y `exportable` (ambos por defecto `true`) y oculta la columna de acciones cuando ningún botón aplica. En productos/clientes se desactivan detalle y exportación (esta última llega en F6); así no quedan botones sin efecto.
- F4a: productos y clientes usan un formulario reactivo tipado (`NonNullableFormBuilder`) en un `ion-modal`. Errores tras `touched` o envío, `aria-invalid`/`aria-describedby`, foco en el primer campo inválido, spinner en el botón, toast de resultado y confirmación con `AlertController` antes de borrar. El estado del formulario se repinta con una señal que escucha `statusChanges` (OnPush + zoneless).
- F4a: el email se normaliza a minúsculas en el formulario y en `CustomersApi`; el validador de edición excluye el propio `id`. Los duplicados que devuelve PostgREST (`23505`) ya se traducen a un mensaje amigable en `errorInterceptor` y se muestran en el toast.
- F4a: cada alta, edición y borrado registra actividad desde los stores (`ActivityLogService`).
- F4a: `test-setup.ts` parchea `adoptedStyleSheets` también en `ShadowRoot` (jsdom lo expone como `undefined`) para que las páginas con componentes Ionic se puedan montar en Vitest.
- F4a: comprobación de Supabase con la clave pública: `/auth/v1/health` responde 200 y `/rest/v1/{categories,products,customers,v_kpis}` responden 200. Sin sesión devuelven `[]`/ceros porque las políticas RLS son `to authenticated`; no hay credenciales demo en `.env` para verificar la carga autenticada.
<<<<<<< HEAD
- Fix listas: `RestClient.listAll` recupera **todas** las filas con bloques `Range` + `Prefer: count=exact`, usando el total de `Content-Range` y parando en el último bloque (o ante `416`). Los stores ya no piden una página de 25: cargan la lista completa y crean/editan/borran en memoria sin recargar. La búsqueda, la ordenación y la paginación (`pageSize`) son solo de la tabla, en cliente.
=======
- F4b: `OrdersPage` (`/orders`, accesible a ambos roles) usa `app-data-table` en modo solo lectura y `OrdersStore` para datos reales; el nombre del cliente llega en el `select` embebido (`*,customers(full_name)`) y el estado se traduce al español en una fila derivada (`computed`).
- F4b: el filtro por estado es el componente propio `app-order-status-filter`, que expone `value = model<OrderStatus | null>()`; la página lo enlaza con `[(value)]` y recarga con `OrdersStore.setStatus`. El buscador de `app-data-table` mantiene `[(ngModel)]`.
- F4b: se elimina la página temporal `/components-demo` (ruta, carpeta y entrada de menú); el menú incorpora «Pedidos» con icono `cart-outline`.
- F4b: revisión de los formularios de F4a. `showError()`/`isPending()` se repintan ahora suscribiéndose a `control.events` (valor, estado, pristine y touched) en lugar de solo `statusChanges`, de modo que el error aparece al abandonar un campo obligatorio vacío aunque su estado de validez no cambie. Se mantienen los errores tras `touched`/envío, `aria-invalid`, `aria-describedby`, el foco al primer campo inválido y el spinner del botón.
- F4b: tests nuevos de `OrdersPage` (carga, cliente, estado traducido, ausencia de acciones de escritura, filtro y error) y de `OrderStatusFilterComponent` (opciones, valor de `model()` y emisión al cambiar).
>>>>>>> origin/develop

## Bitácora
- 2026-10-28: Creado PROGRESS.md. Inicio F0. Leídos AGENTS.md y 01_schema.sql.
- 2026-10-28: F0 completado - dependencias, scripts de entorno, .gitignore/.env.example, lint+test+build OK. Commit y merge a develop.
- 2026-10-28: F1 completado - auth (cliente, modelos, service/store, initializer, guards canActivate/canMatch, interceptores), shell con menú por rol/skip-link, rutas lazy, redirecciones. Lint/test/build OK. Merge a develop.
- 2026-10-28: Correcciones F1 (fix/f1-calidad) - prettier, provideIonicAngular, vitest inline, tests de guards/interceptores/AuthStore, lint/test/build OK.
- 2026-10-29: Fix del logout (fix/logout-redirect, PR #1) - `AuthSessionService`, redirección con `replaceUrl`, reacción a `SIGNED_OUT`, shell oculto sin sesión, tests (25). Lint/test/build OK.
- 2026-10-29: F2 completado - modelos, `RestClient`, APIs (products, categories, customers, orders, dashboard), `DocumentStore` + Realtime, `ActivityLogService`, stores de feature y tests con `HttpTestingController` (59 tests). Lint/test/build OK.
- 2026-10-29: F3 completado - modelos compartidos y cinco componentes reutilizables (`app-data-table`, `app-stat-card`, `app-chart`, `app-empty-state`, `app-activity-feed`) con TSDoc y 3+ tests cada uno; página temporal `/components-demo` solo para admin. Lint/test/build OK (83 tests).
- 2026-10-29: F4a completada - pantallas de productos y clientes con datos reales, formularios modales, validador asíncrono de SKU/email, confirmación de borrado, toasts y actividad; tests de validador y de visibilidad por rol (96 tests). Lint/test/build OK. Pendiente F4b: pedidos y retirada de `/components-demo`.
<<<<<<< HEAD
- 2026-10-30: Fix `fix/list-sort-after-create` - causa: el `pageSize` de 25 de los stores llegaba a `RestClient.page` y solo se cargaba un bloque; la tabla buscaba, ordenaba y paginaba sobre esas 25 filas, y el alta quedaba fuera si no entraba en la primera página por nombre. Ahora `RestClient.listAll` trae todos los bloques, los stores cargan la lista completa y las altas/ediciones/borrados se aplican en memoria. Tests: carga por bloques, orden sobre el total y alta visible sin búsqueda.
=======
- 2026-10-30: F4b completada - listado de pedidos de solo lectura con datos reales y filtro por estado mediante un componente con `model()`, menú con «Pedidos», retirada de `/components-demo`, revisión del repintado de errores de los formularios de F4a y tests nuevos de pedidos y del filtro. Pendiente de que el usuario ejecute lint/test/build.
>>>>>>> origin/develop
