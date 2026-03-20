const { OAuth2Client } = require('google-auth-library');

const { createLogger } = require('./services/observability/logger');
const { generateToken } = require('./services/auth/jwt.service');
const { extractTextFromFile } = require('./services/documents/pdf-parser.service');
const { buildRepositories } = require('./repositories/repository-factory');
const { createChatRepository } = require('./repositories/chat.repo');
const { createAnalysisRepository } = require('./repositories/analysis.repo');
const { createUserRepository } = require('./repositories/user.repo');
const { createMasterRepository } = require('./repositories/master.repo');
const { createStatsRepository } = require('./repositories/stats.repo');
const { createCatalogRepository } = require('./repositories/catalog.repo');
const { createFirestoreClient } = require('./infra/firestore.client');
const { createOpenAiClient } = require('./infra/openai.client');
const { createVertexClient } = require('./infra/vertex.client');
const { createPromptBuilder } = require('./ai/prompt-builder');
const { createContextManager } = require('./ai/context-manager');
const { createAiOrchestrator } = require('./ai/orchestrator');
const { createGenerateRecommendationUseCases } = require('./use-cases/generate-recommendation');
const { createRegenerateRecommendationUseCases } = require('./use-cases/regenerate-recommendation');
const { createAnalyzeCvUseCases } = require('./use-cases/analyze-cv');
const { createChatUseCases } = require('./use-cases/send-message');
const { createUserUseCases } = require('./use-cases/users');
const { createAuthUseCases } = require('./use-cases/auth');

const logger = createLogger({ component: 'composition-root' });

const resolveUseFirestore = (explicitValue) =>
    typeof explicitValue === 'boolean'
        ? explicitValue
        : process.env.USE_FIRESTORE === 'true' || process.env.NODE_ENV === 'production';

const createGoogleIdentityClient = () => {
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

    return {
        verifyIdToken: async ({ credential }) => {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();

            return {
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                googleId: payload.sub,
            };
        },
    };
};

const buildAppContainer = ({ useFirestore } = {}) => {
    const resolvedUseFirestore = resolveUseFirestore(useFirestore);
    const legacyRepositories = buildRepositories({ useFirestore: resolvedUseFirestore });
    const firestoreClient = createFirestoreClient();
    const openAiClient = createOpenAiClient();
    const vertexClient = createVertexClient();
    const domainRepositories = {
        chatRepo: createChatRepository({ implementation: legacyRepositories.chats }),
        analysisRepo: createAnalysisRepository({ implementation: legacyRepositories.analyses }),
        userRepo: createUserRepository({ implementation: legacyRepositories.users }),
        masterRepo: createMasterRepository(),
        statsRepo: createStatsRepository({ implementation: legacyRepositories.stats }),
        catalogRepo: createCatalogRepository({
            implementation: resolvedUseFirestore ? require('./repositories/firestore/catalog.repository') : null,
        }),
    };
    const promptBuilder = createPromptBuilder();
    const contextManager = createContextManager({
        openAiClient,
        vertexClient,
        catalogRepo: domainRepositories.catalogRepo,
        logger: logger.child({ component: 'ai.context-manager' }),
    });
    const aiOrchestrator = createAiOrchestrator({
        openAiClient,
        contextManager,
        promptBuilder,
        logger: logger.child({ component: 'ai.orchestrator' }),
    });
    const generateRecommendationUseCases = createGenerateRecommendationUseCases({
        analysisRepo: domainRepositories.analysisRepo,
        aiOrchestrator,
    });
    const regenerateRecommendationUseCases = createRegenerateRecommendationUseCases({
        analysisRepo: domainRepositories.analysisRepo,
        aiOrchestrator,
    });
    const analyzeCvUseCases = createAnalyzeCvUseCases({
        analysisRepo: domainRepositories.analysisRepo,
        userRepo: domainRepositories.userRepo,
        masterRepo: domainRepositories.masterRepo,
        aiOrchestrator,
        pdfService: { extractTextFromFile },
        generateRecommendationForProfile: generateRecommendationUseCases.generateRecommendationForProfile,
    });
    const chatUseCases = createChatUseCases({
        chatRepo: domainRepositories.chatRepo,
        analysisRepo: domainRepositories.analysisRepo,
        contextManager,
        aiOrchestrator,
    });
    const userUseCases = createUserUseCases({
        userRepo: domainRepositories.userRepo,
        statsRepo: domainRepositories.statsRepo,
        masterRepo: domainRepositories.masterRepo,
        catalogRepo: domainRepositories.catalogRepo,
    });
    const authUseCases = createAuthUseCases({
        userRepo: domainRepositories.userRepo,
        tokenService: { generateToken },
        googleIdentityClient: createGoogleIdentityClient(),
    });

    return {
        repositories: domainRepositories,
        infra: {
            firestoreClient,
            openAiClient,
            vertexClient,
        },
        ai: {
            promptBuilder,
            contextManager,
            orchestrator: aiOrchestrator,
        },
        useCases: {
            ...generateRecommendationUseCases,
            ...regenerateRecommendationUseCases,
            ...analyzeCvUseCases,
            ...chatUseCases,
            ...userUseCases,
            ...authUseCases,
        },
        legacyRepositories,
    };
};

let defaultContainer = null;

const getAppContainer = () => {
    if (!defaultContainer) {
        defaultContainer = buildAppContainer();
    }

    return defaultContainer;
};

const resetAppContainer = () => {
    defaultContainer = null;
};

module.exports = {
    buildAppContainer,
    getAppContainer,
    resetAppContainer,
};
