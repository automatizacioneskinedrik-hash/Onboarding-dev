# Frontend LAR University

Frontend React/Vite organizado para crecer de forma incremental hacia una arquitectura `feature-based`.

## Scripts

- `npm run dev`: inicia el entorno local.
- `npm run build`: genera el build de produccion.
- `npm run lint`: valida reglas basicas de calidad.
- `npm run test`: ejecuta la suite con Vitest.
- `npm run validate`: corre `lint`, `test` y `build`.

## Estructura

- `src/app`: bootstrap, router, providers y layout global.
- `src/features`: modulos por dominio funcional.
- `src/shared`: utilidades, cliente HTTP, UI reutilizable y helpers comunes.
- `src/pages`: composicion por ruta, sin acceso directo a datos.

## Reglas principales

- Las `pages` componen features; no hacen requests directos.
- Los side effects viven en hooks o services de feature.
- `shared` no depende de `features`.
- Los contexts globales expuestos son `auth` y `theme`.
- Las referencias del proyecto deben salir de `app`, `features` o `shared`.

Consulta mas detalle en:

- `docs/architecture.md`
- `docs/conventions.md`
- `docs/migration-map.md`
