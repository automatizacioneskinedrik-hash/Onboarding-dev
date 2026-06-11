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
        '¿Como funciona la plataforma?',
        '¿Que pasa despues de elegir mi Master?',
        '¿Que necesito para recibir recomendaciones?',
        '¿Como se usa el CV dentro del sistema?',
    ],
    [CHAT_JOURNEY_STAGES.UPLOAD_CV]: [
        '¿Como analizan mi CV?',
        '¿Que recomendaciones recibire al subir mi CV?',
        '¿Que informacion toma en cuenta la plataforma?',
        '¿Como se genera mi ruta personalizada?',
    ],
    [CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION]: [
        '¿Por que me recomendaron esta ruta?',
        '¿Que sprint deberia priorizar primero?',
        '¿Que sprints encajan mejor con mi perfil?',
        '¿Como aprovecho este Master en mi trabajo actual?',
    ],
};

export const getSuggestedQuestionsForStage = (stage) =>
    STAGE_QUESTIONS[stage] || STAGE_QUESTIONS[CHAT_JOURNEY_STAGES.SELECT_MASTER];

export const getChatEmptyStateCopy = ({ stage, selectedMasterDisplayName }) => {
    switch (stage) {
    case CHAT_JOURNEY_STAGES.SELECT_MASTER:
        return {
            title: 'Bienvenido al sistema',
            text: 'Selecciona tu Master para activar el contexto inicial y luego podras cargar tu CV para generar recomendaciones personalizadas.',
            placeholder: 'Elige un Master para comenzar...',
        };
    case CHAT_JOURNEY_STAGES.UPLOAD_CV:
        return {
            title: 'Sistema listo para analizar tu perfil',
            text: `Paso a paso: 1. Explora ${selectedMasterDisplayName || 'tu Master'}. 2. Carga tu CV. 3. Recibe recomendaciones y tu ruta personalizada.`,
            placeholder: `Pregunta por ${selectedMasterDisplayName || 'tu Master'} o carga tu CV...`,
        };
    case CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION:
        return {
            title: 'Sistema listo para conversar',
            text: `Pregunta por tu recomendacion, los sprints sugeridos o el contenido de ${selectedMasterDisplayName || 'tu Master'}.`,
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
