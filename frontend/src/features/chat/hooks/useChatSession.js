import { useEffect, useRef, useState } from 'react';
import { getChatById, sendChatMessageStream } from '../services/chatService';

export const useChatSession = ({ chatId, cvAnalysisId, chatEnabled = true, onEnsureChat }) => {
    const [chatDetails, setChatDetails] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const skipNextChatBootstrapRef = useRef(false);

    useEffect(() => {
        if (!chatId) {
            setChatDetails(null);
            setMessages([]);
            return;
        }

        if (skipNextChatBootstrapRef.current) {
            skipNextChatBootstrapRef.current = false;
            return;
        }

        setChatDetails(null);
        setMessages([]);

        const fetchChatHistory = async () => {
            setLoading(true);
            try {
                const response = await getChatById(chatId);
                if (response.success) {
                    setChatDetails(response.data.chat || null);
                    setMessages(response.data.chat.messages || []);
                }
            } catch (error) {
                console.error('Error fetching chat:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchChatHistory();
    }, [chatId]);

    const sendMessage = async (textOverride = null) => {
        const content = String(textOverride || input || '').trim();
        let resolvedChatId = chatId;

        if (!content || sending || !chatEnabled) {
            return;
        }

        if (!resolvedChatId && onEnsureChat) {
            skipNextChatBootstrapRef.current = true;
            resolvedChatId = await onEnsureChat();
        }

        if (!resolvedChatId) {
            return;
        }

        const tempUserId = `user-${Date.now()}`;
        const tempAssistantId = `assistant-stream-${Date.now()}`;
        const userMessage = { id: tempUserId, role: 'user', content };
        const assistantPlaceholder = { id: tempAssistantId, role: 'assistant', content: '', streaming: true };

        setMessages((previousMessages) => [...previousMessages, userMessage, assistantPlaceholder]);
        setInput('');
        setSending(true);

        try {
            await sendChatMessageStream({
                chatId: resolvedChatId,
                content,
                cvAnalysisId,
                onEvent: (event) => {
                    if (event.type === 'start' && event.userMessage) {
                        setMessages((previousMessages) =>
                            previousMessages.map((message) =>
                                message.id === tempUserId ? event.userMessage : message
                            )
                        );
                    }

                    if (event.type === 'token') {
                        setMessages((previousMessages) =>
                            previousMessages.map((message) =>
                                message.id === tempAssistantId
                                    ? {
                                        ...message,
                                        content: `${message.content || ''}${event.token || ''}`,
                                        streaming: true,
                                    }
                                    : message
                            )
                        );
                    }

                    if (event.type === 'done') {
                        setMessages((previousMessages) =>
                            previousMessages.map((message) =>
                                message.id === tempAssistantId
                                    ? {
                                        ...event.assistantMessage,
                                        content: event.assistantMessage?.content || message.content || '',
                                        streaming: false,
                                    }
                                    : message
                            )
                        );
                    }

                    if (event.type === 'error') {
                        throw new Error(
                            event.message ||
                                'No pude procesar tu mensaje en este momento. Intenta de nuevo en unos segundos.'
                        );
                    }
                },
            });
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((previousMessages) =>
                previousMessages.map((message) =>
                    message.id === tempAssistantId
                        ? {
                            ...message,
                            content:
                                error.message ||
                                'No pude procesar tu mensaje en este momento. Intenta de nuevo en unos segundos.',
                            streaming: false,
                        }
                        : message
                )
            );
        } finally {
            setSending(false);
        }
    };

    return {
        chatDetails,
        input,
        loading,
        messages,
        sending,
        sendMessage,
        setInput,
    };
};
