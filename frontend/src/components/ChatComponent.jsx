import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Wand2 } from 'lucide-react';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

const MASTER_NAME_BY_CODE = {
    mintear: 'Master in intelligence',
    mtecmba: 'tech management mba',
    'datalar-mba': 'data driven mba',
};

const getMasterDisplayName = (masterCode) => {
    if (!masterCode) return '';
    return MASTER_NAME_BY_CODE[String(masterCode).toLowerCase()] || masterCode;
};

const SUGGESTED_QUESTIONS = [
    "¿De qué se trata el sprint?",
    "¿Cuál es el sprint 1?",
    "¿Por qué elegiste esta ruta?",
    "¿Qué habilidades desarrollaré?"
];

const ChatComponent = ({
    chatId,
    cvAnalysisId,
    userName,
    selectedMaster,
    sprints,
    onFirstUserMessage,
    chatEnabled = true,
    lockedMessage = 'Sube tu CV para habilitar el chat.',
}) => {
    const { isDarkMode } = useTheme();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const lastHandledAnalysisId = useRef(null);
    const selectedMasterDisplayName = getMasterDisplayName(selectedMaster);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (chatId) {
            fetchChatHistory();
        }
    }, [chatId]);

    // Handle automatic greeting when analysis is ready
    useEffect(() => {
        if (cvAnalysisId && cvAnalysisId !== lastHandledAnalysisId.current && chatId) {
            const welcomeText = `Hola ${userName || 'estudiante'}, es un gusto saludarte. Ya que perteneces al MBA ${selectedMasterDisplayName}, tu ruta ideal para completar tu camino de excelencia es:\n\n${sprints.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n¿En qué sprint te gustaría profundizar hoy?`;

            // Artificial delay to feel natural after analysis
            setTimeout(() => {
                setMessages(prev => {
                    // Avoid duplicating if already present
                    if (prev.some(m => m.content.includes(welcomeText.substring(0, 20)))) return prev;
                    return [...prev, { role: 'assistant', content: welcomeText }];
                });
                lastHandledAnalysisId.current = cvAnalysisId;
            }, 1000);
        }
    }, [cvAnalysisId, chatId, userName, selectedMasterDisplayName, sprints]);

    useEffect(scrollToBottom, [messages]);

    const fetchChatHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/chat/${chatId}`);
            if (response.data.success) {
                const history = response.data.data.chat.messages || [];
                setMessages(history);
            }
        } catch (error) {
            console.error('Error fetching chat:', error);
        } finally {
            setLoading(false);
        }
    };

    const userMessagesCount = messages.filter(m => m.role === 'user').length;
    
    const handleSendMessage = async (e, textOverride = null) => {
        if (e) e.preventDefault();
        const content = textOverride || input;
        if (!content.trim() || sending || !chatId || !chatEnabled) return;

        const isFirstUserMessage = userMessagesCount === 0;
        if (isFirstUserMessage && typeof onFirstUserMessage === 'function') {
            onFirstUserMessage();
        }

        const userMsg = { role: 'user', content: content.trim() };
        setMessages((prev) => [...prev, userMsg]);
        setInput('');
        setSending(true);

        try {
            const response = await api.post(`/chat/${chatId}/message`, {
                content: userMsg.content,
                cvAnalysisId: cvAnalysisId
            });

            if (response.data.success) {
                const { assistantMessage } = response.data.data;
                setMessages((prev) => [...prev, assistantMessage]);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => [...prev, {
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
            }]);
        } finally {
            setSending(false);
        }
    };

    const handleSuggestionClick = (question) => {
        handleSendMessage(null, question);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 h-full bg-card/5 rounded-3xl animate-pulse">
                <Loader2 className="animate-spin text-orange-accent" size={32} />
                <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-dark-muted' : 'text-light-muted'}`}>Sincronizando con LÄR AI...</p>
            </div>
        );
    }

    return (
        <div className={`chat-container flex flex-col h-full min-h-[600px] transition-all duration-500 overflow-hidden relative rounded-2xl border ${isDarkMode ? 'border-white/10 bg-black/30' : 'border-stone-200 bg-white/70'}`}>
            {/* Header - Compact */}
            <div className={`p-3.5 border-b flex items-center justify-between ${isDarkMode ? 'border-dark-border bg-dark-card/30' : 'border-light-border bg-light-bg/30'} backdrop-blur-xl z-20`}>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-orange-accent/10 flex items-center justify-center border border-orange-accent/20">
                            <Bot className="text-orange-accent" size={20} />
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#1C1917] rounded-full"></span>
                    </div>
                    <div>
                        <h3 className={`font-black tracking-tight text-base ${isDarkMode ? 'text-white' : 'text-light-text'}`}>LÄR <span className="text-orange-accent italic">AI</span></h3>
                        <p className={`text-[8px] uppercase font-bold tracking-[0.15em] ${isDarkMode ? 'text-dark-muted' : 'text-light-muted'}`}>Analista Élite</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {selectedMaster && (
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

            {/* Messages Area - Compact */}
            <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 space-y-4 no-scrollbar">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-accent blur-2xl opacity-5"></div>
                            <div className="relative bg-orange-accent/10 p-8 rounded-[2rem] border border-orange-accent/20 shadow-[0_0_50px_rgba(240,90,40,0.1)]">
                                <Sparkles className="text-orange-accent" size={48} />
                            </div>
                        </div>
                        <div className="space-y-2 max-w-[280px] mx-auto">
                            <h4 className={`text-[1.32rem] font-black tracking-tighter italic uppercase leading-none ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                {chatEnabled ? (
                                    <>SISTEMA LISTO PARA EL <span className="text-orange-accent">ANÁLISIS</span></>
                                ) : (
                                    <>CHAT <span className="text-orange-accent">BLOQUEADO</span></>
                                )}
                            </h4>
                            <p className={`text-[10px] font-bold uppercase tracking-[0.1em] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-slate-600'}`}>
                                {chatEnabled
                                    ? 'Ya puedes conversar con LÄR AI sobre tus sprints.'
                                    : lockedMessage}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-5xl mx-auto w-full space-y-4">
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                            >
                                <div className={`flex gap-3 max-w-[92%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5 border ${msg.role === 'user'
                                        ? 'bg-orange-accent text-white border-orange-hover'
                                        : isDarkMode ? 'bg-dark-card text-orange-accent border-dark-border shadow-sm' : 'bg-light-bg text-orange-accent border-light-border'
                                        }`}>
                                        {msg.role === 'user' ? <User size={14} /> : <Wand2 size={14} />}
                                    </div>
                                    <div
                                        className={`p-4 rounded-xl text-[12px] font-bold leading-[1.5] transition-all whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-orange-accent text-white rounded-tr-none'
                                            : isDarkMode ? 'bg-dark-card border-l-2 border-l-orange-accent text-stone-300 rounded-tl-none border-y border-r border-[#2E2925] shadow-lg' : 'bg-slate-100/80 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
                                            }`}
                                    >
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {sending && (
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

            {/* Actions & Input - Compact */}
            <div className={`chat-bar-wrapper p-4 border-t ${isDarkMode ? 'border-dark-border bg-black/20' : 'border-light-border bg-light-bg/10'} space-y-3`}>
                {/* Suggestions */}
                {chatEnabled && chatId && !sending && messages.length > 0 && (
                    <div className="chat-suggestions flex flex-wrap gap-1.5 animate-in fade-in duration-300">
                        {SUGGESTED_QUESTIONS.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => handleSuggestionClick(q)}
                                className={`text-[8px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${isDarkMode ? 'bg-dark-card border-dark-border text-dark-muted hover:border-orange-accent hover:text-orange-accent'
                                    : 'bg-white border-light-border text-light-muted hover:border-orange-accent hover:text-orange-accent'
                                    }`}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="chat-bar relative group">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={!chatEnabled ? 'Sube tu CV para habilitar el chat...' : !chatId ? 'Preparando chat...' : 'CONSULTAR...'}
                        className={`input-field pr-12 h-11 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border transition-all ${!isDarkMode ? 'bg-white text-slate-900 border-slate-200 placeholder:text-slate-400' : 'bg-[#12100E] border-stone-800 text-white placeholder:text-white focus:border-orange-accent/30'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
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


