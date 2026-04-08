const { CHAT_JOURNEY_STAGES } = require('./chat-journey-context');

const buildWelcomeAssistantMessage = ({ journeyContext = {} } = {}) => {
    const namePrefix = journeyContext.userName ? `${journeyContext.userName}, ` : '';
    const selectedMaster = journeyContext.selectedMasterName || 'tu Master';

    switch (journeyContext.key) {
    case CHAT_JOURNEY_STAGES.SELECT_MASTER:
        return `Bienvenido a LÄR University, ${namePrefix}estoy aqui para ayudarte a descubrir la ruta académica que mejor encaja con tu perfil.

Así funciona el sistema:
1. Primero eliges el Master que quieres explorar.
2. Luego cargas tu CV en PDF para analizar tu experiencia, habilidades y trayectoria.
3. Con ese análisis generamos recomendaciones personalizadas y una ruta que puedes revisar conmigo en este chat.

Cuando selecciones tu Master, te acompaño con el siguiente paso para activar tu recomendación.`;

    case CHAT_JOURNEY_STAGES.UPLOAD_CV:
        return `Bienvenido a LÄR University, ${namePrefix}ya tengo como contexto base el Master ${selectedMaster}.

Desde aquí el flujo es muy simple:
1. Carga tu CV en PDF.
2. Analizamos tu perfil profesional.
3. Generamos recomendaciones y una ruta académica personalizada para ese Master.

Si quieres, tambien puedo explicarte que tipo de informacion tomamos en cuenta antes de que subas tu CV.`;

    case CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION:
        return `Bienvenido a LÄR University, ${namePrefix}ya contamos con el contexto de tu perfil para ${selectedMaster}.

En este chat puedo ayudarte a entender cómo funciona tu recomendacion, por que se eligieron ciertos sprints y cómo aprovechar esta ruta en tu trabajo actual.

Si quieres empezar, pregúntame por la lógica de tu ruta o por el sprint que deberías priorizar primero.`;

    default:
        return `Bienvenido a LÄR University. Estoy aqui para guiarte en el flujo de selección de Master, análisis de CV y generación de recomendaciones personalizadas.`;
    }
};

module.exports = {
    buildWelcomeAssistantMessage,
};
