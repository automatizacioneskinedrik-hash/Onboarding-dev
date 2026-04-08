const test = require('node:test');
const assert = require('node:assert/strict');

const {
    CHAT_JOURNEY_STAGES,
    resolveChatJourneyContext,
    buildChatJourneyPromptSection,
} = require('../src/ai/chat-journey-context');
const { buildWelcomeAssistantMessage } = require('../src/ai/chat-welcome-builder');

test('resolveChatJourneyContext identifies upload CV stage when master is selected but no analysis exists', () => {
    const journey = resolveChatJourneyContext({
        userName: 'Ana Perez',
        selectedMasterId: 'mtecmba',
        userMessageCount: 1,
    });

    // El saludo usa el primer nombre para sonar cercano sin inventar tratamiento ni apellidos.
    assert.equal(journey.key, CHAT_JOURNEY_STAGES.UPLOAD_CV);
    assert.equal(journey.userName, 'Ana');
    assert.equal(journey.selectedMasterName, 'TECH-MBA');
    assert.equal(journey.shouldSendWelcome, true);
    assert.match(journey.nextStep, /cargar su CV/i);
});

test('resolveChatJourneyContext identifies review stage when recommendation is available', () => {
    const journey = resolveChatJourneyContext({
        selectedMasterId: 'mintear',
        userProfile: { name: 'Ana' },
        recommendation: { primarySpecialization: 'Tecnologia' },
        userMessageCount: 2,
    });

    assert.equal(journey.key, CHAT_JOURNEY_STAGES.REVIEW_RECOMMENDATION);
    assert.equal(journey.hasRecommendation, true);
    assert.equal(journey.shouldSendWelcome, false);
});

test('buildWelcomeAssistantMessage explains the platform flow before CV upload', () => {
    const journey = resolveChatJourneyContext({
        userName: 'Ana Perez',
        selectedMasterId: 'mtecmba',
    });

    const message = buildWelcomeAssistantMessage({ journeyContext: journey });

    // El primer mensaje explica el flujo, pero no debe adelantarse a una recomendacion
    // personalizada todavia inexistente.
    assert.match(message, /Bienvenido a LÄR University/);
    assert.match(message, /carga tu CV en PDF/i);
    assert.match(message, /analizamos tu perfil/i);
});

test('buildChatJourneyPromptSection includes stage, flow and behavior rules', () => {
    const journey = resolveChatJourneyContext({
        selectedMasterId: 'mtecmba',
        userMessageCount: 1,
    });

    const promptSection = buildChatJourneyPromptSection(journey);

    // Este texto termina dentro del prompt del chat; si cambia sin control, cambia tambien
    // el comportamiento del asistente.
    assert.match(promptSection, /Etapa actual: Master seleccionado, CV pendiente/);
    assert.match(promptSection, /Primera interaccion real del usuario: Si/);
    assert.match(promptSection, /seleccionar Master, cargar CV en PDF, analizar el perfil/i);
    assert.match(promptSection, /no inventes una recomendacion personalizada/i);
});
