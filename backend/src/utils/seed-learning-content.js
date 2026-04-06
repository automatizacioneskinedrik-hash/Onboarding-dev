const { db, COLLECTIONS } = require('../infra/firestore.client');
const { MASTERS } = require('./masters');

const MTECMBA_ID = 'mtecmba';
const MINTEAR_ID = 'mintear';
const DATALAR_ID = 'datalar-mba';

const SPRINT_SPECIALIZATIONS = [
    {
        key: 'comunicacion',
        specialization_id: 'comunicacion',
        title: 'Comunicacion',
        order: 1,
        difficulty: 2,
        estimated_hours: 30,
        description: 'Habilidades de comunicacion estrategica para liderazgo y negocios.',
    },
    {
        key: 'emprendimiento',
        specialization_id: 'emprendimiento',
        title: 'Emprendimiento',
        order: 2,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Creacion, financiacion y crecimiento de empresas innovadoras.',
    },
    {
        key: 'finanzas',
        specialization_id: 'finanzas',
        title: 'Finanzas',
        order: 3,
        difficulty: 4,
        estimated_hours: 30,
        description: 'Gestion financiera avanzada y mercados financieros.',
    },
    {
        key: 'talento',
        specialization_id: 'talento',
        title: 'Talento',
        order: 4,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestion estrategica de talento y liderazgo organizacional.',
    },
    {
        key: 'tecnologia',
        specialization_id: 'tecnologia',
        title: 'Tecnologia',
        order: 5,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Tecnologias empresariales, arquitectura digital e innovacion tecnologica.',
    },
    {
        key: 'ia',
        specialization_id: 'ia-automatizacion',
        title: 'Inteligencia Artificial y Automatizacion',
        order: 6,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Aplicacion estrategica de inteligencia artificial en empresas.',
    },
    {
        key: 'mercado_cliente',
        specialization_id: 'mercado-cliente',
        title: 'Mercado y Cliente',
        order: 7,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Marketing estrategico, comportamiento del consumidor y experiencia del cliente.',
    },
    {
        key: 'operaciones',
        specialization_id: 'operaciones',
        title: 'Operaciones y Entorno',
        order: 8,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestion de operaciones, cadenas de suministro y economia global.',
    },
    {
        key: 'analitica_datos',
        specialization_id: 'analitica-datos',
        title: 'Analitica de Datos y Decision Empresarial',
        order: 9,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Uso de datos y analitica avanzada para toma de decisiones empresariales.',
    },
    {
        key: 'arquitectura_analitica_avanzada',
        specialization_id: 'arquitectura-analitica-avanzada',
        masters: [DATALAR_ID],
        title: 'Arquitectura Analitica Avanzada',
        order: 10,
        difficulty: 4,
        estimated_hours: 40,
        description: 'Diseno, implementacion y gestion de arquitecturas analiticas avanzadas en empresas.',
    }
];

const MTECMBA_SPRINT_TOPICS = {
    comunicacion: [
        'Comunicacion para el Liderazgo',
        'Liderar y Gestionar el Cambio',
        'Negociacion en los Negocios',
        'Presentaciones de Alto Impacto',
        'Oratoria para Negocios',
        'Comunicacion de Crisis',
    ],
    emprendimiento: [
        'Finanzas para Emprendedores',
        'Emprendimiento y Planificacion de Negocios',
        'Gestion de la Innovacion y el Crecimiento',
        'Estrategias de Precios',
        'Estrategia Legal y de Propiedad Intelectual',
        'Estrategias de inversion de capital de riesgo',
    ],
    finanzas: [
        'Finanzas Corporativas Avanzadas',
        'ESG en la Industria de Servicios Financieros',
        'Analitica Financiera e Innovacion',
        'Fondos de Cobertura',
        'Fusiones y Adquisiciones',
        'Ecosistemas Fintech y Finanzas Descentralizadas',
    ],
    talento: [
        'Gestion de Equipos',
        'Gestion del Talento',
        'Neurociencia del Liderazgo',
        'Construir relaciones solidas y equipos cohesionados',
        'Diseno Organizativo y Escalado del Talento',
        'Gestion del Desempeno y Sistemas de Evaluacion en Entornos Tecnologicos',
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
        'Estrategia e Implementacion de Inteligencia Artificial',
        'Gobernanza, Etica y Regulacion de la IA',
        'Ingenieria de Prompts para Directivos',
        'Diseno y Aplicacion de Agentes Inteligentes Generativos en la Empresa',
    ],
    mercado_cliente: [
        'Estrategia de Marketing Avanzada',
        'Comportamiento del Consumidor',
        'Vinculacion Digital y Lealtad',
        'Gestion de la Experiencia de Cliente y Customer Journey',
        'Analitica Comercial y Toma de Decisiones de Marketing',
        'Estrategia de Marca y Posicionamiento en Entornos Digitales',
    ],
    operaciones: [
        'Economia Global',
        'Estrategia de Cadena de Suministro',
        'Gestion de Riesgos en Cadenas de Suministro',
        'Analitica de Operaciones',
        'Economia Circular y Operaciones Sostenibles',
        'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
    ],
    analitica_datos: [
        'Entorno y Arquitectura para Data Science',
        'Modelado Predictivo y Machine Learning',
        'Ingeniería de Datos y Arquitecturas Escalables',
        'Inteligencia Artificial y Deep Learning Aplicado',
        'Analítica Estratégica en Áreas Clave del Negocio',
        'Industrialización de Modelos y MLOps',
    ],
};

const MINTEAR_SPRINT_TOPICS = {
    comunicacion: [
        'Comunicacion para el Liderazgo',
        'Liderar y Gestionar el Cambio',
        'Negociacion en los Negocios',
        'Presentaciones de Alto Impacto',
        'Oratoria para Negocios',
        'Comunicacion de Crisis',
    ],
    emprendimiento: [
        'Finanzas para Emprendedores',
        'Emprendimiento y Planificacion de Negocios',
        'Gestion de la Innovacion y el Crecimiento',
        'Estrategias de Precios',
        'Estrategia Legal y de Propiedad Intelectual',
        'Estrategias de inversion de capital de riesgo',
    ],
    finanzas: [
        'Finanzas Corporativas Avanzadas',
        'ESG en la Industria de Servicios Financieros',
        'Analitica Financiera e Innovacion',
        'Fondos de Cobertura',
        'Fusiones y Adquisiciones',
        'Ecosistemas Fintech y Finanzas Descentralizadas',
    ],
    talento: [
        'Gestion de Equipos',
        'Gestion del Talento',
        'Neurociencia del Liderazgo',
        'Construir relaciones solidas y equipos cohesionados',
        'Diseno Organizativo y Escalado del Talento',
        'Gestion del Desempeno y Sistemas de Evaluacion en Entornos Tecnologicos',
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
        'Estrategia e Implementacion de Inteligencia Artificial',
        'Gobernanza, Etica y Regulacion de la IA',
        'Ingenieria de Prompts para Directivos',
        'Diseno y Aplicacion de Agentes Inteligentes Generativos en la Empresa',
    ],
    mercado_cliente: [
        'Estrategia de Marketing Avanzada',
        'Comportamiento del Consumidor',
        'Vinculacion Digital y Lealtad',
        'Gestion de la Experiencia de Cliente y Customer Journey',
        'Analitica Comercial y Toma de Decisiones de Marketing',
        'Estrategia de Marca y Posicionamiento en Entornos Digitales',
    ],
    operaciones: [
        'Economia Global',
        'Estrategia de Cadena de Suministro',
        'Gestion de Riesgos en Cadenas de Suministro',
        'Analitica de Operaciones',
        'Economia Circular y Operaciones Sostenibles',
        'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
    ],
    analitica_datos: [
        'Analitica de datos para directivos',
        'Machine learning para la toma de decisiones empresariales',
        'Visualizacion de datos y cuadros de mando ejecutivos',
        'Analitica predictiva aplicada al negocio',
        'Gobierno del dato y calidad de la informacion',
        'Data-Driven management y cultura analitica',
    ],
};

const DATALAR_SPRINT_TOPICS = {
    comunicacion: [
        'Comunicacion para el Liderazgo',
        'Liderar y Gestionar el Cambio',
        'Negociacion en los Negocios',
        'Presentaciones de Alto Impacto',
        'Oratoria para Negocios',
        'Comunicacion de Crisis',
    ],
    emprendimiento: [
        'Finanzas para Emprendedores',
        'Emprendimiento y Planificacion de Negocios',
        'Gestion de la Innovacion y el Crecimiento',
        'Estrategias de Precios',
        'Estrategia Legal y de Propiedad Intelectual',
        'Estrategias de inversion de capital de riesgo',
    ],
    finanzas: [
        'Finanzas Corporativas Avanzadas',
        'ESG en la Industria de Servicios Financieros',
        'Analitica Financiera e Innovacion',
        'Fondos de Cobertura',
        'Fusiones y Adquisiciones',
        'Ecosistemas Fintech y Finanzas Descentralizadas',
    ],
    talento: [
        'Gestion de Equipos',
        'Gestion del Talento',
        'Neurociencia del Liderazgo',
        'Construir relaciones solidas y equipos cohesionados',
        'Diseno Organizativo y Escalado del Talento',
        'Gestion del Desempeno y Sistemas de Evaluacion en Entornos Tecnologicos',
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
        'Estrategia e Implementacion de Inteligencia Artificial',
        'Gobernanza, Etica y Regulacion de la IA',
        'Ingenieria de Prompts para Directivos',
        'Diseno y Aplicacion de Agentes Inteligentes Generativos en la Empresa',
    ],
    mercado_cliente: [
        'Estrategia de Marketing Avanzada',
        'Comportamiento del Consumidor',
        'Vinculacion Digital y Lealtad',
        'Gestion de la Experiencia de Cliente y Customer Journey',
        'Analitica Comercial y Toma de Decisiones de Marketing',
        'Estrategia de Marca y Posicionamiento en Entornos Digitales',
    ],
    operaciones: [
        'Economia Global',
        'Estrategia de Cadena de Suministro',
        'Gestion de Riesgos en Cadenas de Suministro',
        'Analitica de Operaciones',
        'Economia Circular y Operaciones Sostenibles',
        'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
    ],
    arquitectura_analitica_avanzada: [
        'Evaluacion Critica de Sistemas Analiticos Complejos',
        'Decision Ejecutiva Bajo Incertidumbre Algoritmica',
        'Gestion de Trade-offs Tecnicos, Financieros y Operativos en IA',
        'Responsabilidad Ejecutiva en Modelos Predictivos y Automatizacion',
        'Gobierno Corporativo Avanzado del Dato en Entornos Multijurisdiccionales',
        'Diseno de Estrategias de Ventaja Competitiva Basadas en Analitica Avanzada',
    ],
};

const MTECMBA_MASTER_MODULES = [
    {
        id: 'mtecmba_module_0',
        title: 'Mentalidad Directiva en Entornos Tecnologicos',
        order: 0,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Base directiva del master para entender empresa, producto, datos, finanzas, operaciones y liderazgo en contextos tecnologicos.',
        topics: [
            'Empresa, Estrategia y Modelo de Negocio Tecnologico',
            'Producto Digital, Cliente y Creacion de Valor',
            'Datos, Analitica e Inteligencia Artificial para Directivos',
            'Finanzas, Economia y Logica del Crecimiento',
            'Operaciones, Procesos y Escalabilidad Empresarial',
            'Gobernanza, Riesgos, Liderazgo',
        ],
    },
    {
        id: 'mtecmba_module_1',
        title: 'Estrategia empresarial y arquitectura tecnologica',
        order: 1,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Relacion entre estrategia competitiva, arquitectura empresarial y gobierno tecnologico.',
        topics: [
            'Estrategia competitiva en entornos digitales y tecnologicos',
            'Arquitectura tecnologica empresarial, modelos plataforma y economia del cloud',
            'Impacto de las decisiones tecnologicas y del uso de datos en la estrategia del negocio',
            'Gobierno tecnologico, alineacion estrategica y toma de decisiones directivas',
        ],
    },
    {
        id: 'mtecmba_module_2',
        title: 'Finanzas estrategicas y modelos de negocio tech',
        order: 2,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Valoracion, planificacion financiera y financiacion de negocios tecnologicos.',
        topics: [
            'Analisis de estados financieros y metricas de rendimiento en negocios digitales',
            'Metodos de valoracion de activos y empresas tecnologicas',
            'Planificacion financiera, gestion presupuestaria y control de caja en procesos de escalado',
            'Estructura de capital y financiacion de la innovacion tecnologica',
        ],
    },
    {
        id: 'mtecmba_module_3',
        title: 'Direccion de producto digital',
        order: 3,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Direccion de producto, UX/UI, metricas y uso de datos e IA en producto digital.',
        topics: [
            'Estrategia de producto y gestion del ciclo de vida',
            'Diseno de la experiencia de usuario y prototipado (UX/UI)',
            'Analitica de producto, metricas estrategicas y validacion de valor',
            'Integracion de datos e inteligencia artificial en la direccion de producto',
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
            'Modelos de crecimiento escalable y adquisicion',
            'Direccion de operaciones y escalado de servicios digitales basados en datos',
            'Gestion de la relacion con el cliente y customer success',
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
            'Diseno del modelo operativo y escalabilidad organizativa',
            'Estrategia de datos, gobierno de la informacion y analitica empresarial',
            'Automatizacion de procesos, operaciones de IA y eficiencia operativa',
            'Integracion de operaciones, tecnologia y toma de decisiones basadas en datos',
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
            'Gobierno corporativo y gestion de riesgos en empresas tecnologicas',
            'Gobernanza de datos, uso responsable de la inteligencia artificial y etica tecnologica',
            'Marco legal, propiedad intelectual y contratacion en entornos digitales',
            'ESG, sostenibilidad y responsabilidad corporativa en entornos tecnologicos',
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
            'Capital riesgo, analisis de inversiones y estrategias de financiacion',
            'Estructuracion y negociacion de rondas de financiacion: clausulas clave, control y retorno',
            'Emprendimiento corporativo y venture building',
            'Fusiones y adquisiciones en entornos tecnologicos',
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
            'Liderazgo en entornos tecnologicos y de alta incertidumbre',
            'Gestion del cambio, cultura organizativa y transformacion empresarial',
            'Direccion de equipos tecnologicos y multidisciplinares',
            'Toma de decisiones estrategicas en innovacion: priorizacion, experimentacion y escalado',
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
            'Creacion de Documentos y Presentaciones con IA',
            'IA para analisis y visualizacion de datos',
        ],
    },
    {
        id: 'mintear_module_2',
        title: 'IA para la Productividad, Automatizacion y Trabajo Colaborativo',
        order: 2,
        difficulty: 2,
        estimated_hours: 24,
        description: 'Uso de IA para organizar el trabajo, documentar, colaborar y producir contenido visual.',
        topics: [
            'Organizacion del Trabajo con IA',
            'Comunicacion y Documentacion Inteligente',
            'Trabajo Colaborativo con IA',
            'Creacion y Edicion de Imagenes con IA',
        ],
    },
    {
        id: 'mintear_module_3',
        title: 'IA en Estrategia Empresarial, Marketing y Seguridad',
        order: 3,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Aplicacion de IA en estrategia, marketing digital, contenido y gestion responsable de riesgos.',
        topics: [
            'Creacion de Estrategias de Marketing con IA',
            'Gestion de Redes Sociales con IA',
            'Creacion de Contenido Interactivo con IA',
            'Riesgos y Desafios Eticos en la IA Generativa en Empresas',
        ],
    },
    {
        id: 'mintear_module_4',
        title: 'Diseno Inteligente de Soluciones Automatizadas',
        order: 4,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Diseno de soluciones automatizadas con integraciones, datos, documentacion y control de versiones.',
        topics: [
            'Configuracion de entornos y estructuras basicas',
            'Manipulacion de datos y automatizacion inicial',
            'Integracion de APIs y generacion dinamica',
            'Documentacion tecnica y control de versiones',
        ],
    },
    {
        id: 'mintear_module_5',
        title: 'Procesos Inteligentes en Entornos Reales',
        order: 5,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Aplicacion de IA a generacion de contenido, flujos de datos y procesos funcionales reales.',
        topics: [
            'Generacion automatizada de contenido y sintesis',
            'Flujo de datos para decisiones inteligentes',
            'Automatizacion aplicada a procesos funcionales',
            'Reutilizacion y trazabilidad en entornos reales',
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
            'Interfaces funcionales para ejecucion de soluciones',
            'Publicacion y acceso desde navegador',
            'Interaccion con bases de datos en la nube o servicios conectados',
            'Monitorizacion del uso y metricas de rendimiento',
        ],
    },
    {
        id: 'mintear_module_7',
        title: 'Ciberseguridad, Etica y Marco Legal en la Inteligencia Artificial',
        order: 7,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Seguridad, proteccion de datos, etica y regulacion para sistemas basados en IA.',
        topics: [
            'Ciberseguridad en entornos con IA',
            'Proteccion de datos y cumplimiento normativo',
            'Etica y responsabilidad en el uso de la IA generativa',
            'Marco legal actual y tendencias regulatorias en IA',
        ],
    },
    {
        id: 'mintear_module_8',
        title: 'Liderando el Cambio en Proyectos de IA',
        order: 8,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Liderazgo y gestion del cambio para la implementacion y expansion estrategica de IA.',
        topics: [
            'Vision Estrategica y Alineacion Organizacional',
            'Gestion del Cambio en Entornos Inteligentes',
            'Competencias Directivas para Liderar la Transformacion con IA',
            'Implementacion y Expansion Estrategica de la IA',
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
        description: 'Fundamentos tecnicos y metodologicos para estructurar problemas cuantitativos y trabajar con datos en entornos profesionales.',
        topics: [
            'Pensamiento logico y estructuracion cuantitativa de problemas',
            'Programacion en Python para analisis y manipulacion de datos',
            'Gestion de datos con SQL y modelado relacional',
            'Estadistica aplicada al analisis empresarial',
            'Probabilidad, metricas y validacion de resultados',
            'Entorno profesional del Data Scientist y flujos de trabajo analitico',
        ],
    },
    {
        id: 'datalar_module_1',
        title: 'Modelado Predictivo y Machine Learning',
        order: 1,
        difficulty: 3,
        estimated_hours: 24,
        description: 'Diseno, entrenamiento, evaluacion y optimizacion de modelos predictivos para casos empresariales.',
        topics: [
            'Diseno e implementacion de modelos supervisados',
            'Segmentacion avanzada y aprendizaje no supervisado',
            'Evaluacion comparativa y seleccion de modelos',
            'Optimizacion y mejora del rendimiento predictivo',
        ],
    },
    {
        id: 'datalar_module_2',
        title: 'Ingenieria de Datos y Arquitecturas Escalables',
        order: 2,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Pipelines, Big Data, almacenamiento moderno y gobierno del dato para entornos productivos.',
        topics: [
            'Diseno de pipelines de datos en entornos productivos',
            'Procesamiento distribuido y ecosistemas Big Data',
            'Arquitecturas modernas de almacenamiento y explotacion del dato',
            'Gobernanza, calidad y seguridad de la informacion',
        ],
    },
    {
        id: 'datalar_module_3',
        title: 'Inteligencia Artificial y Deep Learning Aplicado',
        order: 3,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Aplicacion de arquitecturas neuronales, NLP, vision y modelos generativos al negocio.',
        topics: [
            'Arquitecturas neuronales para modelado complejo',
            'Procesamiento avanzado de lenguaje natural',
            'Vision por computador y analisis de datos no estructurados',
            'Modelos generativos y aplicaciones empresariales',
        ],
    },
    {
        id: 'datalar_module_4',
        title: 'Analitica Estrategica en Areas Clave del Negocio',
        order: 4,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Uso de analitica avanzada para marketing, finanzas, operaciones y experimentacion empresarial.',
        topics: [
            'Modelizacion predictiva en marketing y comportamiento del cliente',
            'Analitica financiera y gestion cuantitativa del riesgo',
            'Optimizacion operativa y analitica en cadenas de suministro',
            'Experimentacion y toma de decisiones basada en evidencia',
        ],
    },
    {
        id: 'datalar_module_5',
        title: 'Estrategia del Dato y Creacion de Valor Economico',
        order: 5,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Monetizacion del dato, evaluacion economica y asignacion estrategica de recursos en iniciativas analiticas.',
        topics: [
            'Monetizacion del dato y modelos de negocio data-driven',
            'Evaluacion financiera de proyectos de Data Science',
            'Escalabilidad tecnologica y ventaja competitiva',
            'Asignacion estrategica de recursos en iniciativas analiticas',
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
        description: 'Despliegue, automatizacion, monitorizacion y arquitecturas cloud para sistemas predictivos en produccion.',
        topics: [
            'Despliegue de modelos en entornos productivos',
            'Automatizacion y monitoreo de sistemas predictivos',
            'Arquitecturas cloud aplicadas a inteligencia artificial',
            'Rendimiento, escalabilidad y resiliencia analitica',
        ],
    },
    {
        id: 'datalar_module_8',
        title: 'Transformacion Empresarial Impulsada por Inteligencia Artificial',
        order: 8,
        difficulty: 4,
        estimated_hours: 24,
        description: 'Estrategia corporativa, automatizacion, gestion de riesgos y transformacion continua basada en IA y datos.',
        topics: [
            'Diseno de estrategias corporativas basadas en datos',
            'Reconfiguracion de modelos operativos mediante automatizacion',
            'Gestion de riesgos algoritmicos y regulacion en IA',
            'Innovacion continua en organizaciones data-driven',
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
    arquitectura_analitica_avanzada: 'aaa',
};

const buildSprintTopicId = (masterId, key, order) =>
    masterId === MTECMBA_ID
        ? `topic_${LEGACY_SPRINT_TOPIC_PREFIX[key]}_${order}`
        : `${masterId}_topic_${key}_${order}`;

const isSpecializationEnabledForMaster = (specialization, masterId) =>
    !Array.isArray(specialization.masters) || specialization.masters.includes(masterId);

const buildSprintContent = (masterId, topicsByKey) => {
    const enabledSpecializations = SPRINT_SPECIALIZATIONS.filter((specialization) =>
        isSpecializationEnabledForMaster(specialization, masterId)
    );

    const modules = enabledSpecializations.map((module) => ({
        id: buildSprintModuleId(masterId, module.key),
        master_id: masterId,
        catalog_type: 'sprint',
        specialization_id: module.specialization_id,
        title: module.title,
        order: module.order,
        difficulty: module.difficulty,
        estimated_hours: module.estimated_hours,
        description: module.description,
    }));

    const topics = enabledSpecializations.flatMap((module) =>
        (topicsByKey[module.key] || []).map((title, index) => ({
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

const DEFAULT_MASTER_ID = MTECMBA_ID;

const MASTER_SPRINT_TOPICS = {
    [MTECMBA_ID]: MTECMBA_SPRINT_TOPICS,
    [MINTEAR_ID]: MINTEAR_SPRINT_TOPICS,
    [DATALAR_ID]: DATALAR_SPRINT_TOPICS,
};

const SPECIALIZATION_METADATA = {
    comunicacion: {
        description: 'Desarrolla habilidades de comunicacion estrategica para liderar equipos, cambios y conversaciones de alto impacto.',
        keywords: ['comunicacion', 'liderazgo', 'presentaciones', 'oratoria', 'negociacion', 'crisis', 'relaciones publicas'],
    },
    emprendimiento: {
        description: 'Fortalece pensamiento emprendedor, crecimiento, pricing y estructuracion de negocios.',
        keywords: ['emprendimiento', 'startup', 'innovacion', 'pricing', 'venture', 'negocio', 'growth'],
    },
    finanzas: {
        description: 'Profundiza en finanzas corporativas, mercados e innovacion financiera.',
        keywords: ['finanzas', 'inversion', 'tesoreria', 'contabilidad', 'm&a', 'fintech', 'cfo'],
    },
    talento: {
        description: 'Desarrolla liderazgo humano, diseno organizacional y gestion de equipos.',
        keywords: ['talento', 'rrhh', 'people', 'liderazgo', 'equipos', 'desempeno', 'cultura'],
    },
    tecnologia: {
        description: 'Amplia criterio ejecutivo sobre arquitectura digital, ciberseguridad y tecnologias emergentes.',
        keywords: ['tecnologia', 'digital', 'cloud', 'devops', 'blockchain', 'iot', 'ciberseguridad'],
    },
    'ia-automatizacion': {
        description: 'Integra IA, automatizacion y agentes inteligentes con criterio estrategico.',
        keywords: ['ia', 'inteligencia artificial', 'automatizacion', 'machine learning', 'prompts', 'agentes', 'llm'],
    },
    'mercado-cliente': {
        description: 'Mejora estrategia comercial, experiencia de cliente y posicionamiento de marca.',
        keywords: ['marketing', 'cliente', 'customer', 'consumidor', 'marca', 'growth', 'lealtad'],
    },
    operaciones: {
        description: 'Fortalece criterio operativo, supply chain, riesgos y sostenibilidad.',
        keywords: ['operaciones', 'supply chain', 'logistica', 'riesgos', 'procesos', 'coo', 'eficiencia'],
    },
    'analitica-datos': {
        description: 'Convierte datos en decisiones ejecutivas con analitica avanzada y gobierno del dato.',
        keywords: ['datos', 'analitica', 'data', 'analytics', 'machine learning', 'bi', 'power bi', 'sql'],
    },
    'arquitectura-analitica-avanzada': {
        description: 'Disena y lidera arquitecturas analiticas avanzadas para decisiones estrategicas en escenarios complejos.',
        keywords: ['arquitectura de datos', 'data architecture', 'gobierno del dato', 'mlops', 'estrategia de datos', 'analytics engineering'],
    },
};

const SPECIALIZATION_BY_ID = Object.fromEntries(
    SPRINT_SPECIALIZATIONS.map((specialization) => [specialization.specialization_id, specialization])
);

const MODULE_TO_SPECIALIZATION_ID = Object.fromEntries(
    learningModules
        .filter((module) => module.catalog_type === 'sprint' && module.specialization_id)
        .map((module) => [module.id, module.specialization_id])
);

const normalizeMasterId = (masterId = '') => String(masterId || '').trim().toLowerCase();
const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const getTopicsByMasterId = (masterId) =>
    MASTER_SPRINT_TOPICS[normalizeMasterId(masterId)] || MASTER_SPRINT_TOPICS[DEFAULT_MASTER_ID];

const buildSpecialization = (specializationId, masterId = DEFAULT_MASTER_ID) => {
    const normalizedMasterId = normalizeMasterId(masterId) || DEFAULT_MASTER_ID;
    const specialization = SPECIALIZATION_BY_ID[specializationId];

    if (!specialization || !isSpecializationEnabledForMaster(specialization, normalizedMasterId)) {
        return null;
    }

    const topicsByMaster = getTopicsByMasterId(normalizedMasterId);
    const defaultTopicsByMaster = getTopicsByMasterId(DEFAULT_MASTER_ID);
    const subjects = topicsByMaster[specialization.key] || defaultTopicsByMaster[specialization.key] || [];
    const metadata = SPECIALIZATION_METADATA[specializationId] || {};
    const blocks = subjects.map((title, index) => ({
        id: `${specializationId}-block-${index + 1}`,
        title,
        order: index + 1,
    }));

    return {
        id: specialization.specialization_id,
        name: specialization.title.toUpperCase(),
        description: metadata.description || specialization.description,
        keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
        masterId: normalizedMasterId,
        subjects,
        blocks,
    };
};

const getMasterSpecializations = (masterId = DEFAULT_MASTER_ID) => {
    const normalizedMasterId = normalizeMasterId(masterId) || DEFAULT_MASTER_ID;

    return SPRINT_SPECIALIZATIONS
        .filter((specialization) => isSpecializationEnabledForMaster(specialization, normalizedMasterId))
        .map((specialization) => buildSpecialization(specialization.specialization_id, normalizedMasterId))
        .filter(Boolean);
};

const getAllSpecializations = (masterId = null) =>
    getMasterSpecializations(masterId || DEFAULT_MASTER_ID);

const getSpecializationById = (id, masterId = null) =>
    getAllSpecializations(masterId).find((specialization) => specialization.id === id) || null;

const getSpecializationIdByModuleId = (moduleId) => MODULE_TO_SPECIALIZATION_ID[moduleId] || null;

const getSpecializationNamesForPrompt = (masterId = null) =>
    getAllSpecializations(masterId)
        .map(
            (specialization) =>
                `- ${specialization.name} (${specialization.id}): ${specialization.blocks
                    .map((block) => block.title)
                    .join(' | ')}`
        )
        .join('\n');

const findBlockByTitle = ({ title, specializationId = null, masterId = null }) => {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) {
        return null;
    }

    const specializations = specializationId
        ? [getSpecializationById(specializationId, masterId)].filter(Boolean)
        : getAllSpecializations(masterId);

    for (const specialization of specializations) {
        const block = specialization.blocks.find((item) => normalizeText(item.title) === normalizedTitle);

        if (block) {
            return {
                ...block,
                specializationId: specialization.id,
                specializationName: specialization.name,
            };
        }
    }

    return null;
};

const findBlockById = ({ blockId, specializationId = null, masterId = null }) => {
    if (!blockId) {
        return null;
    }

    const specializations = specializationId
        ? [getSpecializationById(specializationId, masterId)].filter(Boolean)
        : getAllSpecializations(masterId);

    for (const specialization of specializations) {
        const block = specialization.blocks.find((item) => item.id === blockId);

        if (block) {
            return {
                ...block,
                specializationId: specialization.id,
                specializationName: specialization.name,
            };
        }
    }

    return null;
};

const resolveCatalogBlock = ({ masterId = null, specializationId = null, blockId = null, title = null }) =>
    findBlockById({ blockId, specializationId, masterId }) ||
    findBlockByTitle({ title, specializationId, masterId });

const SPECIALIZATIONS = Object.fromEntries(
    getAllSpecializations(DEFAULT_MASTER_ID).map((specialization) => [specialization.id.toUpperCase(), specialization])
);

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
    DEFAULT_MASTER_ID,
    masters: MASTERS,
    learningModules,
    topics,
    MODULE_TO_SPECIALIZATION_ID,
    SPECIALIZATIONS,
    buildSpecialization,
    getAllSpecializations,
    getMasterSpecializations,
    getSpecializationById,
    getSpecializationIdByModuleId,
    getSpecializationNamesForPrompt,
    findBlockByTitle,
    findBlockById,
    resolveCatalogBlock,
    seedLearningContent,
};
