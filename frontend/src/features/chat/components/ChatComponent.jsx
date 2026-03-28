import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader2, Send, Sparkles, User, Wand2 } from 'lucide-react';
import { useTheme } from '../../theme';
import { getMasterDisplayName } from '../../../shared/utils/masters';
import MarkdownMessage from '../../../shared/ui/MarkdownMessage';
import { useMasterModules } from '../../recommendation';
import { useChatSession } from '../hooks/useChatSession';
import {
    getChatEmptyStateCopy,
    getSuggestedQuestionsForStage,
    resolveChatJourneyStage,
} from '../utils/chatJourney';

const ChatComponent = ({
    chatId,
    cvAnalysisId,
    selectedMaster,
    recommendation = null,
    suggestedSubjects = [],
    routeBlocks = [],
    chatEnabled = true,
    onChatContextChange,
    onEnsureChat,
}) => {
    const { isDarkMode } = useTheme();
    const { chatDetails, input, loading, messages, sending, sendMessage, setInput } = useChatSession({
        chatEnabled,
        chatId,
        cvAnalysisId,
        onEnsureChat,
    });
    const { moduleItems, moduleListLoading } = useMasterModules(selectedMaster?.id);
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
        if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, sending]);

    useEffect(() => {
        if (!onChatContextChange) {
            return undefined;
        }

        if (!chatId) {
            onChatContextChange(null);
            return undefined;
        }

        if (!chatDetails) {
            return undefined;
        }

        onChatContextChange({
            chatId: chatDetails.id,
            masterId: chatDetails.masterId || null,
            cvAnalysisId: chatDetails.cvAnalysisId || null,
            analysis: chatDetails.analysis || null,
        });

        return undefined;
    }, [chatDetails, chatId, onChatContextChange]);

    useLayoutEffect(() => {
        if (!recommendation) {
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

    if (loading) {
        return (
            <div className="flex h-full animate-pulse flex-col items-center justify-center space-y-4 rounded-3xl bg-card/5 p-12">
                <Loader2 className="animate-spin text-orange-accent" size={32} />
                <p
                    className={`text-[10px] font-black uppercase tracking-widest ${
                        isDarkMode ? 'text-dark-muted' : 'text-light-muted'
                    }`}
                >
                    Sincronizando con LAR AI...
                </p>
            </div>
        );
    }

    const emptyStateTitle = emptyStateCopy.title;
    const emptyStateText = emptyStateCopy.text;
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
                className={`rounded-2xl border p-4 text-left ${
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'
                }`}
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-accent">
                            Ruta recomendada
                        </p>
                        <p
                            className={`mt-2 text-base font-black uppercase tracking-[0.12em] ${
                                isDarkMode ? 'text-white' : 'text-stone-900'
                            }`}
                        >
                            {recommendation.primarySpecialization || 'Ruta recomendada'}
                        </p>
                        <p
                            className={`mt-2 text-[11px] leading-relaxed ${
                                isDarkMode ? 'text-white/70' : 'text-stone-600'
                            }`}
                        >
                            {recommendation.reasoning || 'La recomendacion aparecera aqui cuando el CV haya sido analizado.'}
                        </p>
                    </div>
                    {recommendation.matchScore ? (
                        <div className="rounded-xl bg-orange-accent/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-orange-accent">
                            {recommendation.matchScore}%
                        </div>
                    ) : null}
                </div>

                {visibleRouteBlocks.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {visibleRouteBlocks.slice(0, 6).map((block, index) => (
                            <div
                                key={block.id || `${block.blockTitle}-${index}`}
                                className={`rounded-xl border px-3 py-3 ${
                                    isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'
                                }`}
                            >
                                <p
                                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                                        isDarkMode ? 'text-white' : 'text-stone-900'
                                    }`}
                                >
                                    {block.blockTitle || block.title}
                                </p>
                                <p className={`mt-1 text-[10px] ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                    Sprint {index + 1} {block.specializationName ? `- ${block.specializationName}` : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div
                style={recommendationCardHeight ? { height: `${recommendationCardHeight}px` } : undefined}
                className={`flex flex-col overflow-hidden rounded-2xl border p-4 text-left ${
                    isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'
                }`}
            >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-accent">
                    Modulos existentes del MBA
                </p>
                <div className="custom-scrollbar mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {moduleListLoading ? (
                        <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                            Cargando modulos del programa...
                        </p>
                    ) : moduleItems.length > 0 ? (
                        moduleItems.map((module) => (
                            <div
                                key={module.id}
                                className={`rounded-xl border px-3 py-3 ${
                                    isDarkMode ? 'border-white/10 bg-black/20' : 'border-stone-200 bg-white'
                                }`}
                            >
                                <p
                                    className={`text-[10px] font-bold uppercase tracking-[0.12em] ${
                                        isDarkMode ? 'text-white' : 'text-stone-900'
                                    }`}
                                >
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
    const emptyStateLayoutClassName = recommendationPanel
        ? 'min-h-full justify-start'
        : 'h-full justify-center';

    return (
        <div className="chat-container relative flex h-full min-h-[600px] flex-col overflow-hidden bg-transparent transition-all duration-500">
            <div className="no-scrollbar flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-4">
                {messages.length === 0 ? (
                    <div
                        data-testid="chat-empty-state"
                        className={`flex flex-col items-center space-y-5 px-6 py-8 text-center ${emptyStateLayoutClassName}`}
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-accent opacity-5 blur-2xl" />
                            <div className="relative rounded-[2rem] border border-orange-accent/20 bg-orange-accent/10 p-8 shadow-[0_0_50px_rgba(240,90,40,0.1)]">
                                <Sparkles className="text-orange-accent" size={48} />
                            </div>
                        </div>
                        <div className="mx-auto max-w-[320px] space-y-2">
                            <h4
                                className={`text-[1.32rem] font-black uppercase italic leading-none tracking-tighter ${
                                    isDarkMode ? 'text-white' : 'text-slate-900'
                                }`}
                            >
                                {emptyStateTitle}
                            </h4>
                            <p
                                className={`text-[10px] font-bold uppercase tracking-[0.1em] leading-relaxed ${
                                    isDarkMode ? 'text-white/60' : 'text-slate-600'
                                }`}
                            >
                                {emptyStateText}
                            </p>
                        </div>
                        {recommendationPanel ? <div className="w-full pt-4">{recommendationPanel}</div> : null}
                    </div>
                ) : (
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                        {recommendationPanel ? (
                            <div className="animate-in slide-in-from-top-2 fade-in duration-300">{recommendationPanel}</div>
                        ) : null}
                        {messages.map((message, index) => {
                            const isStreamingAssistant = message.role === 'assistant' && message.streaming;
                            const bubbleTextClass =
                                message.role === 'user'
                                    ? 'text-[12px] font-bold leading-[1.6]'
                                    : 'text-[13px] font-normal leading-[1.75]';

                            return (
                                <div
                                    key={message.id || `${message.role}-${index}`}
                                    className={`flex animate-in slide-in-from-bottom-2 fade-in duration-300 ${
                                        message.role === 'user' ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    <div className={`flex max-w-[92%] gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div
                                            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border ${
                                                message.role === 'user'
                                                    ? 'border-orange-hover bg-orange-accent text-white'
                                                    : isDarkMode
                                                        ? 'border-white/10 bg-[#151515] text-orange-accent shadow-sm'
                                                        : 'border-stone-200 bg-white text-orange-accent'
                                            }`}
                                        >
                                            {message.role === 'user' ? <User size={14} /> : <Wand2 size={14} />}
                                        </div>
                                        <div
                                            className={`rounded-[22px] p-4 transition-all ${
                                                message.role === 'user' ? 'whitespace-pre-wrap' : ''
                                            } ${bubbleTextClass} ${
                                                message.role === 'user'
                                                    ? 'rounded-tr-md bg-orange-accent text-white shadow-[0_14px_32px_rgba(240,90,40,0.22)]'
                                                    : isDarkMode
                                                        ? 'rounded-tl-md border border-white/10 bg-[#141414] text-stone-300 shadow-[0_12px_32px_rgba(0,0,0,0.25)]'
                                                        : 'rounded-tl-md border border-slate-200 bg-white text-slate-800 shadow-sm'
                                            }`}
                                        >
                                            {isStreamingAssistant && !message.content ? (
                                                <div className="flex gap-2">
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40" />
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40 [animation-delay:0.2s]" />
                                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40 [animation-delay:0.4s]" />
                                                </div>
                                            ) : message.role === 'assistant' ? (
                                                <MarkdownMessage content={message.content} />
                                            ) : (
                                                message.content
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
                                <Loader2 size={18} className="animate-spin text-orange-accent" />
                            </div>
                            <div
                                className={`rounded-[22px] rounded-tl-md border px-5 py-4 ${
                                    isDarkMode ? 'border-white/10 bg-[#141414]' : 'border-slate-200 bg-white'
                                }`}
                            >
                                <div className="flex gap-2">
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40 [animation-delay:0.2s]" />
                                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-orange-accent/40 [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div
                className={`chat-bar-wrapper space-y-3 border-t px-4 py-4 sm:px-6 ${
                    isDarkMode ? 'border-white/10 bg-[#111111]/92' : 'border-stone-200 bg-white/92'
                } backdrop-blur-xl`}
            >
                {!sending && (
                    <div className="chat-suggestions animate-in fade-in duration-300 flex flex-wrap gap-2">
                        {suggestedQuestions.map((question) => (
                            <button
                                key={question}
                                onClick={() => sendMessage(question)}
                                className={`rounded-xl border px-3 py-2 text-[8px] font-black uppercase tracking-wider transition-all ${
                                    isDarkMode
                                        ? 'border-white/10 bg-white/[0.03] text-dark-muted hover:border-orange-accent hover:text-orange-accent'
                                        : 'border-stone-200 bg-stone-50 text-light-muted hover:border-orange-accent hover:text-orange-accent'
                                }`}
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                )}

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        sendMessage();
                    }}
                    className="chat-bar relative group"
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder={emptyStateCopy.placeholder}
                        className={`input-field h-12 rounded-2xl border pr-12 text-[13px] font-semibold normal-case tracking-normal transition-all ${
                            !isDarkMode
                                ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                                : 'border-white/10 bg-[#181818] text-white placeholder:text-white/35 focus:border-orange-accent/30'
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                        disabled={sending || !chatEnabled}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || sending || !chatEnabled}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-orange-accent p-2 text-white transition-all hover:opacity-90 disabled:opacity-50"
                    >
                        <Send size={14} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatComponent;
