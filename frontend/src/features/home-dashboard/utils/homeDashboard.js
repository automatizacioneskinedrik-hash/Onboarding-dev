import { normalizeAnalysis } from '../../cv-analysis';
import { findMasterById } from '../../../shared/utils/masters';

export const buildChatPayload = ({ title, masterId, cvAnalysisId } = {}) => ({
    ...(title ? { title } : {}),
    ...(masterId ? { masterId } : {}),
    ...(cvAnalysisId ? { cvAnalysisId } : {}),
});

export const resolveActiveMaster = ({ chatId, masters, activeChatContext, selectedMaster }) => {
    if (!chatId) {
        return selectedMaster || null;
    }

    return findMasterById(masters, activeChatContext?.masterId) || selectedMaster || null;
};

export const resolveActiveAnalysis = ({ chatId, activeChatContext, analysis, masters }) => {
    if (!chatId) {
        return analysis;
    }

    return activeChatContext?.analysis ? normalizeAnalysis(activeChatContext.analysis, masters) : null;
};

export const resolveAnalysisForChat = ({ chatId, activeChatContext, analysis }) => {
    if (chatId) {
        return activeChatContext?.cvAnalysisId || null;
    }

    return analysis?.id || null;
};

export const buildSidebarTooltip = (element, text) => {
    const rect = element.getBoundingClientRect();

    return {
        text,
        left: rect.right + 12,
        top: rect.top + rect.height / 2,
    };
};
