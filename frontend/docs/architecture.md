# Arquitectura frontend

## Capas

### `app`

Contiene bootstrap de la aplicacion:

- `App`
- providers globales
- router
- layout autenticado

### `features`

Cada feature agrupa:

- componentes de dominio
- hooks de caso de uso
- services de acceso a datos
- utils propias del dominio

Features actuales:

- `auth`
- `theme`
- `chat`
- `cv-analysis`
- `master-selection`
- `recommendation`
- `home-dashboard`

### `shared`

Codigo reusable y transversal:

- `lib`: config, storage, HTTP
- `ui`: componentes compartidos
- `utils`: helpers reutilizables

### `pages`

Se limitan a ensamblar features por ruta. No deben llamar APIs ni manipular almacenamiento global directamente.

## Flujo de datos

1. `pages` renderizan features.
2. Los componentes de feature consumen hooks del dominio.
3. Los hooks delegan efectos y requests a `services`.
4. Los `services` usan el cliente HTTP compartido.

## Estado actual

La capa legacy de `components`, `context`, `services` y `utils` en la raiz ya fue retirada. El frontend fuente queda reducido a `app`, `features`, `shared`, `pages`, `main.jsx` e `index.css`.
