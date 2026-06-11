# Convenciones frontend

## Ubicacion de codigo

- Un componente reutilizable de toda la app va en `shared/ui`.
- Un componente que pertenece a un dominio va en `features/<feature>/components`.
- Un hook con side effects va en `features/<feature>/hooks`.
- Las llamadas HTTP van en `features/<feature>/services`.
- Los helpers transversales van en `shared/utils`.

## Imports

- Prefiere importar desde `features/<feature>` o `shared/...`.
- Evita nuevos imports desde wrappers legacy salvo mantenimiento puntual.
- No importes `features` desde `shared`.

## Estado

- Estado global solo en `auth` y `theme`.
- Estado remoto en hooks de feature.
- Estado visual local en componentes o controllers de feature.

## Archivos publicos

Cada feature debe exponer su API publica desde `index.js`.

## Testing

- Tests de utilidades junto al archivo o en la misma feature.
- Prioriza tests de hooks y componentes criticos.
- Usa `@testing-library/react` para UI y `vitest` para utilidades.
