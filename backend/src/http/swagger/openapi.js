const buildOpenApiSpec = ({ baseUrl = 'http://localhost:5000' } = {}) => ({
    openapi: '3.0.3',
    info: {
        title: 'LAR University API',
        version: '1.0.0',
        description:
            'API para autenticacion, analisis de CV, recomendacion de rutas academicas personalizadas y chat asistido.',
    },
    servers: [{ url: baseUrl }],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
    },
    paths: {
        '/health': {
            get: {
                summary: 'Health check',
                responses: {
                    200: { description: 'Servicio operativo' },
                },
            },
        },
        '/api/auth/register': {
            post: {
                summary: 'Registrar usuario',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string' },
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Usuario registrado' } },
            },
        },
        '/api/auth/login': {
            post: {
                summary: 'Login',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string' },
                                    password: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Login exitoso' } },
            },
        },
        '/api/auth/me': {
            get: {
                summary: 'Usuario autenticado',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Perfil actual' } },
            },
        },
        '/api/users/masters': {
            get: {
                summary: 'Listar MBAs disponibles',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Catalogo de masters' } },
            },
        },
        '/api/users/master-modules': {
            get: {
                summary: 'Listar modulos existentes del MBA',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'masterId',
                        in: 'query',
                        schema: { type: 'string', example: 'mtecmba' },
                        required: false,
                    },
                ],
                responses: { 200: { description: 'Modulos del MBA' } },
            },
        },
        '/api/users/master': {
            put: {
                summary: 'Seleccionar MBA',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    masterId: { type: 'string', example: 'mtecmba' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'MBA actualizado' } },
            },
        },
        '/api/cv/upload': {
            post: {
                summary: 'Subir CV y generar ruta academica',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'multipart/form-data': {
                            schema: {
                                type: 'object',
                                properties: {
                                    masterId: { type: 'string', example: 'mtecmba' },
                                    cv: { type: 'string', format: 'binary' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'CV analizado' } },
            },
        },
        '/api/cv/linkedin': {
            post: {
                summary: 'Analizar resumen de LinkedIn',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    masterId: { type: 'string', example: 'mtecmba' },
                                    linkedinUrl: { type: 'string' },
                                    linkedinSummary: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'LinkedIn analizado' } },
            },
        },
        '/api/cv/my-analysis': {
            get: {
                summary: 'Obtener ultimo analisis',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Ultimo analisis disponible' } },
            },
        },
        '/api/cv/history': {
            get: {
                summary: 'Historial de analisis',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Historial del usuario' } },
            },
        },
        '/api/recommendations/specializations': {
            get: {
                summary: 'Listar especializaciones por MBA',
                parameters: [
                    {
                        name: 'masterId',
                        in: 'query',
                        schema: { type: 'string', example: 'mtecmba' },
                        required: false,
                    },
                ],
                responses: { 200: { description: 'Catalogo de especializaciones' } },
            },
        },
        '/api/recommendations/specializations/{id}': {
            get: {
                summary: 'Detalle de especializacion por MBA',
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        schema: { type: 'string' },
                        required: true,
                    },
                    {
                        name: 'masterId',
                        in: 'query',
                        schema: { type: 'string', example: 'mtecmba' },
                        required: false,
                    },
                ],
                responses: { 200: { description: 'Especializacion encontrada' } },
            },
        },
        '/api/recommendations/my-recommendation': {
            get: {
                summary: 'Obtener ruta recomendada del usuario',
                security: [{ bearerAuth: [] }],
                responses: { 200: { description: 'Ruta academica personalizada' } },
            },
        },
        '/api/recommendations/regenerate': {
            post: {
                summary: 'Regenerar ruta recomendada',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    cvAnalysisId: { type: 'string' },
                                },
                            },
                        },
                    },
                },
                responses: { 200: { description: 'Ruta regenerada' } },
            },
        },
    },
});

const buildSwaggerHtml = () => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LAR University API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function () {
      window.SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        presets: [window.SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout'
      });
    };
  </script>
</body>
</html>`;

module.exports = {
    buildOpenApiSpec,
    buildSwaggerHtml,
};
