const { db, COLLECTIONS } = require('../infra/firestore.client');
const { MASTERS } = require('./masters');

const MTECMBA_ID = 'mtecmba';
const MINTEAR_ID = 'mintear';
const DATALAR_ID = 'datalar-mba';

const SPRINT_SPECIALIZATIONS = [
    {
        key: 'comunicacion',
        specialization_id: 'comunicacion',
        title: 'Comunicación',
        order: 1,
        difficulty: 2,
        estimated_hours: 30,
        description: 'Habilidades de comunicación estratégica para liderazgo y negocios.',
    },
    {
        key: 'emprendimiento',
        specialization_id: 'emprendimiento',
        title: 'Emprendimiento',
        order: 2,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Creación, financiación y crecimiento de empresas innovadoras.',
    },
    {
        key: 'finanzas',
        specialization_id: 'finanzas',
        title: 'Finanzas',
        order: 3,
        difficulty: 4,
        estimated_hours: 30,
        description: 'Gestión financiera avanzada y mercados financieros.',
    },
    {
        key: 'talento',
        specialization_id: 'talento',
        title: 'Talento',
        order: 4,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestión estratégica de talento y liderazgo organizacional.',
    },
    {
        key: 'tecnologia',
        specialization_id: 'tecnologia',
        title: 'Tecnología',
        order: 5,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Tecnologías empresariales, arquitectura digital e innovación tecnológica.',
    },
    {
        key: 'ia',
        specialization_id: 'ia-automatizacion',
        title: 'Inteligencia Artificial y Automatización',
        order: 6,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Aplicación estratégica de inteligencia artificial en empresas.',
    },
    {
        key: 'mercado_cliente',
        specialization_id: 'mercado-cliente',
        title: 'Mercado y Cliente',
        order: 7,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Marketing estratégico, comportamiento del consumidor y experiencia del cliente.',
    },
    {
        key: 'operaciones',
        specialization_id: 'operaciones',
        title: 'Operaciones y Entorno',
        order: 8,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestión de operaciones, cadenas de suministro y economía global.',
    },
    {
        key: 'analitica_datos',
        specialization_id: 'analitica-datos',
        title: 'Analítica de Datos y Decisión Empresarial',
        order: 9,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Uso de datos y analítica avanzada para toma de decisiones empresariales.',
    }
];

const DATALAR_SPRINT_OVERRIDES = {
    analitica_datos: {
        title: 'Arquitectura Analitica Avanzada',
        order: 1,
        difficulty: 5,
        estimated_hours: 40,
        description:
            'Tope tecnologico del Master Data Science para disenar arquitecturas analiticas avanzadas, gobernar sistemas complejos y tomar decisiones estrategicas basadas en datos.',
    },
};

const MTECMBA_SPRINT_TOPICS = {
    comunicacion: [
        'Comunicación para el Liderazgo',
        'Liderar y Gestionar el Cambio',
        'Negociación en los Negocios',
        'Presentaciones de Alto Impacto',
        'Oratoria para Negocios',
        'Comunicación de Crisis',
    ],
    emprendimiento: [
        'Finanzas para Emprendedores',
        'Emprendimiento y Planificacion de Negocios',
        'Gestión de la Innovacion y el Crecimiento',
        'Estrategias de Precios',
        'Estrategia Legal y de Propiedad Intelectual',
        'Estrategias de inversión de capital de riesgo',
    ],
    finanzas: [
        'Finanzas Corporativas Avanzadas',
        'ESG en la Industria de Servicios Financieros',
        'Analítica Financiera e Innovación',
        'Fondos de Cobertura',
        'Fusiones y Adquisiciones',
        'Ecosistemas Fintech y Finanzas Descentralizadas',
    ],
    talento: [
        'Gestión de Equipos',
        'Gestión del Talento',
        'Neurociencia del Liderazgo',
        'Construir relaciones solidas y equipos cohesionados',
        'Diseño Organizativo y Escalado del Talento',
        'Gestión del Desempeño y Sistemas de Evaluación en Entornos Tecnológicos',
    ],
    tecnologia: [
        'Estrategia de Ciberseguridad',
        'Cloud y DevOps para Directivos',
        'Blockchain y Activos Digitales',
        'Internet de las Cosas (IoT) e Industria 4.0',
        'Arquitecturas Digitales y Plataformas Tecnologicas',
        'Tecnologias Emergentes Aplicadas a la Empresa',
    ],
    ia: [
        'IA y Deep Learning para Negocios',
        'IA para la Productividad Empresarial',
        'Estrategia e Implementación de Inteligencia Artificial',
        'Gobernanza, Etica y Regulación de la IA',
        'Ingenieria de Prompts para Directivos',
        'Diseño y Aplicación de Agentes Inteligentes Generativos en la Empresa',
    ],
    mercado_cliente: [
        'Estrategia de Marketing Avanzada',
        'Comportamiento del Consumidor',
        'Vinculacion Digital y Lealtad',
        'Gestión de la Experiencia de Cliente y Customer Journey',
        'Analítica Comercial y Toma de Decisiones de Marketing',
        'Estrategia de Marca y Posicionamiento en Entornos Digitales',
    ],
    operaciones: [
        'Economía Global',
        'Estrategia de Cadena de Suministro',
        'Gestión de Riesgos en Cadenas de Suministro',
        'Analítica de Operaciones',
        'Economía Circular y Operaciones Sostenibles',
        'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
    ],
    analitica_datos: [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
    ],
};

const MINTEAR_SPRINT_TOPICS = {
    comunicacion: MTECMBA_SPRINT_TOPICS.comunicacion,
    emprendimiento: MTECMBA_SPRINT_TOPICS.emprendimiento,
    finanzas: MTECMBA_SPRINT_TOPICS.finanzas,
    talento: MTECMBA_SPRINT_TOPICS.talento,
    tecnologia: MTECMBA_SPRINT_TOPICS.tecnologia,
    ia: [
        'IA y Deep Learning para Negocios',
        'RPA (Robotic Process Automation) e Hiperautomatizacion',
        'Estrategia e Implementación de Inteligencia Artificial',
        'Visión Artificial y Reconocimiento de Imágenes',
        'Arquitectura de Prompts y Evaluación Sistemática',
        'Personalización de Modelos: Fine-Tuning y RAG Avanzado',
    ],
    mercado_cliente: MTECMBA_SPRINT_TOPICS.mercado_cliente,
    operaciones: MTECMBA_SPRINT_TOPICS.operaciones,
    analitica_datos: [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
    ],
};

const DATALAR_SPRINT_TOPICS = {
    comunicacion: MTECMBA_SPRINT_TOPICS.comunicacion,
    emprendimiento: MTECMBA_SPRINT_TOPICS.emprendimiento,
    finanzas: MTECMBA_SPRINT_TOPICS.finanzas,
    talento: MTECMBA_SPRINT_TOPICS.talento,
    tecnologia: MTECMBA_SPRINT_TOPICS.tecnologia,
    ia: MTECMBA_SPRINT_TOPICS.ia,
    mercado_cliente: MTECMBA_SPRINT_TOPICS.mercado_cliente,
    operaciones: [
        'Economía Global',
        'Estrategia de Cadena de Suministro',
        'Gestión de Riesgos en Cadenas de Suministro',
        'Analítica de Operaciones',
        'Economía Circular y Operaciones Sostenibles',
        'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
    ],
    analitica_datos: [
        'Analítica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualización de datos y cuadros de mando ejecutivos',
        'Analítica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la información',
        'Data-Driven management y cultura analítica',
        'Arquitectura Analítica Avanzada',
        'Evaluación Crítica de Sistemas Analíticos Complejos',
        'Decisión Ejecutiva Bajo Incertidumbre Algoritmica',
        'Gestión de Trade-offs Técnicos, Financieros y Operativos en IA',
        'Responsabilidad Ejecutiva en Modelos Predictivos y Automatización',
        'Gobierno Corporativo Avanzado del Dato en Entornos Multijurisdiccionales',
        'Diseño de Estrategias de Ventaja Competitiva Basadas en Analitica Avanzada',
    ],
};

const MTECMBA_MASTER_MODULES = [
    {
        id: 'mtecmba_module_0',
        title: 'Mentalidad Directiva en Entornos Tecnológicos',
        order: 0,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Base directiva del master para entender empresa, producto, datos, finanzas, operaciones y liderazgo en contextos tecnológicos.',
        topics: [
            'Empresa, Estrategia y Modelo de Negocio Tecnológico',
            'Producto Digital, Cliente y Creación de Valor',
            'Datos, Analítica e Inteligencia Artificial para Directivos',
            'Finanzas, Economía y lógica del Crecimiento',
            'Operaciones, Procesos y Escalabilidad Empresarial',
            'Gobernanza, Riesgos, Liderazgo',
        ],
    },
    {
        id: 'mtecmba_module_1',
        title: 'Estrategia empresarial y arquitectura tecnológica',
        order: 1,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Relacion entre estrategia competitiva, arquitectura empresarial y gobierno tecnológico.',
        topics: [
            'Estrategia competitiva en entornos digitales y tecnológicos',
            'Arquitectura tecnológica empresarial, modelos plataforma y economía del cloud',
            'Impacto de las decisiones tecnológicas y del uso de datos en la estrategia del negocio',
            'Gobierno tecnológico, alineación estrategica y toma de decisiones directivas',
        ],
    },
    {
        id: 'mtecmba_module_2',
        title: 'Finanzas estrategicas y modelos de negocio tech',
        order: 2,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Valoración, planificación financiera y financiación de negocios tecnológicos.',
        topics: [
            'Análisis de estados financieros y métricas de rendimiento en negocios digitales',
            'étodos de valoración de activos y empresas tecnológicas',
            'Planificación financiera, gestión presupuestaria y control de caja en procesos de escalado',
            'Estructura de capital y financiación de la innovación tecnológica',
        ],
    },
    {
        id: 'mtecmba_module_3',
        title: 'Direccion de producto digital',
        order: 3,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Dirección de producto, UX/UI, métricas y uso de datos e IA en producto digital.',
        topics: [
            'Estrategia de producto y gestión del ciclo de vida',
            'Diseño de la experiencia de usuario y prototipado (UX/UI)',
            'Analítica de producto, métricas estrategicas y validación de valor',
            'Integración de datos e inteligencia artificial en la dirección de producto',
        ],
    },
    {
        id: 'mtecmba_module_4',
        title: 'Growth, marketing digital y experimentacion',
        order: 4,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Go-to-market, crecimiento, operacion digital y relacion con clientes.',
        topics: [
            'Marketing de producto y estrategias de Go-to-market',
            'Modelos de crecimiento escalable y adquisición',
            'Dirección de operaciones y escalado de servicios digitales basados en datos',
            'Gestión de la relación con el cliente y customer success',
        ],
    },
    {
        id: 'mtecmba_module_5',
        title: 'Operaciones, data strategy y escalabilidad',
        order: 5,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Modelo operativo, estrategia de datos, automatizacion e integracion operativa.',
        topics: [
            'Diseño del modelo operativo y escalabilidad organizativa',
            'Estrategia de datos, gobierno de la información y analítica empresarial',
            'Automatización de procesos, operaciones de IA y eficiencia operativa',
            'Integración de operaciones, tecnología y toma de decisiones basadas en datos',
        ],
    },
    {
        id: 'mtecmba_module_6',
        title: 'Gobernanza, Riesgos, Legalidad y Sostenibilidad (ESG)',
        order: 6,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Gobierno corporativo, riesgos, legalidad, datos, IA responsable y ESG.',
        topics: [
            'Gobierno corporativo y gestión de riesgos en empresas tecnológicas',
            'Gobernanza de datos, uso responsable de la inteligencia artificial y ética tecnológica',
            'Marco legal, propiedad intelectual y contratación en entornos digitales',
            'ESG, sostenibilidad y responsabilidad corporativa en entornos tecnológicos',
        ],
    },
    {
        id: 'mtecmba_module_7',
        title: 'Venture Capital, M&A y crecimiento corporativo',
        order: 7,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Capital riesgo, venture building y fusiones y adquisiciones en tecnologia.',
        topics: [
            'Capital riesgo, análisis de inversiones y estrategias de financiación',
            'Estructuración y negociación de rondas de financiación: cláusulas clave, control y retorno',
            'Emprendimiento corporativo y venture building',
            'Fusiones y adquisiciones en entornos tecnológicos',
        ],
    },
    {
        id: 'mtecmba_module_8',
        title: 'Liderazgo Estrategico, Cambio Organizativo e Innovacion',
        order: 8,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Liderazgo, cambio organizativo e innovacion en entornos tecnologicos.',
        topics: [
            'Liderazgo en entornos tecnológicos y de alta incertidumbre',
            'Gestión del cambio, cultura organizativa y transformación empresarial',
            'Dirección de equipos tecnológicos y multidisciplinares',
            'Toma de decisiones estrategicas en innovación: priorización, experimentación y escalado',
        ],
    },
];

const MINTEAR_MASTER_MODULES = [
    {
        id: 'mintear_module_1',
        title: 'Fundamentos y Aplicaciones de la IA Generativa',
        order: 1,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Fundamentos de IA generativa y aplicaciones ejecutivas para productividad, busqueda, contenidos y analitica.',
        topics: [
            'IA Generativa y su Impacto en la Productividad',
            'Busqueda avanzada con IA',
            'Creación de Documentos y Presentaciones con IA',
            'IA para análisis y visualización de datos',
        ],
    },
    {
        id: 'mintear_module_2',
        title: 'IA para la Productividad, Automatización y Trabajo Colaborativo',
        order: 2,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Uso de IA para organizar el trabajo, documentar, colaborar y producir contenido visual.',
        topics: [
            'Organización del Trabajo con IA',
            'Comunicación y Documentación Inteligente',
            'Trabajo Colaborativo con IA',
            'Creación y Edición de Imágenes con IA',
        ],
    },
    {
        id: 'mintear_module_3',
        title: 'IA en Estrategia Empresarial, Marketing y Seguridad',
        order: 3,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Aplicación de IA en estrategia, marketing digital, contenido y gestión responsable de riesgos.',
        topics: [
            'Creación de Estrategias de Marketing con IA',
            'Gestión de Redes Sociales con IA',
            'Creación de Contenido Interactivo con IA',
            'Riesgos y Desafíos Éticos en la IA Generativa en Empresas',
        ],
    },
    {
        id: 'mintear_module_4',
        title: 'Diseño Inteligente de Soluciones Automatizadas',
        order: 4,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Diseño de soluciones automatizadas con integraciones, datos, documentación y control de versiones.',
        topics: [
            'Configuración de entornos y estructuras basicas',
            'Manipulación de datos y automatización inicial',
            'Integración de APIs y generación dinámica',
            'Documentación técnica y control de versiones',
        ],
    },
    {
        id: 'mintear_module_5',
        title: 'Procesos Inteligentes en Entornos Reales',
        order: 5,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Aplicación de IA a generación de contenido, flujos de datos y procesos funcionales reales.',
        topics: [
            'Generación automatizada de contenido y sintesis',
            'Flujo de datos para decisiones inteligentes',
            'Automatización aplicada a procesos funcionales',
            'Reutilización y trazabilidad en entornos reales',
        ],
    },
    {
        id: 'mintear_module_6',
        title: 'Despliegue y Escalado de Soluciones Funcionales',
        order: 6,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Despliegue, acceso, conexion con servicios cloud y monitorizacion de soluciones funcionales.',
        topics: [
            'Interfaces funcionales para ejecución de soluciones',
            'Publicación y acceso desde navegador',
            'Interacción con bases de datos en la nube o servicios conectados',
            'Monitorización del uso y métricas de rendimiento',
        ],
    },
    {
        id: 'mintear_module_7',
        title: 'Ciberseguridad, Ética y Marco Legal en la Inteligencia Artificial',
        order: 7,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Seguridad, protección de datos, ética y regulación para sistemas basados en IA.',
        topics: [
            'Ciberseguridad en entornos con IA',
            'Protección de datos y cumplimiento normativo',
            'Ética y responsabilidad en el uso de la IA generativa',
            'Marco legal actual y tendencias regulatorias en IA',
        ],
    },
    {
        id: 'mintear_module_8',
        title: 'Liderando el Cambio en Proyectos de IA',
        order: 8,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Liderazgo y gestión del cambio para la implementación y expansión estrategica de IA.',
        topics: [
            'Visión Estratégica y Alineación Organizacional',
            'Gestión del Cambio en Entornos Inteligentes',
            'Competencias Directivas para Liderar la Transformación con IA',
            'Implementación y Expansión Estratégica de la IA',
        ],
    },
];

const DATALAR_MASTER_MODULES = [
    {
        id: 'datalar_module_0',
        title: 'Entorno y Arquitectura para Data Science',
        order: 0,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Fundamentos técnicos y metodológicos para estructurar problemas cuantitativos y trabajar con datos en entornos profesionales.',
        topics: [
            'Pensamiento lógico y estructuración cuantitativa de problemas',
            'Programación en Python para análisis y manipulación de datos',
            'Gestión de datos con SQL y modelado relacional',
            'Estadística aplicada al análisis empresarial',
            'Probabilidad, métricas y validación de resultados',
            'Entorno profesional del Data Scientist y flujos de trabajo analítico',
        ],
    },
    {
        id: 'datalar_module_1',
        title: 'Modelado Predictivo y Machine Learning',
        order: 1,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Diseño, entrenamiento, evaluación y optimización de modelos predictivos para casos empresariales.',
        topics: [
            'Diseño e implementación de modelos supervisados',
            'Segmentación avanzada y aprendizaje no supervisado',
            'Evaluación comparativa y selección de modelos',
            'Optimización y mejora del rendimiento predictivo',
        ],
    },
    {
        id: 'datalar_module_2',
        title: 'Ingeniería de Datos y Arquitecturas Escalables',
        order: 2,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Pipelines, Big Data, almacenamiento moderno y gobierno del dato para entornos productivos.',
        topics: [
            'Diseño de pipelines de datos en entornos productivos',
            'Procesamiento distribuido y ecosistemas Big Data',
            'Arquitecturas modernas de almacenamiento y explotación del dato',
            'Gobernanza, calidad y seguridad de la información',
        ],
    },
    {
        id: 'datalar_module_3',
        title: 'Inteligencia Artificial y Deep Learning Aplicado',
        order: 3,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Aplicación de arquitecturas neuronales, NLP, visión y modelos generativos al negocio.',
        topics: [
            'Arquitecturas neuronales para modelado complejo',
            'Procesamiento avanzado de lenguaje natural',
            'Visión por computador y análisis de datos no estructurados',
            'Modelos generativos y aplicaciones empresariales',
        ],
    },
    {
        id: 'datalar_module_4',
        title: 'Analítica Estratégica en Áreas Clave del Negocio',
        order: 4,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Uso de analítica avanzada para marketing, finanzas, operaciones y experimentación empresarial.',
        topics: [
            'Modelización predictiva en marketing y comportamiento del cliente',
            'Analítica financiera y gestión cuantitativa del riesgo',
            'Optimización operativa y analítica en cadenas de suministro',
            'Experimentación y toma de decisiones basada en evidencia',
        ],
    },
    {
        id: 'datalar_module_5',
        title: 'Estrategia del Dato y Creación de Valor Económico',
        order: 5,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Monetización del dato, evaluación económica y asignación estrategica de recursos en iniciativas analíticas.',
        topics: [
            'Monetización del dato y modelos de negocio data-driven',
            'Evaluación financiera de proyectos de Data Science',
            'Escalabilidad tecnológica y ventaja competitiva',
            'Asignación estrategica de recursos en iniciativas analíticas',
        ],
    },
    {
        id: 'datalar_module_6',
        title: 'Liderazgo Tecnico y Gestion de Equipos Analiticos',
        order: 6,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Direccion de equipos de Data Science, metodologias agiles y comunicacion ejecutiva con foco en datos.',
        topics: [
            'Direccion de equipos de Data Science',
            'Metodologias agiles en proyectos analiticos',
            'Cultura organizacional basada en datos',
            'Comunicacion ejecutiva y visualizacion estrategica',
        ],
    },
    {
        id: 'datalar_module_7',
        title: 'Industrializacion de Modelos y MLOps',
        order: 7,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Despliegue, automatización, monitorización y arquitecturas cloud para sistemas predictivos en producciónd.',
        topics: [
            'Despliegue de modelos en entornos productivos',
            'Automatización y monitoreo de sistemas predictivos',
            'Arquitecturas cloud aplicadas a inteligencia artificial',
            'Rendimiento, escalabilidad y resiliencia analítica',
        ],
    },
    {
        id: 'datalar_module_8',
        title: 'Transformacion Empresarial Impulsada por Inteligencia Artificial',
        order: 8,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Estrategia corporativa, automatización, gestión de riesgos y transformación continua basada en IA y datos.',
        topics: [
            'Diseño de estrategias corporativas basadas en datos',
            'Reconfiguración de modelos operativos mediante automatización',
            'Gestión de riesgos algorítmicos y regulación en IA',
            'Innovación continua en organizaciones data-driven',
        ],
    },
];

const buildSprintModuleId = (masterId, key) =>
    masterId === MTECMBA_ID ? `module_${key}` : `${masterId}_module_${key}`;

const LEGACY_SPRINT_TOPIC_PREFIX = {
    comunicacion: 'com',
    emprendimiento: 'emp',
    finanzas: 'fin',
    talento: 'tal',
    tecnologia: 'tec',
    ia: 'ia',
    mercado_cliente: 'mc',
    operaciones: 'op',
    analitica_datos: 'ad',
};

const buildSprintTopicId = (masterId, key, order) =>
    masterId === MTECMBA_ID
        ? `topic_${LEGACY_SPRINT_TOPIC_PREFIX[key]}_${order}`
        : `${masterId}_topic_${key}_${order}`;

const getSprintModuleDefinition = (masterId, module) => {
    const override = masterId === DATALAR_ID ? DATALAR_SPRINT_OVERRIDES[module.key] : null;

    return {
        ...module,
        ...(override || {}),
    };
};

const getSprintTopics = (masterId, moduleKey, topicsByKey) => {
    const titles = topicsByKey[moduleKey] || [];

    if (masterId !== DATALAR_ID || moduleKey !== 'analitica_datos') {
        return titles;
    }

    const isAdvancedArchitecture = (title) => {
        const normalized = String(title || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();

        return normalized.includes('arquitectura') && normalized.includes('analitica') && normalized.includes('avanzada');
    };

    return [
        ...titles.filter(isAdvancedArchitecture),
        ...titles.filter((title) => !isAdvancedArchitecture(title)),
    ];
};

const buildSprintContent = (masterId, topicsByKey) => {
    const modules = SPRINT_SPECIALIZATIONS.map((rawModule) => {
        const module = getSprintModuleDefinition(masterId, rawModule);

        return {
        id: buildSprintModuleId(masterId, module.key),
        master_id: masterId,
        catalog_type: 'sprint',
        specialization_id: module.specialization_id,
        title: module.title,
        order: module.order,
        difficulty: module.difficulty,
        estimated_hours: module.estimated_hours,
        description: module.description,
        };
    });

    const topics = SPRINT_SPECIALIZATIONS.flatMap((module) =>
        getSprintTopics(masterId, module.key, topicsByKey).map((title, index) => ({
            id: buildSprintTopicId(masterId, module.key, index + 1),
            master_id: masterId,
            catalog_type: 'sprint',
            specialization_id: module.specialization_id,
            module_id: buildSprintModuleId(masterId, module.key),
            title,
            order: index + 1,
        }))
    );

    return { modules, topics };
};

const buildMasterContent = (masterId, moduleDefinitions) => {
    const modules = moduleDefinitions.map((module) => ({
        id: module.id,
        master_id: masterId,
        catalog_type: 'master',
        title: module.title,
        order: module.order,
        difficulty: module.difficulty,
        estimated_hours: module.estimated_hours,
        description: module.description,
    }));

    const topics = moduleDefinitions.flatMap((module) =>
        module.topics.map((title, index) => ({
            id: `${module.id}_topic_${index + 1}`,
            master_id: masterId,
            catalog_type: 'master',
            module_id: module.id,
            title,
            order: index + 1,
        }))
    );

    return { modules, topics };
};

const mtecmbaSprintContent = buildSprintContent(MTECMBA_ID, MTECMBA_SPRINT_TOPICS);
const mintearSprintContent = buildSprintContent(MINTEAR_ID, MINTEAR_SPRINT_TOPICS);
const datalarSprintContent = buildSprintContent(DATALAR_ID, DATALAR_SPRINT_TOPICS);
const mtecmbaMasterContent = buildMasterContent(MTECMBA_ID, MTECMBA_MASTER_MODULES);
const mintearMasterContent = buildMasterContent(MINTEAR_ID, MINTEAR_MASTER_MODULES);
const datalarMasterContent = buildMasterContent(DATALAR_ID, DATALAR_MASTER_MODULES);

const learningModules = [
    ...mtecmbaMasterContent.modules,
    ...mtecmbaSprintContent.modules,
    ...mintearMasterContent.modules,
    ...mintearSprintContent.modules,
    ...datalarMasterContent.modules,
    ...datalarSprintContent.modules,
];

const topics = [
    ...mtecmbaMasterContent.topics,
    ...mtecmbaSprintContent.topics,
    ...mintearMasterContent.topics,
    ...mintearSprintContent.topics,
    ...datalarMasterContent.topics,
    ...datalarSprintContent.topics,
];

const seedCollection = async (collectionName, docs) => {
    const batch = db.batch();

    docs.forEach((doc) => {
        const docRef = db.collection(collectionName).doc(doc.id);
        batch.set(docRef, doc, { merge: true });
    });

    await batch.commit();
};

const seedLearningContent = async () => {
    await seedCollection(COLLECTIONS.MASTERS, MASTERS);
    await seedCollection(COLLECTIONS.LEARNING_MODULES, learningModules);
    await seedCollection(COLLECTIONS.TOPICS, topics);

    return {
        masters: MASTERS.length,
        modules: learningModules.length,
        topics: topics.length,
    };
};

module.exports = {
    masters: MASTERS,
    learningModules,
    topics,
    seedLearningContent,
};
