export const CHAT_JOURNEY_STAGES = {
    SELECT_MASTER: 'select_master',
    UPLOAD_CV: 'upload_cv',
    REVIEW_RECOMMENDATION: 'review_recommendation',
};

export const resolveChatJourneyStage = ({
    selectedMaster = null,
    cvAnalysisId = null,
    recommendation = null,
} = {}) => {
    if (!selectedMaster?.id) {
        return CHAT_JOURNEY_STAGES.SELECT_MASTER;
    }

    if (!cvAnalysisId && !recommendation) {
        return CHAT_JOURNEY_STAGES.UPLOAD_CV;
    }

    return CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION;
};

const STAGE_QUESTIONS = {
    [CHAT_JOURNEY_STAGES.SELECT_MASTER]: [
        'Como funciona la plataforma?',
        'Que pasa despues de elegir mi MBA?',
        'Que necesito para recibir recomendaciones?',
        'Como se usa el CV dentro del sistema?',
    ],
    [CHAT_JOURNEY_STAGES.UPLOAD_CV]: [
        'Como analizan mi CV?',
        'Que recomendaciones recibire al subir mi CV?',
        'Que informacion toma en cuenta la plataforma?',
        'Como se genera mi ruta personalizada?',
    ],
    [CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION]: [
        'Por que me recomendaron esta ruta?',
        'Que bloque deberia priorizar primero?',
        'Que cursos encajan mejor con mi perfil?',
        'Como aprovecho este MBA en mi trabajo actual?',
    ],
};

export const getSuggestedQuestionsForStage = (stage) =>
    STAGE_QUESTIONS[stage] || STAGE_QUESTIONS[CHAT_JOURNEY_STAGES.SELECT_MASTER];

export const getChatEmptyStateCopy = ({ stage, selectedMasterDisplayName }) => {
    switch (stage) {
    case CHAT_JOURNEY_STAGES.SELECT_MASTER:
        return {
            title: 'Bienvenido al sistema',
            text: 'Selecciona tu MBA para activar el contexto inicial y luego podras cargar tu CV para generar recomendaciones personalizadas.',
            placeholder: 'Elige un MBA para comenzar...',
        };
    case CHAT_JOURNEY_STAGES.UPLOAD_CV:
        return {
            title: 'Sistema listo para analizar tu perfil',
            text: `Ya puedes explorar ${selectedMasterDisplayName || 'tu MBA'}. Cuando cargues tu CV, la IA generara recomendaciones y una ruta personalizada.`,
            placeholder: `Pregunta por ${selectedMasterDisplayName || 'tu MBA'} o carga tu CV...`,
        };
    case CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION:
        return {
            title: 'Sistema listo para conversar',
            text: `Pregunta por tu recomendacion, los bloques sugeridos o el contenido de ${selectedMasterDisplayName || 'tu MBA'}.`,
            placeholder: `Pregunta sobre ${selectedMasterDisplayName || 'tu ruta'}...`,
        };
    default:
        return {
            title: 'Sistema listo para conversar',
            text: 'La IA puede ayudarte a entender el flujo y tus recomendaciones.',
            placeholder: 'Escribe tu pregunta...',
        };
    }
};
