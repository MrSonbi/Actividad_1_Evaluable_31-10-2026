# Sistema de Gestión de Inventario y Pedidos

Aplicación web para gestionar productos, clientes y pedidos, con acceso por usuario y dos roles: **administrador** y **usuario**. Incluye un dashboard con indicadores y gráficos, actividad en tiempo real y exportación a CSV y PDF. Está pensada como PWA accesible y *responsive*, con enfoque *mobile-first*.

## Stack

| Área          | Tecnología                                                               |
| ------------- | ------------------------------------------------------------------------ |
| Interfaz      | Ionic 8 y Angular 22 con componentes *standalone*, signals y `OnPush`     |
| Estado        | NgRx SignalStore (`@ngrx/signals`)                                       |
| Backend       | Supabase: Auth y Realtime con `supabase-js`; datos por REST con `HttpClient` |
| Gráficos      | Chart.js, con un componente propio                                       |
| Informes      | jsPDF y jsPDF-AutoTable (PDF); utilidad propia (CSV)                     |
| Pruebas       | Vitest (unitarias) y Playwright (e2e)                                    |
| Documentación | Compodoc y TSDoc                                                         |
| Despliegue    | Vercel                                                                   |

## Requisitos

- Node.js 20 o superior, y npm.
- Un proyecto de Supabase con el esquema de `01_schema.sql`. `02_seed.sql` contiene datos de ejemplo.

## Instalación

```bash
git clone https://github.com/MrSonbi/Actividad_1_Evaluable_31-10-2026.git
cd Actividad_1_Evaluable_31-10-2026
npm ci
```

Crea el archivo `.env` a partir de `.env.example` y arranca la aplicación:

```bash
npm start
```

La aplicación se sirve en `http://localhost:4200`.

## Variables de entorno

`.env.example` es la plantilla; `.env` tiene tus valores y **no se sube a Git**.

| Variable       | Descripción                                    |
| -------------- | ---------------------------------------------- |
| `SUPABASE_URL` | URL del proyecto de Supabase                   |
| `SUPABASE_KEY` | Clave pública del proyecto (*publishable/anon*) |

`scripts/set-env.mjs` genera con estas variables `src/environments/environment.ts`, también ignorado por Git. Se ejecuta antes de `start`, `build` y `test`. Las variables definidas en el sistema tienen prioridad sobre `.env`.

> **Nunca** uses la clave `service_role` ni otra clave secreta: todo lo que recibe el frontend es visible en el navegador. Los permisos los imponen las políticas RLS de la base de datos.

## Scripts

| Comando               | Descripción                                                   |
| --------------------- | ------------------------------------------------------------- |
| `npm start`           | Servidor de desarrollo                                        |
| `npm run build`       | Compilación de producción en `www/`                           |
| `npm run watch`       | Compilación de desarrollo continua                            |
| `npm test`            | Pruebas unitarias sin modo *watch*                            |
| `npm run test:unit:watch` | Pruebas unitarias en modo *watch*                         |
| `npm run test:e2e`    | Pruebas e2e con Playwright                                    |
| `npm run lint`        | ESLint, comprobación de tipos de e2e y Prettier               |
| `npm run lint:fix`    | Corrige automáticamente lo que ESLint y Prettier pueden       |
| `npm run docs`        | Genera la documentación técnica en `documentation/`           |
| `npm run docs:serve`  | Genera la documentación técnica y la sirve en local           |

## Estructura

```text
src/app/
  core/       configuración, Supabase, autenticación, interceptores, modelos y datos
  shared/     componentes reutilizables, validadores y utilidades (informes)
  layout/     estructura principal con el menú lateral
  features/   páginas: acceso, dashboard, productos, clientes, pedidos y ayuda
docs/         manual de usuario
scripts/      scripts de Node, como la generación del entorno
e2e/          pruebas de Playwright
```

**Flujo de datos:** vista → método del store → API/servicio → `patchState` → signals → vista.

## Roles y permisos

| Recurso                 | Administrador                | Usuario                 |
| ----------------------- | ---------------------------- | ----------------------- |
| Productos               | Lectura y escritura          | Lectura                 |
| Clientes                | Lectura, escritura y borrado | Lectura y escritura     |
| Pedidos (en la app)     | Lectura                      | Lectura                 |
| Dashboard               | Sí                           | No                      |

La interfaz oculta las acciones no permitidas y las rutas de administración usan guards, pero quien impone los permisos es la base de datos (RLS).

## Documentación

- [Manual de usuario](https://github.com/MrSonbi/Actividad_1_Evaluable_31-10-2026/blob/main/docs/MANUAL_USUARIO.md), resumido también en la página `/help` de la aplicación.
- Documentación técnica: ejecuta `npm run docs` y abre `documentation/index.html`. Esa carpeta se genera y no se versiona. La configuración está en `.compodocrc.json` y `tsconfig.doc.json`.

## Flujo de Git

Se usa Git Flow con *pull requests*:

```text
main  ←  PR  ←  develop  ←  PR  ←  feature/*
```

- `main`: versión de producción.
- `develop`: integración de lo terminado.
- `feature/fN-nombre`: una rama por fase, creada desde `develop`.
- Los mensajes siguen Conventional Commits en español, por ejemplo: `feat(auth): añade guard por rol`.

## Despliegue en Vercel

`vercel.json` ya define la instalación (`npm ci`), la compilación (`npm run build`), la carpeta de salida (`www`) y la reescritura de rutas a `index.html`, necesaria para que las rutas profundas no den 404.

1. Importa el repositorio en [Vercel](https://vercel.com).
2. En **Settings → Environment Variables**, añade `SUPABASE_URL` y `SUPABASE_KEY`.
3. Selecciona `main` como rama de producción y despliega.

Vercel vuelve a desplegar cada vez que se actualiza `main` y crea previsualizaciones para el resto de ramas y los *pull requests*.

## Seguridad

- No subas al repositorio claves, contraseñas ni datos reales.
- Las credenciales de demostración no están en este repositorio: se entregan aparte.
