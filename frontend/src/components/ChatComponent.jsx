import React, { useEffect, useRef, useState } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Wand2 } from 'lucide-react';
import api, { API_URL } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { getMasterDisplayName } from '../utils/masters';

const SUGGESTED_QUESTIONS = [
    'Que sprint me conviene priorizar?',
    'Por que me recomendaron esta ruta?',
    'Que cursos encajan mejor con mi perfil?',
    'Como aprovecho este master en mi trabajo actual?',
];

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
    recommendedCourses = [],
    chatEnabled = true,
    lockedMessage = 'Selecciona un master y sube tu CV para habilitar el chat.',
}) => {
    const { isDarkMode } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const selectedMasterDisplayName = getMasterDisplayName(selectedMaster);

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

    const userMessagesCount = messages.filter((message) => message.role === 'user').length;

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

    const emptyStateTitle = chatEnabled ? 'Sistema listo para conversar' : 'Chat bloqueado';
    const emptyStateText = chatEnabled
        ? cvAnalysisId
            ? `Pregunta por tu recomendacion, los sprints o el contenido de ${selectedMasterDisplayName || 'tu master'}.`
            : `Ya puedes explorar el contenido de ${selectedMasterDisplayName || 'tu master'}. Si subes tu CV, la recomendacion sera personalizada.`
        : lockedMessage;

    return (
        <div className={`chat-container flex flex-col h-full min-h-[600px] transition-all duration-500 overflow-hidden relative rounded-2xl border ${isDarkMode ? 'border-white/10 bg-black/30' : 'border-stone-200 bg-white/70'}`}>
            <div className={`p-3.5 border-b flex items-center justify-between ${isDarkMode ? 'border-dark-border bg-dark-card/30' : 'border-light-border bg-light-bg/30'} backdrop-blur-xl z-20`}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-orange-accent/10 flex items-center justify-center border border-orange-accent/20">
                            <Bot className="text-orange-accent" size={20} />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#1C1917] rounded-full"></span>
                    </div>
                    <div>
                        <h3 className={`font-black tracking-tight text-base ${isDarkMode ? 'text-white' : 'text-light-text'}`}>
                            LAR <span className="text-orange-accent italic">AI</span>
                        </h3>
                        <p className={`text-[8px] uppercase font-bold tracking-[0.15em] ${isDarkMode ? 'text-dark-muted' : 'text-light-muted'}`}>
                            Asesor academico
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                    {selectedMasterDisplayName && (
                        <div className={`text-[8px] uppercase tracking-widest font-black px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10 text-white/80' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
                            {selectedMasterDisplayName}
                        </div>
                    )}
                    {chatId && (
                        <div className={`text-[8px] uppercase tracking-widest font-black px-2.5 py-1 rounded-lg border ${isDarkMode ? 'bg-orange-accent/10 border-orange-accent/20 text-orange-accent' : 'bg-orange-accent/10 border-orange-accent/30 text-orange-accent'}`}>
                            Consultas: {userMessagesCount}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-accent blur-2xl opacity-5"></div>
                            <div className="relative bg-orange-accent/10 p-8 rounded-[2rem] border border-orange-accent/20 shadow-[0_0_50px_rgba(240,90,40,0.1)]">
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

                        {recommendation && (
                            <div className="w-full max-w-3xl mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-4 pt-4">
                                <div className={`rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}>
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                                                Ruta elegida
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

                                    {suggestedSubjects.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-4">
                                            {suggestedSubjects.slice(0, 4).map((subject) => (
                                                <span
                                                    key={subject}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'bg-white/5 text-white/70 border border-white/10' : 'bg-white text-stone-700 border border-stone-200'}`}
                                                >
                                                    {subject}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className={`rounded-2xl border p-4 text-left ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">
                                        Cursos recomendados
                                    </p>
                                    <div className="mt-3 space-y-3">
                                        {recommendedCourses.length > 0 ? (
                                            recommendedCourses.slice(0, 3).map((course) => (
                                                <div
                                                    key={course.id}
                                                    className={`rounded-xl border px-3 py-3 ${isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'}`}
                                                >
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        {course.title}
                                                    </p>
                                                    <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                        {course.moduleTitle}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                                Cuando exista una recomendacion completa, aqui veras los cursos mas cercanos a tu perfil.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto w-full space-y-4">
                        {messages.map((msg, index) => {
                            const isStreamingAssistant = msg.role === 'assistant' && msg.streaming;

                            return (
                                <div
                                    key={msg.id || `${msg.role}-${index}`}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                >
                                    <div className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 border ${msg.role === 'user' ? 'bg-orange-accent text-white border-orange-hover' : isDarkMode ? 'bg-dark-card text-orange-accent border-dark-border shadow-sm' : 'bg-light-bg text-orange-accent border-light-border'}`}>
                                            {msg.role === 'user' ? <User size={14} /> : <Wand2 size={14} />}
                                        </div>
                                        <div
                                            className={`p-4 rounded-xl text-[12px] font-bold leading-[1.5] transition-all whitespace-pre-wrap ${msg.role === 'user' ? 'bg-orange-accent text-white rounded-tr-none' : isDarkMode ? 'bg-dark-card border-l-2 border-l-orange-accent text-stone-300 rounded-tl-none border-y border-r border-[#2E2925] shadow-lg' : 'bg-slate-100/80 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'}`}
                                        >
                                            {isStreamingAssistant && !msg.content ? (
                                                <div className="flex gap-2">
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce"></span>
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                                    <span className="w-1.5 h-1.5 bg-orange-accent/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                                </div>
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
                    <div className="flex justify-start animate-pulse max-w-5xl mx-auto w-full">
                        <div className="flex gap-4 max-w-[80%]">
                            <div className="w-9 h-9 rounded-xl bg-orange-accent/10 border border-orange-accent/20 flex items-center justify-center">
                                <Loader2 size={18} className="text-orange-accent animate-spin" />
                            </div>
                            <div className={`px-5 py-4 rounded-3xl rounded-tl-none border ${isDarkMode ? 'bg-dark-card border-dark-border' : 'bg-light-bg border-light-border'}`}>
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

            <div className={`chat-bar-wrapper p-4 border-t ${isDarkMode ? 'border-dark-border bg-black/20' : 'border-light-border bg-light-bg/10'} space-y-3`}>
                {chatEnabled && chatId && !sending && (
                    <div className="chat-suggestions flex flex-wrap gap-1.5 animate-in fade-in duration-300">
                        {SUGGESTED_QUESTIONS.map((question) => (
                            <button
                                key={question}
                                onClick={() => handleSendMessage(null, question)}
                                className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isDarkMode ? 'bg-dark-card border-dark-border text-dark-muted hover:border-orange-accent hover:text-orange-accent' : 'bg-white border-light-border text-light-muted hover:border-orange-accent hover:text-orange-accent'}`}
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
                        placeholder={!chatEnabled ? lockedMessage : !chatId ? 'Preparando chat...' : `Pregunta sobre ${selectedMasterDisplayName || 'tu ruta'}...`}
                        className={`input-field pr-12 h-11 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border transition-all ${!isDarkMode ? 'bg-white text-slate-900 border-slate-200 placeholder:text-slate-400' : 'bg-[#12100E] border-stone-800 text-white placeholder:text-white focus:border-orange-accent/30'} disabled:opacity-40 disabled:cursor-not-allowed`}
                        disabled={sending || !chatId || !chatEnabled}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending || !chatId || !chatEnabled}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-orange-accent text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatComponent;
