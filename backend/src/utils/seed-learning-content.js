const { db, COLLECTIONS } = require('../config/firebase');

const learningModules = [
    {
        id: 'module_comunicacion',
        title: 'Comunicación',
        order: 1,
        difficulty: 2,
        estimated_hours: 30,
        description: 'Habilidades de comunicación estratégica para liderazgo y negocios',
    },
    {
        id: 'module_emprendimiento',
        title: 'Emprendimiento',
        order: 2,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Creación, financiación y crecimiento de empresas innovadoras',
    },
    {
        id: 'module_finanzas',
        title: 'Finanzas',
        order: 3,
        difficulty: 4,
        estimated_hours: 30,
        description: 'Gestión financiera avanzada y mercados financieros',
    },
    {
        id: 'module_talento',
        title: 'Talento',
        order: 4,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestión estratégica de talento y liderazgo organizacional',
    },
    {
        id: 'module_tecnologia',
        title: 'Tecnología',
        order: 5,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Tecnologías empresariales, arquitectura digital e innovación tecnológica',
    },
    {
        id: 'module_ia',
        title: 'Inteligencia Artificial y Automatización',
        order: 6,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Aplicación estratégica de inteligencia artificial en empresas',
    },
    {
        id: 'module_mercado_cliente',
        title: 'Mercado y Cliente',
        order: 7,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Marketing estratégico, comportamiento del consumidor y experiencia del cliente',
    },
    {
        id: 'module_operaciones',
        title: 'Operaciones y Entorno',
        order: 8,
        difficulty: 3,
        estimated_hours: 30,
        description: 'Gestión de operaciones, cadenas de suministro y economía global',
    },
    {
        id: 'module_analitica_datos',
        title: 'Analítica de Datos y Decisión Empresarial',
        order: 9,
        difficulty: 4,
        estimated_hours: 35,
        description: 'Uso de datos y analítica avanzada para toma de decisiones empresariales',
    },
];

const topics = [
    { id: 'topic_com_1', module_id: 'module_comunicacion', title: 'Comunicación para el Liderazgo', order: 1 },
    { id: 'topic_com_2', module_id: 'module_comunicacion', title: 'Liderar y Gestionar el Cambio', order: 2 },
    { id: 'topic_com_3', module_id: 'module_comunicacion', title: 'Negociación en los Negocios', order: 3 },
    { id: 'topic_com_4', module_id: 'module_comunicacion', title: 'Presentaciones de Alto Impacto', order: 4 },
    { id: 'topic_com_5', module_id: 'module_comunicacion', title: 'Oratoria para Negocios', order: 5 },
    { id: 'topic_com_6', module_id: 'module_comunicacion', title: 'Comunicación de Crisis', order: 6 },
    { id: 'topic_emp_1', module_id: 'module_emprendimiento', title: 'Finanzas para Emprendedores', order: 1 },
    { id: 'topic_emp_2', module_id: 'module_emprendimiento', title: 'Emprendimiento y Planificación de Negocios', order: 2 },
    { id: 'topic_emp_3', module_id: 'module_emprendimiento', title: 'Gestión de la Innovación y el Crecimiento', order: 3 },
    { id: 'topic_emp_4', module_id: 'module_emprendimiento', title: 'Estrategias de Precios', order: 4 },
    { id: 'topic_emp_5', module_id: 'module_emprendimiento', title: 'Estrategia Legal y de Propiedad Intelectual', order: 5 },
    { id: 'topic_emp_6', module_id: 'module_emprendimiento', title: 'Estrategias de inversión de capital de riesgo', order: 6 },
    { id: 'topic_fin_1', module_id: 'module_finanzas', title: 'Finanzas Corporativas Avanzadas', order: 1 },
    { id: 'topic_fin_2', module_id: 'module_finanzas', title: 'ESG en la Industria de Servicios Financieros', order: 2 },
    { id: 'topic_fin_3', module_id: 'module_finanzas', title: 'Analítica Financiera e Innovación', order: 3 },
    { id: 'topic_fin_4', module_id: 'module_finanzas', title: 'Fondos de Cobertura', order: 4 },
    { id: 'topic_fin_5', module_id: 'module_finanzas', title: 'Fusiones y Adquisiciones', order: 5 },
    { id: 'topic_fin_6', module_id: 'module_finanzas', title: 'Ecosistemas Fintech y Finanzas Descentralizadas', order: 6 },
    { id: 'topic_tal_1', module_id: 'module_talento', title: 'Gestión de Equipos', order: 1 },
    { id: 'topic_tal_2', module_id: 'module_talento', title: 'Gestión del Talento', order: 2 },
    { id: 'topic_tal_3', module_id: 'module_talento', title: 'Neurociencia del Liderazgo', order: 3 },
    { id: 'topic_tal_4', module_id: 'module_talento', title: 'Construir relaciones sólidas y equipos cohesionados', order: 4 },
    { id: 'topic_tal_5', module_id: 'module_talento', title: 'Diseño Organizativo y Escalado del Talento', order: 5 },
    { id: 'topic_tal_6', module_id: 'module_talento', title: 'Gestión del Desempeño y Sistemas de Evaluación en Entornos Tecnológicos', order: 6 },
    { id: 'topic_tec_1', module_id: 'module_tecnologia', title: 'Estrategia de Ciberseguridad', order: 1 },
    { id: 'topic_tec_2', module_id: 'module_tecnologia', title: 'Cloud y DevOps para Directivos', order: 2 },
    { id: 'topic_tec_3', module_id: 'module_tecnologia', title: 'Blockchain y Activos Digitales', order: 3 },
    { id: 'topic_tec_4', module_id: 'module_tecnologia', title: 'Internet de las Cosas (IoT) e Industria 4.0', order: 4 },
    { id: 'topic_tec_5', module_id: 'module_tecnologia', title: 'Arquitecturas Digitales y Plataformas Tecnológicas', order: 5 },
    { id: 'topic_tec_6', module_id: 'module_tecnologia', title: 'Tecnologías Emergentes Aplicadas a la Empresa', order: 6 },
    { id: 'topic_ia_1', module_id: 'module_ia', title: 'IA y Deep Learning para Negocios', order: 1 },
    { id: 'topic_ia_2', module_id: 'module_ia', title: 'IA para la Productividad Empresarial', order: 2 },
    { id: 'topic_ia_3', module_id: 'module_ia', title: 'Estrategia e Implementación de Inteligencia Artificial', order: 3 },
    { id: 'topic_ia_4', module_id: 'module_ia', title: 'Gobernanza, Ética y Regulación de la IA', order: 4 },
    { id: 'topic_ia_5', module_id: 'module_ia', title: 'Ingeniería de Prompts para Directivos', order: 5 },
    { id: 'topic_ia_6', module_id: 'module_ia', title: 'Diseño y Aplicación de Agentes Inteligentes Generativos en la Empresa', order: 6 },
    { id: 'topic_mc_1', module_id: 'module_mercado_cliente', title: 'Estrategia de Marketing Avanzada', order: 1 },
    { id: 'topic_mc_2', module_id: 'module_mercado_cliente', title: 'Comportamiento del Consumidor', order: 2 },
    { id: 'topic_mc_3', module_id: 'module_mercado_cliente', title: 'Vinculación Digital y Lealtad', order: 3 },
    { id: 'topic_mc_4', module_id: 'module_mercado_cliente', title: 'Gestión de la Experiencia de Cliente y Customer Journey', order: 4 },
    { id: 'topic_mc_5', module_id: 'module_mercado_cliente', title: 'Analítica Comercial y Toma de Decisiones de Marketing', order: 5 },
    { id: 'topic_mc_6', module_id: 'module_mercado_cliente', title: 'Estrategia de Marca y Posicionamiento en Entornos Digitales', order: 6 },
    { id: 'topic_op_1', module_id: 'module_operaciones', title: 'Economía Global', order: 1 },
    { id: 'topic_op_2', module_id: 'module_operaciones', title: 'Estrategia de Cadena de Suministro', order: 2 },
    { id: 'topic_op_3', module_id: 'module_operaciones', title: 'Gestión de Riesgos en Cadenas de Suministro', order: 3 },
    { id: 'topic_op_4', module_id: 'module_operaciones', title: 'Analítica de Operaciones', order: 4 },
    { id: 'topic_op_5', module_id: 'module_operaciones', title: 'Economía Circular y Operaciones Sostenibles', order: 5 },
    { id: 'topic_op_6', module_id: 'module_operaciones', title: 'Resiliencia Operativa y Continuidad del Negocio en Entornos Digitales', order: 6 },
    { id: 'topic_ad_1', module_id: 'module_analitica_datos', title: 'Analítica de datos para directivos', order: 1 },
    { id: 'topic_ad_2', module_id: 'module_analitica_datos', title: 'Machine learning para la toma de decisiones empresariales', order: 2 },
    { id: 'topic_ad_3', module_id: 'module_analitica_datos', title: 'Visualización de datos y cuadros de mando ejecutivos', order: 3 },
    { id: 'topic_ad_4', module_id: 'module_analitica_datos', title: 'Analítica predictiva aplicada al negocio', order: 4 },
    { id: 'topic_ad_5', module_id: 'module_analitica_datos', title: 'Gobierno del dato y calidad de la información', order: 5 },
    { id: 'topic_ad_6', module_id: 'module_analitica_datos', title: 'Data-Driven management y cultura analítica', order: 6 },
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
    await seedCollection(COLLECTIONS.LEARNING_MODULES, learningModules);
    await seedCollection(COLLECTIONS.TOPICS, topics);

    return {
        modules: learningModules.length,
        topics: topics.length,
    };
};

module.exports = {
    learningModules,
    topics,
    seedLearningContent,
};
