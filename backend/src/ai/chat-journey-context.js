const { getMasterById } = require('../utils/masters');

const MAX_USER_INTERACTIONS = 20;

const CHAT_JOURNEY_STAGES = {
    SELECT_MASTER: 'select_master',
    UPLOAD_CV: 'upload_cv',
    REVIEW_RECOMMENDATION: 'review_recommendation',
};

const STAGE_CONFIG = {
    [CHAT_JOURNEY_STAGES.SELECT_MASTER]: {
        label: 'Selección de Master pendiente',
        assistantGoals: [
            'Dar una bienvenida calida al sistema.',
            'Explicar que el flujo comienza seleccionando un Master.',
            'Indicar que despues debe cargar su CV en PDF para generar recomendaciones personalizadas.',
        ],
        nextStep: 'Invita al usuario a seleccionar el Master con el que desea trabajar antes de hablar de una ruta personalizada.',
        starterQuestions: [
            '¿Cómo funciona la recomendación personalizada?',
            '¿Qué pasa después de elegir mi Master?',
            '¿Qué necesito cargar para recibir mi ruta?',
        ],
    },
    [CHAT_JOURNEY_STAGES.UPLOAD_CV]: {
        label: 'Master seleccionado, CV pendiente',
        assistantGoals: [
            'Dar una bienvenida calida al sistema.',
            'Explicar que el Master ya esta definido como contexto base.',
            'Guiar al usuario para subir su CV en PDF y activar el analisis personalizado.',
            'Responder dudas generales del Master sin inventar una recomendacion que aun no existe.',
        ],
        nextStep: 'Invita al usuario a cargar su CV en PDF para analizar su perfil y construir su ruta recomendada.',
        starterQuestions: [
            '¿Cómo analizan mi CV?',
            '¿Qué recomendaciones recibire al subir mi CV?',
            '¿Qué información toma en cuenta la plataforma?',
        ],
    },
    [CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION]: {
        label: 'CV analizado y recomendación disponible',
        assistantGoals: [
            'Dar una bienvenida breve y profesional cuando el usuario lo necesite.',
            'Explicar la logica de la ruta recomendada y como se relaciona con el perfil del usuario.',
            'Aterrizar el valor de los sprints sugeridos a objetivos laborales concretos.',
            'Proponer el siguiente paso mas util dentro del sistema.',
        ],
        nextStep: 'Invita al usuario a explorar por que se eligieron sus sprints, que priorizar y como aplicar la ruta en su trabajo.',
        starterQuestions: [
            '¿Por qué me recomendaron esta ruta?',
            '¿Qué sprint deberia priorizar primero?',
            '¿Cómo aplico esta recomendación en mi trabajo actual?',
        ],
    },
};

const formatUserName = (userName) => {
    const normalized = String(userName || '').trim();

    if (!normalized) {
        return null;
    }

    return normalized.split(/\s+/)[0];
};

const resolveSelectedMasterName = (selectedMasterId) => {
    if (!selectedMasterId) {
        return null;
    }

    const master = getMasterById(selectedMasterId);
    return master?.code || master?.name || selectedMasterId;
};

const resolveChatJourneyContext = ({
    userName = null,
    selectedMasterId = null,
    cvAnalysisId = null,
    userProfile = null,
    recommendation = null,
    userMessageCount = 0,
    maxUserInteractions = MAX_USER_INTERACTIONS,
} = {}) => {
    const hasSelectedMaster = Boolean(selectedMasterId);
    const hasUserProfile = Boolean(userProfile);
    const hasRecommendation = Boolean(recommendation);
    const selectedMasterName = resolveSelectedMasterName(selectedMasterId);

    let stage = CHAT_JOURNEY_STAGES.SELECT_MASTER;

    if (hasSelectedMaster) {
        stage = hasUserProfile || hasRecommendation
            ? CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION
            : CHAT_JOURNEY_STAGES.UPLOAD_CV;
    }

    const config = STAGE_CONFIG[stage];

    const normalizedMaxInteractions = Number.isInteger(maxUserInteractions) && maxUserInteractions > 0
        ? maxUserInteractions
        : MAX_USER_INTERACTIONS;

    return {
        key: stage,
        label: config.label,
        userName: formatUserName(userName),
        selectedMasterId,
        selectedMasterName,
        hasSelectedMaster,
        hasCvAnalysis: Boolean(cvAnalysisId),
        hasUserProfile,
        hasRecommendation,
        userMessageCount,
        maxUserInteractions: normalizedMaxInteractions,
        remainingInteractions: Math.max(0, normalizedMaxInteractions - userMessageCount),
        isOutOfInteractions: userMessageCount >= normalizedMaxInteractions,
        shouldSendWelcome: userMessageCount <= 1,
        assistantGoals: config.assistantGoals,
        nextStep: config.nextStep,
        starterQuestions: config.starterQuestions,
    };
};

const buildChatJourneyPromptSection = (journeyContext = {}) => {
    const assistantGoals = (journeyContext.assistantGoals || [])
        .map((goal, index) => `${index + 1}. ${goal}`)
        .join('\n');

    const starterQuestions = (journeyContext.starterQuestions || [])
        .map((question, index) => `${index + 1}. ${question}`)
        .join('\n');

    return `CONTEXTO DE EXPERIENCIA DEL USUARIO:
- Etapa actual: ${journeyContext.label || 'No definida'}
- Master seleccionado: ${journeyContext.selectedMasterName || 'Sin seleccionar'}
- CV analizado: ${journeyContext.hasUserProfile ? 'Si' : 'No'}
- Recomendación disponible: ${journeyContext.hasRecommendation ? 'Si' : 'No'}
- Interacciones restantes para definir ruta: ${journeyContext.remainingInteractions ?? 'Desconocidas'} de ${journeyContext.maxUserInteractions || MAX_USER_INTERACTIONS}
- Primera interacción real del usuario: ${journeyContext.shouldSendWelcome ? 'Si' : 'No'}

OBJETIVOS DEL ASISTENTE EN ESTA ETAPA:
${assistantGoals || '1. Guiar al usuario con claridad y siguiente paso accionable.'}

SIGUIENTE PASO ESPERADO:
${journeyContext.nextStep || 'Invita al usuario a avanzar dentro del flujo principal.'}

PREGUNTAS GUIA SUGERIDAS:
${starterQuestions || '1. ¿Cómo funciona el sistema?'}

REGLAS DE COMPORTAMIENTO:
- Si es la primera interacción real del usuario, comienza con una bienvenida calida a LÄR University y explica brevemente cómo funciona la plataforma antes de responder el resto de la consulta.
- Si el usuario saluda, pide ayuda general o no sabe por donde empezar, explicale brevemente el flujo de la plataforma.
- El flujo oficial es: seleccionar Master, cargar CV en PDF, analizar el perfil y generar recomendaciones personalizadas.
- Si todavia no existe analisis de CV, puedes resolver dudas generales del sistema o del Master, pero no inventes una recomendacion personalizada.
- Si ya existe recomendacion, conecta siempre la respuesta con el perfil del usuario y con la ruta sugerida.
- Cierra cada respuesta con una accion concreta que el usuario pueda hacer dentro del sistema.`;
};

module.exports = {
    CHAT_JOURNEY_STAGES,
    MAX_USER_INTERACTIONS,
    resolveChatJourneyContext,
    buildChatJourneyPromptSection,
};
