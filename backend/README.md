# LAR University Backend API

Backend Node.js/Express para analisis de CV, recomendacion de sprints y chat asistido para LAR University.

## Stack

- Runtime: Node.js
- Framework: Express.js
- Base de datos: Firebase Firestore
- IA: OpenAI (`gpt-4o` por defecto)
- Retrieval de catalogo: ranking lexico local sobre Firestore (sin embeddings)
- Autenticacion: JWT
- Upload: Multer
- Parsing de PDF: `pdf-parse`

## Estructura

```text
backend/
|-- server.js
|-- seed-learning-content.js
`-- src/
    |-- app.js
    |-- composition-root.js
    |-- ai/
    |-- http/
    |   |-- controllers/
    |   |-- middleware/
    |   |-- routes/
    |   |-- serializers/
    |   |-- validators/
    |   |-- respond.js
    |   |-- sse.js
    |   `-- validate.js
    |-- infra/
    |-- repositories/
    |-- services/
    |   |-- auth/
    |   |   `-- jwt.service.js
    |   |-- documents/
    |   |   `-- pdf-parser.service.js
    |   |-- errors/
    |   |   `-- app-error.js
    |   |-- observability/
    |   |   |-- logger.js
    |   |   `-- request-context.service.js
    |   `-- serialization/
    |       |-- analysis-serializer.js
    |       `-- recommendation-serializer.js
    |-- use-cases/
    `-- utils/
|-- test/
    `-- *.test.js
```

## Configuracion

Arquitectura runtime:

- `http/`: capa HTTP completa (`routes`, `controllers`, `middleware`, `validators`, `serializers`, `respond`, `sse`).
- `use-cases/`: logica de negocio.
- `ai/`: orquestacion de prompts, contexto y retrieval local de catalogo.
- `repositories/`: acceso de dominio a persistencia.
- `services/`: servicios auxiliares agrupados por responsabilidad (`auth`, `documents`, `errors`, `observability`, `serialization`).
- `infra/`: adaptadores externos (Firestore, OpenAI).

### 1. Instalar dependencias

```bash
npm install
```

### 2. Variables de entorno

Configura `.env` con al menos:

```env
OPENAI_API_KEY=tu_api_key
OPENAI_MODEL=gpt-4o

GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
FIREBASE_PROJECT_ID=tu_proyecto_firebase
```

Notas:

- Si `OPENAI_API_KEY` no esta configurada, el backend sigue funcionando con un modo de respaldo para extraccion, recomendacion y chat.
- El retrieval del chat usa ranking lexico local sobre modulos y topics del master seleccionado.

### 3. Ejecutar el servidor

```bash
npm run dev
```

Para produccion:

```bash
npm start
```

## Scripts utiles

```bash
npm run seed:learning-content
npm test
```

Que hace cada uno:

- `seed:learning-content`: sincroniza masters, modulos y topics en Firestore.
- `test`: corre la suite de contratos HTTP y pruebas unitarias del backend.

## Flujo de recomendacion

1. El usuario selecciona un master.
2. Sube su CV o comparte resumen de LinkedIn.
3. El backend extrae un perfil estructurado.
4. El sistema obtiene contexto del catalogo del master con ranking lexico local sobre Firestore.
5. OpenAI genera la recomendacion usando el perfil y el contexto recuperado.
6. Se guardan perfil, recomendacion, materias sugeridas y cursos recomendados en `analyses`.

## Masters disponibles

- `mtecmba`
- `mintear`
- `datalar-mba`

## Endpoints principales

### Auth

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesion |
| POST | `/api/auth/google` | Login con Google |
| GET | `/api/auth/me` | Obtener usuario autenticado |

### Usuarios

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/users/profile` | Perfil del usuario |
| GET | `/api/users/masters` | Masters disponibles |
| PUT | `/api/users/master` | Seleccionar master |
| DELETE | `/api/users/account` | Desactivar cuenta |

### CV

| Metodo | Ruta | Descripcion |
|---|---|---|
| POST | `/api/cv/upload` | Subir y analizar CV PDF |
| POST | `/api/cv/linkedin` | Analizar perfil LinkedIn |
| GET | `/api/cv/my-analysis` | Ultimo analisis completado |
| GET | `/api/cv/history` | Historial de analisis |

### Recomendaciones

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/recommendations/specializations` | Catalogo de especializaciones |
| GET | `/api/recommendations/specializations/:id` | Especializacion puntual |
| GET | `/api/recommendations/my-recommendation` | Recomendacion del usuario |
| POST | `/api/recommendations/regenerate` | Regenerar recomendacion |

### Chat

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/chat` | Listar chats |
| POST | `/api/chat` | Crear chat |
| GET | `/api/chat/:id` | Obtener chat |
| POST | `/api/chat/:id/message` | Enviar mensaje |
| PUT | `/api/chat/:id/title` | Renombrar chat |
| DELETE | `/api/chat/:id` | Eliminar chat |

### Health

| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/health` | Estado del servidor |

## Recomendaciones operativas

- Ejecuta `npm run seed:learning-content` cuando agregues o cambies masters, modulos o topics.

## Despliegue

Ejemplo basico con Cloud Run:

```bash
docker build -t lar-university-backend .

gcloud run deploy lar-university-backend \
  --image lar-university-backend \
  --platform managed \
  --region us-central1
```
