const {
    CHAT_SCOPE_DECISIONS,
    CHAT_SCOPE_INTENTS,
} = require('./chat-domain-policy');

const evaluateChatScope = ({ recentMessages = [], classification } = {}) => {
    const recentScopeMessages = recentMessages
        .slice(-8)
        .filter((message) => message?.metadata?.scope);

    const rejectedCount = recentScopeMessages.filter(
        (message) => message.metadata.scope.decision === CHAT_SCOPE_DECISIONS.REJECT
    ).length;

    if (classification?.intent === CHAT_SCOPE_INTENTS.PROMPT_INJECTION) {
        return {
            state: 'blocked',
            reason: 'prompt_injection',
        };
    }

    if (classification?.decision === CHAT_SCOPE_DECISIONS.REJECT && rejectedCount >= 2) {
        return {
            state: 'blocked',
            reason: 'repeated_out_of_scope',
        };
    }

    if (classification?.decision === CHAT_SCOPE_DECISIONS.REJECT) {
        return {
            state: 'drifting',
            reason: 'conversation_drift',
        };
    }

    return {
        state: 'safe',
        reason: null,
    };
};

const sanitizeMessagesForModel = (messages = []) =>
    messages.filter((message) => {
        const decision = message?.metadata?.scope?.decision;

        if (!decision) {
            return true;
        }

        return decision !== CHAT_SCOPE_DECISIONS.REJECT;
    });

module.exports = {
    evaluateChatScope,
    sanitizeMessagesForModel,
};
