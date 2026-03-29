import api from '../../../shared/lib/http/api-client';
import { API_URL } from '../../../shared/lib/config/env';
import { getAuthToken } from '../../../shared/lib/storage/auth-token';

const buildApiUrl = (path) => `${String(API_URL || '').replace(/\/$/, '')}${path}`;

// El backend responde via SSE manual; este parser consume eventos completos y devuelve el
// resto del buffer para reusarlo cuando llega el siguiente chunk.
const consumeSseBuffer = (buffer, onEvent) => {
    let remaining = buffer;
    let separatorIndex = remaining.indexOf('\n\n');

    while (separatorIndex !== -1) {
        const rawEvent = remaining.slice(0, separatorIndex).trim();
        remaining = remaining.slice(separatorIndex + 2);

        if (rawEvent) {
            const data = rawEvent
                .split('\n')
                .filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trim())
                .join('\n');

            if (data) {
                onEvent(JSON.parse(data));
            }
        }

        separatorIndex = remaining.indexOf('\n\n');
    }

    return remaining;
};

export const listChats = async () => {
    const response = await api.get('/chat');
    return response.data;
};

export const getChatById = async (chatId) => {
    const response = await api.get(`/chat/${chatId}`);
    return response.data;
};

export const createChat = async (payload) => {
    // Evita enviar null/undefined al backend para no contaminar el contrato con campos vacios.
    const requestPayload = Object.fromEntries(
        Object.entries(payload || {}).filter(([, value]) => value !== null && value !== undefined)
    );
    const response = await api.post('/chat', requestPayload);
    return response.data;
};

export const removeChat = async (chatId) => {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
};

export const sendChatMessageStream = async ({ chatId, content, cvAnalysisId, onEvent }) => {
    const token = getAuthToken();
    const response = await fetch(buildApiUrl(`/chat/${chatId}/message`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
            content,
            cvAnalysisId: cvAnalysisId || undefined,
        }),
    });

    if (!response.ok) {
        let errorMessage = 'No pude procesar tu mensaje en este momento. Intenta de nuevo en unos segundos.';

        try {
            const errorBody = await response.json();
            errorMessage = errorBody.message || errorMessage;
        } catch {
            // Si la respuesta de error no viene en JSON, conservamos el mensaje generico.
        }

        throw new Error(errorMessage);
    }

    if (!response.body) {
        throw new Error('El navegador no pudo abrir el stream de respuesta.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let streamCompleted = false;

    // Seguimos leyendo hasta recibir el evento `done`; no basta con que el reader cierre
    // porque puede quedar un ultimo evento parcial pendiente en el buffer.
    while (!streamCompleted) {
        const { value, done } = await reader.read();

        if (done) {
            buffer = consumeSseBuffer(buffer, (event) => {
                if (event.type === 'done') {
                    streamCompleted = true;
                }
            });
            break;
        }

        buffer += decoder.decode(value, { stream: true }).replace(/\r/g, '');
        buffer = consumeSseBuffer(buffer, (event) => {
            if (event.type === 'done') {
                streamCompleted = true;
            }

            onEvent(event);
        });
    }
};
