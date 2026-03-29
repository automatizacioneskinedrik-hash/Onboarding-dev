import { normalizeAnalysis } from '../../cv-analysis';
import { findMasterById } from '../../../shared/utils/masters';

// Construye payloads compactos para crear chats sin enviar campos vacios al backend.
export const buildChatPayload = ({ title, masterId, cvAnalysisId } = {}) => ({
    ...(title ? { title } : {}),
    ...(masterId ? { masterId } : {}),
    ...(cvAnalysisId ? { cvAnalysisId } : {}),
});

// Si hay un chat abierto, su master manda sobre la seleccion global para no mostrar
// contenido de otro contexto mientras se revisa el historial.
export const resolveActiveMaster = ({ chatId, masters, activeChatContext, selectedMaster }) => {
    if (!chatId) {
        return selectedMaster || null;
    }

    return findMasterById(masters, activeChatContext?.masterId) || selectedMaster || null;
};

// El analisis visible sigue la misma regla: en un chat abierto se usa el analisis asociado
// a ese chat y se normaliza al shape del frontend.
export const resolveActiveAnalysis = ({ chatId, activeChatContext, analysis, masters }) => {
    if (!chatId) {
        return analysis;
    }

    return activeChatContext?.analysis ? normalizeAnalysis(activeChatContext.analysis, masters) : null;
};

// Cuando aun no existe chat, la conversacion debe anclarse al analisis global mas reciente.
export const resolveAnalysisForChat = ({ chatId, activeChatContext, analysis }) => {
    if (chatId) {
        return activeChatContext?.cvAnalysisId || null;
    }

    return analysis?.id || null;
};

// La tooltip se calcula desde el boton origen para mantener una posicion estable incluso
// con sidebar colapsada.
export const buildSidebarTooltip = (element, text) => {
    const rect = element.getBoundingClientRect();

    return {
        text,
        left: rect.right + 12,
        top: rect.top + rect.height / 2,
    };
};
