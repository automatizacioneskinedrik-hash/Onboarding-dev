import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Send, User, Loader2, Sparkles, Wand2 } from 'lucide-react';
import api, { API_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getMasterDisplayName } from '../utils/masters';
import MarkdownMessage from './MarkdownMessage';
import {
    getChatEmptyStateCopy,
    getSuggestedQuestionsForStage,
    resolveChatJourneyStage,
} from '../utils/chatJourney';

const buildApiUrl = (path) => `${String(API_URL || '').replace(/\/$/, '')}${path}`;

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

const ChatComponent = ({
    chatId,
    cvAnalysisId,
    userName,
    selectedMaster,
    recommendation = null,
    suggestedSubjects = [],
    routeBlocks = [],
    chatEnabled = true,
    lockedMessage = 'Selecciona un master y sube tu CV para habilitar el chat.',
}) => {
    const { isDarkMode } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const [moduleItems, setModuleItems] = useState([]);
    const [moduleListLoading, setModuleListLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const recommendationCardRef = useRef(null);
    const [recommendationCardHeight, setRecommendationCardHeight] = useState(null);
    const selectedMasterDisplayName = getMasterDisplayName(selectedMaster);
    const chatJourneyStage = resolveChatJourneyStage({
        selectedMaster,
        cvAnalysisId,
        recommendation,
    });
    const suggestedQuestions = getSuggestedQuestionsForStage(chatJourneyStage);
    const emptyStateCopy = getChatEmptyStateCopy({
        stage: chatJourneyStage,
        selectedMasterDisplayName,
    });

    useEffect(() => {
        if (!chatId) {
            setMessages([]);
            return;
        }

        const fetchChatHistory = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/chat/${chatId}`);
                if (response.data.success) {
                    setMessages(response.data.data.chat.messages || []);
                }
            } catch (error) {
                console.error('Error fetching chat:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchChatHistory();
    }, [chatId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    useLayoutEffect(() => {
        if (!recommendation) {
            setRecommendationCardHeight(null);
            return;
        }

        const card = recommendationCardRef.current;

        if (!card) {
            return;
        }

        let frameId = null;

        const updateHeight = () => {
            setRecommendationCardHeight(card.getBoundingClientRect().height || null);
        };

        frameId = window.requestAnimationFrame(() => {
            updateHeight();
        });

        if (typeof ResizeObserver === 'undefined') {
            return () => {
                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                }
            };
        }

        const observer = new ResizeObserver(() => {
            updateHeight();
        });

        observer.observe(card);

        return () => {
            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }
            observer.disconnect();
        };
    }, [recommendation, routeBlocks.length, suggestedSubjects.length]);

    useEffect(() => {
        if (!selectedMaster?.id) {
            setModuleItems([]);
            setModuleListLoading(false);
            return;
        }

        let isMounted = true;

        const fetchMasterModules = async () => {
            setModuleListLoading(true);
            try {
                const response = await api.get('/users/master-modules', {
                    params: { masterId: selectedMaster.id },
                });

                if (!isMounted) {
                    return;
                }

                if (response.data.success) {
                    setModuleItems(response.data.data.modules || []);
                } else {
                    setModuleItems([]);
                }
            } catch (error) {
                if (isMounted) {
                    console.error('Error fetching master modules:', error);
                    setModuleItems([]);
                }
            } finally {
                if (isMounted) {
                    setModuleListLoading(false);
                }
            }
        };

        fetchMasterModules();

        return () => {
            isMounted = false;
        };
    }, [selectedMaster?.id]);

    const handleSendMessage = async (e, textOverride = null) => {
        if (e) e.preventDefault();

        const content = String(textOverride || input || '').trim();
        if (!content || sending || !chatId || !chatEnabled) {
            return;
        }

        const tempUserId = `user-${Date.now()}`;
        const tempAssistantId = `assistant-stream-${Date.now()}`;
        const userMsg = { id: tempUserId, role: 'user', content };
        const assistantPlaceholder = { id: tempAssistantId, role: 'assistant', content: '', streaming: true };

        setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
        setInput('');
        setSending(true);

        try {
            const token = localStorage.getItem('eduai_token');
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
                    // noop
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
                    if (event.type === 'start' && event.userMessage) {
                        setMessages((prev) =>
                            prev.map((message) => (message.id === tempUserId ? event.userMessage : message))
                        );
                    }

                    if (event.type === 'token') {
                        setMessages((prev) =>
                            prev.map((message) =>
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
                        streamCompleted = true;
                        setMessages((prev) =>
                            prev.map((message) =>
                                message.id === tempAssistantId
                                    ? {
                                        ...event.assistantMessage,
                                        content:
                                            event.assistantMessage?.content || message.content || '',
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
                });
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) =>
                prev.map((message) =>
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 h-full bg-card/5 rounded-3xl animate-pulse">
                <Loader2 className="animate-spin text-orange-accent" size={32} />
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-dark-muted' : 'text-light-muted'}`}>
                    Sincronizando con LAR AI...
                </p>
            </div>
        );
    }

    const emptyStateTitle = chatEnabled ? emptyStateCopy.title : 'Chat bloqueado';
    const emptyStateText = chatEnabled ? emptyStateCopy.text : lockedMessage;
    const visibleRouteBlocks = routeBlocks.length
        ? routeBlocks
        : suggestedSubjects.map((subject, index) => ({
              id: `subject-${index + 1}`,
              blockTitle: subject,
              specializationName: recommendation?.primarySpecialization || '',
          }));
    const recommendationPanel = recommendation ? (
        <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div
                ref={recommendationCardRef}
                className={`rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                            Ruta recomendada
                        </p>
                        <p className={`mt-2 text-base font-black uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            {recommendation.primarySpecialization || 'Ruta recomendada'}
                        </p>
                        <p className={`mt-2 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-stone-600'}`}>
                            {recommendation.reasoning || 'La recomendacion aparecera aqui cuando el CV haya sido analizado.'}
                        </p>
                    </div>
                    {recommendation.matchScore ? (
                        <div className="px-3 py-2 rounded-xl bg-orange-accent/10 text-orange-accent text-[10px] font-black uppercase tracking-[0.16em]">
                            {recommendation.matchScore}%
                        </div>
                    ) : null}
                </div>

                {visibleRouteBlocks.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {visibleRouteBlocks.slice(0, 6).map((block, index) => (
                            <div
                                key={block.id || `${block.blockTitle}-${index}`}
                                className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'}`}
                            >
                                <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                    {block.blockTitle || block.title}
                                </p>
                                <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                    Bloque {index + 1} {block.specializationName ? `- ${block.specializationName}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div
                style={recommendationCardHeight ? { height: `${recommendationCardHeight}px` } : undefined}
                className={`flex flex-col overflow-hidden rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}
            >
                <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                    Modulos existentes del MBA
                </p>
                <div className="custom-scrollbar mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                    {moduleListLoading ? (
                        <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                            Cargando modulos del programa...
                        </p>
                    ) : moduleItems.length > 0 ? (
                        moduleItems.map((module) => (
                            <div
                                key={module.id}
                                className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'}`}
                            >
                                <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                    {module.title}
                                </p>
                                <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                    {module.topicsCount ?? module.topics?.length ?? 0} temas
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                            Cuando el MBA tenga modulos cargados, aqui los veras listados.
                        </p>
                    )}
                </div>
            </div>
        </div>
    ) : null;

    return (
        <div className={`chat-container relative flex h-full min-h-[600px] flex-col overflow-hidden transition-all duration-500 ${isDarkMode ? 'bg-transparent' : 'bg-transparent'}`}>
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-4 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center space-y-5 px-6 py-8 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-accent blur-2xl opacity-5"></div>
                            <div className="relative rounded-[2rem] border border-orange-accent/20 bg-orange-accent/10 p-8 shadow-[0_0_50px_rgba(240,90,40,0.1)]">
                                <Sparkles className="text-orange-accent" size={48} />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-[320px] mx-auto">
                            <h4 className={`text-[1.32rem] font-black tracking-tighter italic uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {emptyStateTitle}
                            </h4>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.1em] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                                {emptyStateText}
                            </p>
                        </div>

                        {false && recommendation && (
                            <div className="mx-auto grid w-full max-w-3xl grid-cols-1 items-stretch gap-4 pt-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <div
                                    ref={recommendationCardRef}
                                    className={`rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                                                Ruta recomendada
                                            </p>
                                            <p className={`mt-2 text-base font-black uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                {recommendation.primarySpecialization || 'Ruta recomendada'}
                                            </p>
                                            <p className={`mt-2 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/70' : 'text-stone-600'}`}>
                                                {recommendation.reasoning || 'La recomendacion aparecera aqui cuando el CV haya sido analizado.'}
                                            </p>
                                        </div>
                                        {recommendation.matchScore ? (
                                            <div className="px-3 py-2 rounded-xl bg-orange-accent/10 text-orange-accent text-[10px] font-black uppercase tracking-[0.16em]">
                                                {recommendation.matchScore}%
                                            </div>
                                        ) : null}
                                    </div>

                                    {visibleRouteBlocks.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {visibleRouteBlocks.slice(0, 6).map((block, index) => (
                                                <div
                                                    key={block.id || `${block.blockTitle}-${index}`}
                                                    className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'}`}
                                                >
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        {block.blockTitle || block.title}
                                                    </p>
                                                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                        Bloque {index + 1} {block.specializationName ? `• ${block.specializationName}` : ''}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div
                                    style={recommendationCardHeight ? { height: `${recommendationCardHeight}px` } : undefined}
                                    className={`flex flex-col overflow-hidden rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}
                                >
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                                        Modulos existentes del MBA
                                    </p>
                                    <div className="custom-scrollbar mt-3 flex-1 min-h-0 space-y-3 overflow-y-auto pr-1">
                                        {moduleListLoading ? (
                                            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                Cargando modulos del programa...
                                            </p>
                                        ) : moduleItems.length > 0 ? (
                                            moduleItems.map((module) => (
                                                <div
                                                    key={module.id}
                                                    className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'}`}
                                                >
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        {module.title}
                                                    </p>
                                                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                        {module.topicsCount ?? module.topics?.length ?? 0} temas
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                Cuando el MBA tenga modulos cargados, aqui los veras listados.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {recommendationPanel ? <div className="w-full pt-4">{recommendationPanel}</div> : null}
                    </div>
                ) : (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                        {recommendationPanel ? (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                {recommendationPanel}
                            </div>
                        ) : null}
                        {messages.map((msg, index) => {
                            const isStreamingAssistant = msg.role === 'assistant' && msg.streaming;
                            const bubbleTextClass = msg.role === 'user'
                                ? 'text-[12px] font-bold leading-[1.6]'
                                : 'text-[13px] font-normal leading-[1.75]';

                            return (
                                <div
                                    key={msg.id || `${msg.role}-${index}`}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                >
                                    <div className={`flex max-w-[92%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${msg.role === 'user' ? 'border-orange-hover bg-orange-accent text-white' : isDarkMode ? 'border-white/10 bg-[#151515] text-orange-accent shadow-sm' : 'border-stone-200 bg-white text-orange-accent'}`}>
                                            {msg.role === 'user' ? <User size={14} /> : <Wand2 size={14} />}
                                        </div>
                                        <div
                                            className={`${msg.role === 'user' ? 'whitespace-pre-wrap' : ''} rounded-[22px] p-4 transition-all ${bubbleTextClass} ${msg.role === 'user' ? 'rounded-tr-md bg-orange-accent text-white shadow-[0_14px_32px_rgba(240,90,40,0.22)]' : isDarkMode ? 'rounded-tl-md border border-white/10 bg-[#141414] text-stone-300 shadow-[0_12px_32px_rgba(0,0,0,0.25)]' : 'rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm'}`}
                                        >
                                            {isStreamingAssistant && !msg.content ? (
                                                <div className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce"></span>
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                                </div>
                                            ) : msg.role === 'assistant' ? (
                                                <MarkdownMessage content={msg.content} />
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {sending && !messages.some((message) => message.role === 'assistant' && message.streaming) && (
                    <div className="mx-auto flex w-full max-w-5xl animate-pulse justify-start">
                        <div className="flex max-w-[80%] gap-4">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-accent/20 bg-orange-accent/10">
                                <Loader2 size={18} className="text-orange-accent animate-spin" />
                            </div>
                            <div className={`rounded-[22px] rounded-tl-md border px-5 py-4 ${isDarkMode ? 'border-white/10 bg-[#141414]' : 'border-slate-200 bg-white'}`}>
                                <div className="flex gap-2">
                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className={`chat-bar-wrapper space-y-3 border-t px-4 py-4 sm:px-6 ${isDarkMode ? 'border-white/10 bg-[#111111]/92' : 'border-stone-200 bg-white/92'} backdrop-blur-xl`}>
                {chatEnabled && chatId && !sending && (
                    <div className="chat-suggestions flex flex-wrap gap-2 animate-in fade-in duration-300">
                        {suggestedQuestions.map((question) => (
                            <button
                                key={question}
                                onClick={() => handleSendMessage(null, question)}
                                className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-wider transition-all ${isDarkMode ? 'border-white/10 bg-white/[0.03] text-dark-muted hover:border-orange-accent hover:text-orange-accent' : 'border-stone-200 bg-stone-50 text-light-muted hover:border-orange-accent hover:text-orange-accent'}`}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="chat-bar relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={!chatEnabled ? lockedMessage : !chatId ? 'Preparando chat...' : emptyStateCopy.placeholder}
                        className={`input-field h-12 rounded-2xl border pr-12 text-[13px] font-semibold normal-case tracking-normal transition-all ${!isDarkMode ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400' : 'border-white/10 bg-[#181818] text-white placeholder:text-white/35 focus:border-orange-accent/30'} disabled:cursor-not-allowed disabled:opacity-40`}
                        disabled={sending || !chatId || !chatEnabled}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending || !chatId || !chatEnabled}
                        className="absolute right-2 top-1/2 rounded-xl bg-orange-accent p-2 text-white transition-all hover:opacity-90 disabled:opacity-50 -translate-y-1/2"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatComponent;

