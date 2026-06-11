const {
    CHAT_SCOPE_DECISIONS,
    CHAT_SCOPE_INTENTS,
    detectAllowedTopicMatches,
    detectPromptInjection,
    isAmbiguousFollowUp,
    isGreetingMessage,
} = require('./chat-domain-policy');

const hasRecentAllowedScope = (recentMessages = []) =>
    recentMessages
        .slice(-8)
        .some((message) => message?.metadata?.scope?.decision === CHAT_SCOPE_DECISIONS.ALLOW);

const resolveAllowedIntent = (matches = {}) => {
    if (matches.recommendation) {
        return CHAT_SCOPE_INTENTS.LAR_RECOMMENDATION;
    }

    if (matches.catalog) {
        return CHAT_SCOPE_INTENTS.LAR_CATALOG;
    }

    return CHAT_SCOPE_INTENTS.LAR_PLATFORM;
};

const classifyChatIntent = ({ message, recentMessages = [] } = {}) => {
    const content = String(message || '').trim();
    const topicMatches = detectAllowedTopicMatches(content);

    if (detectPromptInjection(content)) {
        return {
            intent: CHAT_SCOPE_INTENTS.PROMPT_INJECTION,
            decision: CHAT_SCOPE_DECISIONS.REJECT,
            reason: 'prompt_injection',
            topicMatches,
        };
    }

    if (isGreetingMessage(content)) {
        return {
            intent: CHAT_SCOPE_INTENTS.GREETING,
            decision: CHAT_SCOPE_DECISIONS.ALLOW,
            reason: 'greeting',
            topicMatches,
        };
    }

    if (Object.keys(topicMatches).length > 0) {
        return {
            intent: resolveAllowedIntent(topicMatches),
            decision: CHAT_SCOPE_DECISIONS.ALLOW,
            reason: 'allowed_topic_match',
            topicMatches,
        };
    }

    if (isAmbiguousFollowUp(content) && hasRecentAllowedScope(recentMessages)) {
        return {
            intent: CHAT_SCOPE_INTENTS.LAR_FOLLOW_UP,
            decision: CHAT_SCOPE_DECISIONS.ALLOW,
            reason: 'follow_up_after_allowed_context',
            topicMatches,
        };
    }

    return {
        intent: CHAT_SCOPE_INTENTS.OUT_OF_SCOPE,
        decision: CHAT_SCOPE_DECISIONS.REJECT,
        reason: 'outside_lar_scope',
        topicMatches,
    };
};

module.exports = {
    classifyChatIntent,
};
