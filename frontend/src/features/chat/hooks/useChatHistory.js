import { useCallback, useEffect, useState } from 'react';
import { listChats, removeChat } from '../services/chatService';

export const useChatHistory = ({ enabled = true } = {}) => {
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const refreshHistory = useCallback(async () => {
        // Cuando no hay usuario autenticado, reseteamos el historial local para no arrastrar
        // conversaciones de una sesion anterior.
        if (!enabled) {
            setHistory([]);
            return [];
        }

        setHistoryLoading(true);

        try {
            const response = await listChats();

            if (response.success) {
                const chats = response.data.chats || [];
                setHistory(chats);
                return chats;
            }
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setHistoryLoading(false);
        }

        setHistory([]);
        return [];
    }, [enabled]);

    useEffect(() => {
        refreshHistory();
    }, [refreshHistory]);

    const deleteChat = useCallback(async (chatId) => {
        // Optimizamos la UX removiendo el chat localmente despues del delete remoto, sin
        // forzar una recarga completa del listado.
        await removeChat(chatId);
        setHistory((previousHistory) => previousHistory.filter((chat) => chat.id !== chatId));
    }, []);

    return {
        history,
        historyLoading,
        refreshHistory,
        setHistory,
        deleteChat,
    };
};
