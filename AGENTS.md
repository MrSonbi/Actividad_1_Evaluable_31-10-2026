# AGENTS.md · Proyecto DI 0488 · Sistema de Gestión de Inventario y Pedidos

Eres un ingeniero frontend senior. Construye ESTE proyecto completo siguiendo las fases F0→F10 en orden.
Lee este archivo al inicio de cada sesión y consulta `PROGRESS.md` para saber por dónde vas.

## 0. Reglas de trabajo (obligatorias)
1. Trabaja por fases, una rama `feature/fN-nombre` por fase, desde `develop`. Al acabar: commits pequeños con push, abre el PR hacia `develop` con `gh pr create` y PARA. NO fusiones el PR ni empieces la siguiente fase: el usuario prueba y lo fusiona él, y te pedirá la siguiente. Actualiza `PROGRESS.md` en la rama. Está PROHIBIDO ejecutar `gh pr merge` o `git merge` hacia `develop` o `main`: eso lo hace siempre el usuario después de probar. Si ves un PR abierto, no lo fusiones.
2. Bloqueos (para y pregunta al usuario SOLO en estos casos): falta `.env` o está vacío; falla `git push` por credenciales; una acción destructiva fuera del proyecto.
3. Nunca inventes URLs, claves ni versiones. Si dudas de una API (Ionic standalone, NgRx Signals, Chart.js, jsPDF-AutoTable, Compodoc) consulta la documentación oficial con `webfetch`.
4. No hagas más de lo pedido ni refactorices fuera de la fase actual.
5. Windows-compatible: scripts de `package.json` en Node (`.mjs`), nada de comandos bash.
6. Idioma: interfaz y documentación en español (es-ES); identificadores de código en inglés; comentarios TSDoc en español.
7. TypeScript `strict`, sin `any`, sin `console.log` en el código final, ESLint sin errores.
8. NO ejecutes lint, test ni build, ni pegues sus salidas: los ejecuta el usuario. Sí escribe los archivos .spec.ts de cada pieza. Termina cada fase con un resumen corto de qué archivos creaste o cambiaste, y no declares "verificado" nada que no hayas ejecutado.
9. Listados: los stores descargan la lista COMPLETA con `RestClient.listAll` (en bloques con `Range`) y `app-data-table` busca, ordena y pagina en el cliente. No pagines ni busques en el servidor. Tras crear, editar o borrar, actualiza el estado del store sin perder la ordenación ni la página de la tabla.
10. `PROGRESS.md` debe reflejar el estado real: una fase solo se marca "PR abierto" hasta que el usuario la fusione. Nunca escribas "fusionada" ni "verificada".

## 1. Qué es
App de gestión empresarial (productos, clientes, pedidos) con login y 2 roles: **admin** y **user**. Debe ser PWA, accesible (WCAG AA), responsive mobile-first, desplegada en Vercel.
Repo: https://github.com/MrSonbi/Actividad_1_Evaluable_31-10-2026 (ya clonado; trabaja en la raíz).

## 2. Stack (decisiones cerradas)
- Ionic + Angular **standalone** (sin NgModules ni `IonicModule`; importa componentes de `@ionic/angular/standalone` y registra iconos con `addIcons`). Usa las últimas versiones estables compatibles entre sí. Mantén la detección de cambios global que traiga el starter; en componentes usa `OnPush` + signals.
- Plantillas con control flow nuevo (`@if`, `@for` con `track`), `input()`, `output()`, `model()`.
- Estado: **NgRx SignalStore** (`@ngrx/signals`) para auth y para cada feature. Flujo unidireccional: vista → método del store → servicio → `patchState` → signals. Si hay incompatibilidad de versiones, usa NgRx Store clásico.
- Backend: **Supabase** (ya creado por el usuario; NO crees tablas, datos ni usuarios).
  - `@supabase/supabase-js` SOLO para Auth (sesión) y Realtime.
  - Los datos SQL se consumen por **REST con `HttpClient`** contra `${SUPABASE_URL}/rest/v1` (PostgREST), con interceptores.
- Gráficos: `chart.js` directo (wrapper propio, sin ng2-charts). PDF: `jspdf` + `jspdf-autotable`. CSV: utilidad propia.
- Docs: Compodoc. CI: GitHub Actions. Hosting: Vercel.

## 3. Modelo de datos (existe ya; fuente de verdad: `supabase/01_schema.sql`, léelo)
- `profiles(id, email, full_name, role 'admin'|'user')`
- `categories(id, name)`; `products(id, sku unique, name, category_id, price, stock, created_at)`
- `customers(id, full_name, email unique lowercase, phone, city, created_at)`
- `orders(id, customer_id, status 'pending'|'paid'|'shipped'|'cancelled', total, created_at)`
- `documents(id, collection, data jsonb, created_by, created_at)` → "NoSQL" simulada (colección `activity`) con Supabase Realtime.
- Vistas: `v_kpis` (total_products, total_customers, total_orders, total_revenue, low_stock_products) y `v_products_by_category`.
- Permisos (RLS): todos los autenticados leen; `products/categories/orders` solo escribe admin; `customers` lo crean/editan ambos y solo admin borra; `documents` se leen todos e insertan con `created_by = auth.uid()`.
- Duplicar emails/SKU lanza error PostgREST `23505`; permisos `42501`. Mapea ambos a mensajes amigables.

## 4. Arquitectura (estructura sugerida)
```
src/app/
  core/        config(env) · supabase(client token) · auth(AuthService, AuthStore, guards) · http(interceptors)
               data/sql(RestClient + *Api) · data/documents(DocumentStore interface + SupabaseDocumentStore) · models
  shared/      components(data-table, stat-card, chart, empty-state, activity-feed) · validators · utils(report: csv/pdf)
  layout/      shell (ion-split-pane + ion-menu, skip-link)
  features/    auth(login) · dashboard · products · customers · orders · help
```
Rutas: `login` (guestGuard) · shell `''` (authGuard) con hijas lazy (`loadComponent`/`loadChildren`): `dashboard` (solo admin), `products`, `customers`, `orders`, `help`; `forbidden`; `**` 404. Tras login: admin → `/dashboard`, user → `/products`.
Las rutas de admin usan `canMatch` (el chunk ni se descarga para otros roles) además de `canActivate`.

## 5. Fases

### F0 · Base del proyecto
Comprueba `node -v`, `git status`. Asegura ramas `main` y `develop`; trabaja en `feature/f0-setup` (cada fase en su `feature/fN-nombre`, desde `develop`).
Genera Ionic Angular standalone con plantilla sidemenu (`ionic start` con tipo `angular-standalone`; si falla por carpeta no vacía, genera en carpeta temporal y mueve todo a la raíz respetando `.git` y `README.md`).
Añade: `@supabase/supabase-js`, `@ngrx/signals`, `chart.js`, `jspdf`, `jspdf-autotable`, `angular-eslint`, `@compodoc/compodoc` (dev), `@angular/pwa`.
Entorno: `scripts/set-env.mjs` genera `src/environments/environment.ts` desde `SUPABASE_URL` y `SUPABASE_KEY` (variables de entorno o `.env`), ejecutado en `prestart`, `prebuild` y `pretest`. `.env` y `environment.ts` en `.gitignore`; commitea `.env.example` (valores vacíos) y `environment.example.ts`.
`.gitignore`, `.editorconfig`, `engines` en package.json. Commit: chore: andamiaje Ionic Angular standalone.

### F1 · Auth, rutas y control de acceso (RA1)
- Cliente Supabase (InjectionToken + factory) con `persistSession` y `autoRefreshToken`.
- `AuthService` (signIn con email/password, signOut) y `AuthStore` (user, profile, role, initialized, loading, error; computed `isAdmin`). `provideAppInitializer` restaura la sesión y carga el perfil (`GET profiles?id=eq.<uid>`) ANTES del primer enrutado.
- Guards funcionales: `authGuard`, `guestGuard`, `roleGuard(['admin'])` (versiones `canActivate` y `canMatch`). Esperan a `initialized`.
- Interceptores (`provideHttpClient(withInterceptors([...]))`): `authInterceptor` (solo para `SUPABASE_URL`: cabeceras `apikey` = SUPABASE_KEY y `Authorization: Bearer <access_token>` si hay sesión; sin sesión solo `apikey`) y `errorInterceptor` (normaliza errores, 401 → cierra sesión y va a login con aviso, red caída, 403).
- Shell: `ion-split-pane` (menú fijo en ≥ lg, desplegable en móvil), menú con ítems por rol, nombre/rol del usuario, botón cerrar sesión, skip-link "Saltar al contenido".
- `LoginPage`: formulario reactivo tipado, validación síncrona, estado de carga, errores con `role="alert"`.
- Tests: guards, interceptores, AuthStore.

### F2 · Capa de datos asíncrona (RA5)
- `RestClient` genérico (list/get/create/update/remove, `select`, filtros PostgREST, `order`, paginación con `Range`/`Prefer: count=exact`, `Prefer: return=representation`). `retry` con backoff solo en GET.
- APIs tipadas: `ProductsApi`, `CategoriesApi`, `CustomersApi`, `OrdersApi`, `DashboardApi` (vistas).
- `DocumentStore` (interfaz) + `SupabaseDocumentStore`: `add(collection, data)`, `latest(collection, n)` (REST) y `changes$(collection)` (Observable sobre Realtime `postgres_changes` INSERT, con teardown `removeChannel`). Debe poder sustituirse por otra implementación (p. ej. Firestore) sin tocar el resto.
- `ActivityLogService`: registra en la colección `activity` cada alta/edición/borrado (acción, entidad, id, resumen, email del actor).
- Stores: `ProductsStore`, `CustomersStore`, `OrdersStore` (lista, loading, error, filtros, CRUD).
- Opcional: si existen `DEMO_ADMIN_EMAIL`/`DEMO_ADMIN_PASSWORD` en `.env`, crea `scripts/smoke-supabase.mjs` que inicia sesión por `/auth/v1/token?grant_type=password` y comprueba endpoints y RLS. Sin ellas, omítelo.
- Tests con `HttpTestingController`.

### F3 · Componentes reutilizables (RA3)
Standalone, `OnPush`, agnósticos (solo `input()`/`output()`/`model()`, sin inyectar stores de features), con TSDoc y ≥3 tests cada uno:
1. `app-data-table<T>`: `columns` (key, label, type, sortable), `rows`, `loading`, `pageSize`; buscador con `[(ngModel)]`, ordenación, paginación; outputs `rowSelect`, `edit`, `remove`, `exportRequested('csv'|'pdf')`, `searchChange`. A11y: `<caption>`, `th scope`, `aria-sort`, botones de ordenar, región `aria-live="polite"` con nº de resultados. Móvil: filas como tarjetas (CSS con `data-label`) o scroll horizontal accesible.
2. `app-stat-card` (título, valor, icono, tendencia opcional).
3. `app-chart` (wrapper de Chart.js: `type`, `data`, `options`, `ariaLabel`; output `pointSelect`; actualiza en cambios; **destruye el gráfico en `ngOnDestroy`**; `<canvas role="img">` + resumen textual/tabla oculta visualmente).
4. `app-empty-state` y `app-activity-feed` (lista en vivo, `aria-live="polite"`).

### F4 · Funcionalidades y formularios (RA2)
- Productos: listado (ambos roles), alta/edición/borrado solo admin (botones ocultos por rol; la BD ya lo impone).
- Clientes: listado, alta y edición (ambos roles), borrado solo admin.
- Pedidos: listado de solo lectura con filtro por estado.
- Formularios reactivos tipados (`NonNullableFormBuilder`). **Validadores asíncronos** `uniqueFieldValidator(api, column, excludeId?)` para email de cliente (normaliza a minúsculas) y SKU de producto: debounce 400 ms, `switchMap`, `catchError`, estado `PENDING` visible (spinner + `aria-busy`).
- UX: errores tras `touched`/envío, `aria-invalid` y `aria-describedby`, foco al primer campo inválido, spinner en el botón, toast de éxito/error, confirmación (`AlertController`) antes de borrar. Usa `label`/`labelPlacement` de `ion-input`.
- Binding bidireccional controlado (`[(ngModel)]` en buscador, `model()` en componente propio).
- Cada operación CRUD registra actividad (ActivityLogService).

### F5 · Dashboard (solo admin) (RA5)
- Carga inicial con `forkJoin({ kpis, byCategory, orders12m, latestActivity })`, spinner y estado de error con botón "Reintentar".
- KPIs con `app-stat-card`; gráficos: líneas (ingresos por mes), rosquilla (pedidos por estado), barras (productos/stock por categoría).
- Filtros en tiempo real (periodo 3/6/12 meses y estado) como `signal` + `computed`, sin volver a pedir datos.
- Feed de actividad en vivo vía Realtime (`NgZone.run` si hace falta) y contador en la barra superior.
- Exportar resumen del dashboard (PDF/CSV).

### F6 · Informes PDF y CSV (RA5)
`ReportService`: `exportCsv(columns, rows, filename)` (UTF-8 con BOM, separador `;`, escapado correcto) y `exportPdf({ title, subtitle, columns, rows, filename })` con jsPDF-AutoTable (cabecera con título y fecha, usuario que genera, filas alternas, pie "Página X de Y"). Botones en listados (exportan TODAS las filas filtradas) y en dashboard. Tests del CSV.

### F7 · Accesibilidad, responsive y PWA (RA4)
- Paleta con contraste ≥ 4.5:1 (texto) y ≥ 3:1 (componentes); verifícalo. Tamaños en `rem`, respeta el zoom/tamaño del usuario; modo oscuro del sistema; `prefers-reduced-motion`.
- `lang="es"`, `<title>` por ruta, landmarks (`nav`, `main`), jerarquía de encabezados correcta, orden de tabulación natural (NUNCA `tabindex` positivo), foco visible (`:focus-visible`), todo operable por teclado, Escape cierra modales, botones solo-icono con `aria-label`, `aria-current="page"` en el menú, errores con `role="alert"`, estados de carga con `aria-busy`.
- Grid de Ionic (`ion-grid`/`ion-col` con `size`, `size-md`, `size-lg`) y Flexbox, mobile-first, sin scroll horizontal de página.
- PWA: `ng add @angular/pwa` (manifest con iconos, service worker solo en producción).
- Deja preparado `npm run lighthouse` (npx lighthouse sobre la build servida en local, para `/login`, informes en `docs/lighthouse/`) pero NO lo ejecutes: lo ejecuta el usuario y te pasa los fallos para corregirlos. Cero errores en consola en producción. Al final, indica al usuario cómo medir las pantallas autenticadas con Chrome DevTools.

### F8 · Documentación (RA6)
- TSDoc en todas las clases, métodos públicos, inputs y outputs.
- `npm run docs` → Compodoc a `docs/compodoc/` (soporta standalone; commitea la carpeta generada).
- `docs/MANUAL_USUARIO.md` (por rol, paso a paso, con apartados por pantalla) y página `/help` en la app (acordeón por secciones + ayuda contextual) con el mismo contenido.
- `README.md`: descripción, stack, requisitos, instalación, variables de entorno, scripts, estructura, flujo Git, despliegue, enlaces a docs. NO incluyas contraseñas: las credenciales demo se entregan en el PDF.

### F9 · CI/CD y despliegue (RA7)
- `vercel.json`: `outputDirectory` = carpeta REAL de salida del build (compruébala), `buildCommand`, y `rewrites` de `/(.*)` a `/index.html` para que las rutas profundas no den 404. NO desactives los despliegues automáticos de Vercel.
- `.github/workflows/ci.yml` (PR y push a `develop`/`main`): install → lint → tests (sin watch, headless) → build, con `SUPABASE_URL`/`SUPABASE_KEY` ficticios; job `docs` que genera Compodoc y lo sube como artefacto.
- `.github/workflows/deploy.yml` (push a `main`): job `test` y job `deploy` con `needs: test` usando Vercel CLI y los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`; que se omita limpiamente si los secrets no existen. Documenta en el README cómo activarlo.
- Git Flow: `main` ← PR ← `develop` ← PR ← `feature/*`. Abre cada PR con `gh pr create` y NO lo fusiones (regla 1): lo fusiona siempre el usuario. Commits pequeños y frecuentes (≥ 4 por fase) con Conventional Commits en español (`feat(auth): añade guard por rol`). `git push` tras cada commit. Prohibido `push --force` y reescribir historial.
- Al terminar: abre el PR `develop` → `main` y propón el tag `v1.0.0`; el usuario lo fusiona y lo crea.

### F10 · Cierre
Crea `ENTREGA.md` con plantilla de los 5 entregables (URL repo, URL producción, credenciales: "ver PDF", informe Lighthouse, documentación) y resume en el chat: qué falta por hacer al usuario (variables en Vercel, secrets, medir Lighthouse autenticado).

## 6. Seguridad (RA de integridad; penaliza -3 si falla)
- Nunca `service_role`/secret key en el front ni en el repo. Solo publishable/anon vía variables de entorno.
- Ni claves, ni contraseñas, ni emails reales en el repo (README, tests, seeds, scripts). En tests usa valores claramente ficticios.
- Sin `innerHTML` con contenido de usuario. Datos solo sintéticos.

## 7. Checklist de rúbrica (verifícalo antes de F10)
- RA1: patrón + lazy loading + guards por rol + interceptores + SignalStore + JWT.
- RA2: separación vista/lógica, binding uni y bidireccional, async validators, OnPush.
- RA3: ≥ 4 componentes agnósticos con inputs/outputs y limpieza en `ngOnDestroy`.
- RA4: responsive mobile-first, WCAG, teclado, ARIA, Lighthouse ≥ 95.
- RA5: 2 fuentes concurrentes con `forkJoin`, spinners y errores, dashboard con filtros, PDF con diseño y CSV.
- RA6: TSDoc + Compodoc en CI + manual (MD y `/help`).
- RA7: Git Flow con PR, despliegue automático en Vercel, PWA, CI que bloquea si fallan tests.
