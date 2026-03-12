/**
 * LAR University - Specializations Data
 * Complete catalog of all specializations and their subjects
 */

const SPECIALIZATIONS = {
    COMUNICACION: {
        id: 'comunicacion',
        name: 'COMUNICACIÓN',
        emoji: '🎤',
        description: 'Desarrolla habilidades de comunicación estratégica para líderes empresariales',
        color: '#6366f1',
        sprintUrl: 'https://lar.university/sprints/comunicacion',
        keywords: ['comunicación', 'liderazgo', 'presentaciones', 'oratoria', 'negociación', 'crisis', 'relaciones públicas', 'medios', 'discurso', 'persuasión'],
        subjects: [
            'Comunicación para el Liderazgo',
            'Liderar y Gestionar el Cambio',
            'Negociación en los Negocios',
            'Presentaciones de Alto Impacto',
            'Oratoria para Negocios',
            'Comunicación de Crisis',
        ],
    },

    EMPRENDIMIENTO: {
        id: 'emprendimiento',
        name: 'EMPRENDIMIENTO',
        emoji: '🚀',
        description: 'Construye y escala tu startup con estrategias probadas de emprendimiento',
        color: '#f59e0b',
        sprintUrl: 'https://lar.university/sprints/emprendimiento',
        keywords: ['emprendimiento', 'startup', 'innovación', 'finanzas', 'negocio', 'fundador', 'ceo', 'entrepreneur', 'venture', 'capital riesgo', 'inversión', 'propiedad intelectual'],
        subjects: [
            'Finanzas para Emprendedores',
            'Emprendimiento y Planificación de Negocios',
            'Gestión de la Innovación y el Crecimiento',
            'Estrategias de Precios',
            'Estrategia Legal y de Propiedad Intelectual',
            'Estrategias de inversión de capital de riesgo',
        ],
    },

    FINANZAS: {
        id: 'finanzas',
        name: 'FINANZAS',
        emoji: '💹',
        description: 'Domina las finanzas corporativas avanzadas y los mercados financieros globales',
        color: '#10b981',
        sprintUrl: 'https://lar.university/sprints/finanzas',
        keywords: ['finanzas', 'inversión', 'mercados', 'banca', 'contabilidad', 'tesorería', 'cfo', 'hedge fund', 'fusiones', 'adquisiciones', 'esg', 'fintech', 'cripto', 'defi'],
        subjects: [
            'Finanzas Corporativas Avanzadas',
            'ESG en la Industria de Servicios Financieros',
            'Analítica Financiera e Innovación',
            'Fondos de Cobertura',
            'Fusiones y Adquisiciones',
            'Ecosistemas Fintech y Finanzas Descentralizadas',
        ],
    },

    TALENTO: {
        id: 'talento',
        name: 'TALENTO',
        emoji: '👥',
        description: 'Lidera equipos de alto rendimiento y gestiona el talento organizacional',
        color: '#ec4899',
        sprintUrl: 'https://lar.university/sprints/talento',
        keywords: ['recursos humanos', 'rrhh', 'hr', 'talento', 'equipos', 'liderazgo', 'cultura', 'organización', 'people', 'neurociencia', 'coaching', 'desempeño', 'evaluación'],
        subjects: [
            'Gestión de Equipos',
            'Gestión del Talento',
            'Neurociencia del Liderazgo',
            'Construir relaciones sólidas y equipos cohesionados',
            'Diseño Organizativo y Escalado del Talento',
            'Gestión del Desempeño y Sistemas de Evaluación en Entornos Tecnológicos',
        ],
    },

    TECNOLOGIA: {
        id: 'tecnologia',
        name: 'TECNOLOGÍA',
        emoji: '⚡',
        description: 'Comprende y lidera la transformación digital con tecnologías emergentes',
        color: '#3b82f6',
        sprintUrl: 'https://lar.university/sprints/tecnologia',
        keywords: ['tecnología', 'ciberseguridad', 'cloud', 'devops', 'blockchain', 'iot', 'industria 4.0', 'arquitectura digital', 'plataformas', 'cto', 'it', 'infraestructura', 'digital'],
        subjects: [
            'Estrategia de Ciberseguridad',
            'Cloud y DevOps para Directivos',
            'Blockchain y Activos Digitales',
            'Internet de las Cosas (IoT) e Industria 4.0',
            'Arquitecturas Digitales y Plataformas Tecnológicas',
            'Tecnologías Emergentes Aplicadas a la Empresa',
        ],
    },

    IA_AUTOMATIZACION: {
        id: 'ia-automatizacion',
        name: 'INTELIGENCIA ARTIFICIAL Y AUTOMATIZACIÓN',
        emoji: '🤖',
        description: 'Implementa y lidera estrategias de IA para transformar tu empresa',
        color: '#8b5cf6',
        sprintUrl: 'https://lar.university/sprints/ia-automatizacion',
        keywords: ['inteligencia artificial', 'ia', 'machine learning', 'deep learning', 'automatización', 'nlp', 'chatgpt', 'llm', 'agentes', 'prompts', 'gobernanza ia', 'ética ia', 'ai'],
        subjects: [
            'IA y Deep Learning para Negocios',
            'IA para la Productivity Empresarial',
            'Estrategia e Implementación de Inteligencia Artificial',
            'Gobernanza, Ética y Regulación de la IA',
            'Ingeniería de Prompts para Directivos',
            'Diseño y Aplicación de Agentes Inteligentes Generativos en la Empresa',
        ],
    },

    MERCADO_CLIENTE: {
        id: 'mercado-cliente',
        name: 'MERCADO Y CLIENTE',
        emoji: '🎯',
        description: 'Domina el marketing avanzado y la gestión de experiencia del cliente',
        color: '#f97316',
        sprintUrl: 'https://lar.university/sprints/mercado-cliente',
        keywords: ['marketing', 'ventas', 'cliente', 'consumidor', 'marca', 'digital marketing', 'crm', 'customer experience', 'cx', 'ecommerce', 'growth', 'branding', 'posicionamiento'],
        subjects: [
            'Estrategia de Marketing Avanzada',
            'Comportamiento del Consumidor',
            'Vinculación Digital y Lealtad',
            'Gestión de la Experiencia de Cliente y Customer Journey',
            'Analítica Comercial y Toma de Decisiones de Marketing',
            'Estrategia de Marca y Posicionamiento en Entornos Digitales',
        ],
    },

    OPERACIONES: {
        id: 'operaciones',
        name: 'OPERACIONES Y ENTORNO',
        emoji: '⚙️',
        description: 'Optimiza operaciones y cadena de suministro en entornos globales',
        color: '#14b8a6',
        sprintUrl: 'https://lar.university/sprints/operaciones',
        keywords: ['operaciones', 'supply chain', 'cadena de suministro', 'logística', 'economía', 'riesgos', 'sostenibilidad', 'resiliencia', 'continuidad', 'coo', 'procesos', 'eficiencia'],
        subjects: [
            'Economía Global',
            'Estrategia de Cadena de Suministro',
            'Gestión de Riesgos en Cadenas de Suministro',
            'Analítica de Operaciones',
            'Economía Circular y Operaciones Sostenibles',
            'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales',
        ],
    },

    ANALITICA_DATOS: {
        id: 'analitica-datos',
        name: 'ANALÍTICA DE DATOS Y DECISIÓN EMPRESARIAL',
        emoji: '📊',
        description: 'Transforma datos en decisiones estratégicas con analítica avanzada',
        color: '#06b6d4',
        sprintUrl: 'https://lar.university/sprints/analitica-datos',
        keywords: ['datos', 'analítica', 'data', 'analytics', 'business intelligence', 'bi', 'machine learning', 'visualización', 'dashboard', 'kpi', 'data science', 'estadística', 'sql', 'python', 'tableau', 'power bi', 'data analyst', 'analista de datos', 'data driven'],
        subjects: [
            'Analítica de datos para directivos',
            'Machine learning para la toma de decisiones empresariales',
            'Visualización de datos y cuadros de mando ejecutivos',
            'Analítica predictiva aplicada al negocio',
            'Gobierno del dato y calidad de la información',
            'Data-Driven management y cultura analítica',
        ],
    },
};

const MODULE_TO_SPECIALIZATION_ID = {
    module_comunicacion: 'comunicacion',
    module_emprendimiento: 'emprendimiento',
    module_finanzas: 'finanzas',
    module_talento: 'talento',
    module_tecnologia: 'tecnologia',
    module_ia: 'ia-automatizacion',
    module_mercado_cliente: 'mercado-cliente',
    module_operaciones: 'operaciones',
    module_analitica_datos: 'analitica-datos',
};

// Helper: Get all specializations as array
const getAllSpecializations = () => Object.values(SPECIALIZATIONS);

// Helper: Get specialization by ID
const getSpecializationById = (id) =>
    Object.values(SPECIALIZATIONS).find((s) => s.id === id);

const getSpecializationIdByModuleId = (moduleId) => MODULE_TO_SPECIALIZATION_ID[moduleId] || null;

// Helper: Get specialization names for AI prompt
const getSpecializationNamesForPrompt = () =>
    Object.values(SPECIALIZATIONS)
        .map((s) => `- Sprint ${s.name}: ${s.keywords.slice(0, 5).join(', ')}`)
        .join('\n');

module.exports = {
    SPECIALIZATIONS,
    MODULE_TO_SPECIALIZATION_ID,
    getAllSpecializations,
    getSpecializationById,
    getSpecializationIdByModuleId,
    getSpecializationNamesForPrompt,
};
