# PROGRESS.md · Proyecto DI 0488

## Estado general
- Fase actual: F2 · Capa de datos asíncrona (RA5)
- Rama de trabajo: feature/f2-data (desde develop)
- Fecha inicio F0: 2026-10-28
- Fecha fin F0: 2026-10-28
- Fecha inicio F1: 2026-10-28
- Fecha fin F1: 2026-10-28

## Checklist de fases
- [x] F0 · Base del proyecto
- [x] F1 · Auth, rutas y control de acceso (RA1)
- [ ] F2 · Capa de datos asíncrona (RA5)
- [ ] F3 · Componentes reutilizables (RA3)
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
- F1: base restaurada, lint y test en verde.

## Bitácora
- 2026-10-28: Creado PROGRESS.md. Inicio F0. Leídos AGENTS.md y 01_schema.sql.
- 2026-10-28: F0 completado - dependencias, scripts de entorno, .gitignore/.env.example, lint+test+build OK. Commit y merge a develop.
- 2026-10-28: F1 completado - base limpia, lint+test OK. Commit, push y merge a develop. Listo para F2.
