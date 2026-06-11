import React from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { ChatComponent } from '../features/chat';
import { ErrorToast, HomeSidebar, OnboardingVideoAdminCard, OnboardingVideoModal, SidebarTooltip, useHomeDashboard } from '../features/home-dashboard';
import { getOnboardingVideo } from '../features/home-dashboard/services/onboardingService';
import { MasterSelectionModal } from '../features/master-selection';
import { RecommendationSupportPanel } from '../features/recommendation';
import ConfirmDialog from '../shared/ui/ConfirmDialog';

const ONBOARDING_STORAGE_KEY = 'lar_onboarding_seen';
const TOUR_VIEWPORT_PADDING = 28;
const TOUR_TOOLTIP_GAP = 14;
const DEFAULT_MAX_CHAT_INTERACTIONS = 20;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const normalizeMaxChatInteractions = (value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return DEFAULT_MAX_CHAT_INTERACTIONS;
    }

    return parsed;
};

const keepTourTooltipInViewport = () => ({
    name: 'keepTourTooltipInViewport',
    fn({ x, y, rects }) {
        if (typeof window === 'undefined') {
            return { x, y };
        }

        const maxX = window.innerWidth - rects.floating.width - TOUR_VIEWPORT_PADDING;
        const maxY = window.innerHeight - rects.floating.height - TOUR_VIEWPORT_PADDING;

        return {
            x: clamp(x, TOUR_VIEWPORT_PADDING, maxX),
            y: clamp(y, TOUR_VIEWPORT_PADDING, maxY),
        };
    },
});

const chooseTourStepFourPlacement = () => ({
    name: 'chooseTourStepFourPlacement',
    fn({ elements, placement, rects }) {
        if (typeof window === 'undefined' || !elements.reference?.getBoundingClientRect) {
            return {};
        }

        const targetRect = elements.reference.getBoundingClientRect();
        const availableSpace = {
            bottom: window.innerHeight - targetRect.bottom - TOUR_VIEWPORT_PADDING,
            left: targetRect.left - TOUR_VIEWPORT_PADDING,
            right: window.innerWidth - targetRect.right - TOUR_VIEWPORT_PADDING,
            top: targetRect.top - TOUR_VIEWPORT_PADDING,
        };
        const tooltipHeight = rects.floating.height + TOUR_TOOLTIP_GAP;
        const tooltipWidth = rects.floating.width + TOUR_TOOLTIP_GAP;

        let nextPlacement = 'bottom';

        if (availableSpace.right >= tooltipWidth) {
            nextPlacement = 'right';
        } else if (availableSpace.left >= tooltipWidth) {
            nextPlacement = 'left';
        } else if (availableSpace.top >= tooltipHeight) {
            nextPlacement = 'top';
        } else if (availableSpace.bottom >= tooltipHeight) {
            nextPlacement = 'bottom';
        }

        if (!placement.startsWith(nextPlacement)) {
            return {
                reset: {
                    placement: nextPlacement,
                },
            };
        }

        return {};
    },
});

const tourFloatingOptions = {
    strategy: 'fixed',
    autoUpdate: {
        ancestorResize: true,
        ancestorScroll: true,
        elementResize: true,
    },
    flipOptions: {
        padding: TOUR_VIEWPORT_PADDING,
        rootBoundary: 'viewport',
    },
    shiftOptions: {
        padding: TOUR_VIEWPORT_PADDING,
        rootBoundary: 'viewport',
    },
    middleware: [keepTourTooltipInViewport()],
};

const onboardingSteps = [
    {
        target: '[data-tour="selected-master"]',
        content: 'Aqu\u00ed ves el m\u00e1ster activo con el que se personalizar\u00e1 tu ruta.',
        placement: 'left-start',
        floatingOptions: tourFloatingOptions,
        offset: 8,
        skipBeacon: true,
    },
    {
        target: '[data-tour="upload-pdf"]',
        content: 'Sube tu CV aqu\u00ed para que podamos analizar tu perfil.',
        placement: 'left',
        floatingOptions: tourFloatingOptions,
        offset: 8,
        skipBeacon: true,
    },
    {
        target: '[data-tour="analyze-cv"]',
        content: 'Haz clic aqu\u00ed para generar tu an\u00e1lisis personalizado.',
        placement: 'left-end',
        floatingOptions: tourFloatingOptions,
        offset: 8,
        skipBeacon: true,
    },
    {
        target: '[data-tour="chat-panel"]',
        content: 'Aqu\u00ed aparecer\u00e1 tu an\u00e1lisis, recomendaciones y podr\u00e1s conversar con el asistente.',
        placement: 'right',
        floatingOptions: {
            ...tourFloatingOptions,
            middleware: [chooseTourStepFourPlacement(), keepTourTooltipInViewport()],
        },
        offset: 4,
        skipBeacon: true,
    },
    {
        target: '[data-tour="history-sidebar"]',
        content: 'Aqu\u00ed podr\u00e1s retomar consultas anteriores.',
        placement: 'right-start',
        floatingOptions: tourFloatingOptions,
        offset: 8,
        skipBeacon: true,
    },
];

const OnboardingTourTooltip = ({
    backProps,
    index,
    isLastStep,
    primaryProps,
    size,
    skipProps,
    step,
    tooltipProps,
}) => {
    const isFirstStep = index === 0;

    return (
        <div {...tooltipProps} className="onboarding-tour-tooltip">
            <div className="mb-2.5 flex items-center justify-between gap-3">
                <span className="rounded-full bg-[#EE5522]/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#EE5522]">
                    Paso {index + 1} de {size}
                </span>
                <button
                    type="button"
                    {...skipProps}
                    className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#2D2926]/55 underline-offset-4 transition-colors hover:text-[#EE5522] hover:underline"
                >
                    Saltar tour
                </button>
            </div>

            <div className="onboarding-tour-tooltip-content text-[12px] font-semibold leading-[1.55] text-[#2D2926]">
                {step.content}
            </div>

            <div className="mt-4 flex flex-shrink-0 items-center justify-between gap-2.5">
                <button
                    type="button"
                    {...backProps}
                    disabled={isFirstStep}
                    className={`rounded-[8px] border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] transition-all ${
                        isFirstStep
                            ? 'cursor-not-allowed border-[#2D2926]/10 text-[#2D2926]/25'
                            : 'border-[#2D2926]/16 text-[#2D2926]/70 hover:border-[#EE5522]/45 hover:text-[#EE5522]'
                    }`}
                >
                    Atras
                </button>

                <button
                    type="button"
                    {...primaryProps}
                    className="rounded-[8px] bg-[#EE5522] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_22px_rgba(238,85,34,0.24)] transition-all hover:brightness-110"
                >
                    {isLastStep ? 'Finalizar' : 'Siguiente'}
                </button>
            </div>
        </div>
    );
};

const HomePage = () => {
    const {
        analysis,
        analysisForChat,
        analysisLoading,
        chatId,
        chatPendingDelete,
        cvImprovementContent,
        error,
        file,
        history,
        historyLoading,
        hoverTooltip,
        improvementTips,
        isDeletingChat,
        isDarkMode,
        isSidebarOpen,
        masters,
        needsMasterSelection,
        recommendation,
        routeBlocks,
        selectedMaster,
        selectedMasterVisual,
        showMasterSelectionModal,
        suggestedSubjects,
        toggleTheme,
        uploading,
        user,
        actions,
    } = useHomeDashboard();
    const [runOnboarding, setRunOnboarding] = React.useState(false);
    const [onboardingReady, setOnboardingReady] = React.useState(false);
    const [onboardingVideoConfig, setOnboardingVideoConfig] = React.useState(null);
    const [showOnboardingVideo, setShowOnboardingVideo] = React.useState(false);
    const [onboardingFlowStarted, setOnboardingFlowStarted] = React.useState(false);
    const [onboardingVideoHandled, setOnboardingVideoHandled] = React.useState(false);
    const [isAdminPanelOpen, setIsAdminPanelOpen] = React.useState(false);
    const [maxChatInteractions, setMaxChatInteractions] = React.useState(DEFAULT_MAX_CHAT_INTERACTIONS);
    const isNewUser = history.length === 0;
    const canAutoStartOnboarding =
        onboardingReady &&
        isNewUser &&
        Boolean(selectedMaster?.id) &&
        !needsMasterSelection &&
        !showMasterSelectionModal;
    const isAdmin = user?.role === 'admin';

    React.useEffect(() => {
        if (historyLoading || analysisLoading) {
            return;
        }

        setOnboardingReady(true);
    }, [analysisLoading, historyLoading]);

    React.useEffect(() => {
        let isMounted = true;

        const loadChatSettings = async () => {
            try {
                const response = await getOnboardingVideo();
                const videoConfig = response.data || {};

                if (!isMounted) {
                    return;
                }

                setMaxChatInteractions(normalizeMaxChatInteractions(videoConfig.maxChatInteractions));
            } catch (error) {
                console.error('Error fetching chat settings:', error);
            }
        };

        loadChatSettings();

        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!canAutoStartOnboarding) {
            return;
        }

        if (!onboardingVideoHandled) {
            return;
        }

        if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') {
            return;
        }

        if (!isSidebarOpen) {
            actions.setIsSidebarOpen(true);
        }
    }, [actions, canAutoStartOnboarding, isSidebarOpen, onboardingVideoHandled]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!canAutoStartOnboarding || onboardingFlowStarted) {
            return;
        }

        if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') {
            return;
        }

        let isMounted = true;

        const loadOnboardingVideo = async () => {
            try {
                const response = await getOnboardingVideo();
                const videoConfig = response.data || {};
                const introVideoUrl = typeof videoConfig.introVideoUrl === 'string'
                    ? videoConfig.introVideoUrl.trim()
                    : '';
                let hasValidVideoUrl = false;

                if (introVideoUrl) {
                    try {
                        new URL(introVideoUrl);
                        hasValidVideoUrl = true;
                    } catch {
                        hasValidVideoUrl = false;
                    }
                }

                if (!isMounted) {
                    return;
                }

                setOnboardingVideoConfig({
                    ...videoConfig,
                    introVideoUrl,
                });
                setMaxChatInteractions(normalizeMaxChatInteractions(videoConfig.maxChatInteractions));

                if (videoConfig.introVideoEnabled === true && hasValidVideoUrl) {
                    setShowOnboardingVideo(true);
                    setOnboardingFlowStarted(true);
                    return;
                }
            } catch (error) {
                console.error('Error fetching onboarding video:', error);
            }

            if (isMounted) {
                setOnboardingVideoHandled(true);
                setOnboardingFlowStarted(true);
            }
        };

        loadOnboardingVideo();

        return () => {
            isMounted = false;
        };
    }, [canAutoStartOnboarding, onboardingFlowStarted]);

    React.useEffect(() => {
        if (!isAdmin || onboardingVideoConfig) {
            return;
        }

        let isMounted = true;

        const loadAdminOnboardingVideo = async () => {
            try {
                const response = await getOnboardingVideo();

                if (isMounted) {
                    setOnboardingVideoConfig(response.data || {});
                    setMaxChatInteractions(normalizeMaxChatInteractions(response.data?.maxChatInteractions));
                }
            } catch (error) {
                console.error('Error fetching onboarding video:', error);
            }
        };

        loadAdminOnboardingVideo();

        return () => {
            isMounted = false;
        };
    }, [isAdmin, onboardingVideoConfig]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        if (!canAutoStartOnboarding || !isSidebarOpen || runOnboarding) {
            return;
        }

        if (!onboardingVideoHandled) {
            return;
        }

        if (window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true') {
            return;
        }

        const timerId = window.setTimeout(() => {
            setRunOnboarding(true);
        }, 450);

        return () => {
            window.clearTimeout(timerId);
        };
    }, [canAutoStartOnboarding, isSidebarOpen, onboardingVideoHandled, runOnboarding]);

    React.useEffect(() => {
        if (runOnboarding && showMasterSelectionModal) {
            setRunOnboarding(false);
        }
    }, [runOnboarding, showMasterSelectionModal]);

    const handleOnboardingCallback = React.useCallback((data) => {
        const status = data?.status;
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
            setRunOnboarding(false);
        }
    }, []);

    const handleOnboardingVideoClose = React.useCallback(() => {
        setShowOnboardingVideo(false);
        setOnboardingVideoHandled(true);
    }, []);

    return (
        <div
            className={`relative flex h-full min-h-screen w-full overflow-hidden transition-colors duration-300 xl:h-screen ${
                isDarkMode ? 'bg-transparent' : 'bg-light-bg'
            }`}
        >
            <Joyride
                steps={onboardingSteps}
                run={runOnboarding}
                callback={handleOnboardingCallback}
                continuous
                showProgress
                showSkipButton
                scrollToFirstStep
                disableScrolling={false}
                disableOverlayClose
                tooltipComponent={OnboardingTourTooltip}
                spotlightPadding={10}
                floaterProps={{
                    styles: {
                        floater: {
                            filter: 'none',
                        },
                    },
                }}
                options={{
                    arrowColor: '#E4E5E2',
                    backgroundColor: '#E4E5E2',
                    blockTargetInteraction: false,
                    overlayClickAction: false,
                    overlayColor: 'rgba(45, 41, 38, 0.75)',
                    primaryColor: '#EE5522',
                    arrowBase: 22,
                    arrowSize: 10,
                    arrowSpacing: 8,
                    offset: 8,
                    spotlightRadius: 10,
                    textColor: '#2D2926',
                    width: 292,
                    zIndex: 11000,
                }}
                locale={{
                    back: 'Anterior',
                    close: 'Cerrar',
                    last: 'Finalizar',
                    next: 'Siguiente',
                    skip: 'Omitir',
                }}
                styles={{
                    arrow: {
                        color: '#E4E5E2',
                        filter: 'drop-shadow(0 5px 10px rgba(45, 41, 38, 0.16))',
                    },
                    floater: {
                        filter: 'none',
                    },
                    overlay: {
                        backgroundColor: 'rgba(45, 41, 38, 0.75)',
                    },
                    spotlight: {
                        className: 'onboarding-spotlight-glow',
                        stroke: '#EE5522',
                        strokeWidth: 3,
                    },
                    tooltip: {
                        backgroundColor: 'transparent',
                        borderRadius: 12,
                        padding: 0,
                    },
                    buttonNext: {
                        borderRadius: 9999,
                    },
                    buttonBack: {
                        marginRight: 8,
                    },
                    buttonSkip: {
                        color: '#6B7280',
                    },
                }}
            />

            <HomeSidebar
                chatId={chatId}
                history={history}
                historyLoading={historyLoading}
                hoverTooltipHandlers={{
                    hide: actions.hideSidebarTooltip,
                    show: actions.showSidebarTooltip,
                }}
                isDarkMode={isDarkMode}
                isSidebarOpen={isSidebarOpen}
                onDeleteChat={actions.handleDeleteChat}
                onLogout={actions.handleLogout}
                onNewChat={actions.handleNewChat}
                onOpenAdminPanel={() => setIsAdminPanelOpen(true)}
                onOpenProfile={actions.handleOpenProfile}
                onSelectChat={actions.openChat}
                showAdminPanelAction={isAdmin}
                onToggleSidebar={() => actions.setIsSidebarOpen((previousState) => !previousState)}
                onToggleTheme={toggleTheme}
            />

            <div className="flex min-w-0 flex-1 overflow-hidden">
                <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pt-3 xl:px-5 xl:pt-4">
                        <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-0">
                            <div
                                className={`min-h-0 overflow-hidden rounded-[28px] border shadow-[0_18px_60px_rgba(0,0,0,0.22)] ${
                                    isDarkMode ? 'border-white/5 bg-[#0C0C0C]/88' : 'border-stone-200 bg-white/88'
                                }`}
                            >
                                <ChatComponent
                                    chatId={chatId}
                                    cvAnalysisId={analysisForChat}
                                    selectedMaster={selectedMaster}
                                    recommendation={recommendation}
                                    suggestedSubjects={suggestedSubjects}
                                    routeBlocks={routeBlocks}
                                    maxInteractions={maxChatInteractions}
                                    chatEnabled
                                    onChatContextChange={actions.handleChatContextChange}
                                    onEnsureChat={actions.ensureActiveChat}
                                />
                            </div>

                            <aside className="min-h-0 overflow-hidden xl:pl-3">
                                <div
                                    className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border backdrop-blur-xl xl:rounded-none xl:border-y-0 xl:border-l xl:border-r-0 ${
                                        isDarkMode
                                            ? 'border-white/5 bg-[#111111]/86 xl:bg-[#0E0E0E]/88'
                                            : 'border-stone-200 bg-white/92 xl:bg-white/88'
                                    }`}
                                >
                                    <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-4 py-4">
                                        <RecommendationSupportPanel
                                            analysis={analysis}
                                            analysisLoading={analysisLoading}
                                            cvImprovementContent={cvImprovementContent}
                                            file={file}
                                            improvementTips={improvementTips}
                                            isDarkMode={isDarkMode}
                                            needsMasterSelection={needsMasterSelection}
                                            onChangeMaster={actions.handleChangeMaster}
                                            onFileChange={actions.handleFileChange}
                                            onOpenMasterSelection={actions.handleOpenMasterSelectionModal}
                                            onUpload={actions.handleUpload}
                                            selectedMaster={selectedMaster}
                                            selectedMasterVisual={selectedMasterVisual}
                                            showMasterSelectionModal={showMasterSelectionModal}
                                            uploading={uploading}
                                        />
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </div>

            <SidebarTooltip hoverTooltip={hoverTooltip} isDarkMode={isDarkMode} />
            <ConfirmDialog
                open={Boolean(chatPendingDelete)}
                isDarkMode={isDarkMode}
                title="Eliminar conversacion"
                description={`Se eliminara "${chatPendingDelete?.title || 'este chat'}" de tu historial. Esta accion no se puede deshacer.`}
                confirmLabel="Eliminar chat"
                cancelLabel="Conservar"
                loading={isDeletingChat}
                onCancel={actions.handleCancelDeleteChat}
                onConfirm={actions.handleConfirmDeleteChat}
            />
            <ErrorToast error={error} />

            {isAdmin && isAdminPanelOpen && (
                <div
                    className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="admin-panel-title"
                >
                    <div
                        className={`custom-scrollbar max-h-full w-full max-w-[560px] overflow-y-auto rounded-[8px] border shadow-[0_24px_70px_rgba(0,0,0,0.32)] ${
                            isDarkMode
                                ? 'border-white/10 bg-[#101010]'
                                : 'border-stone-200 bg-white'
                        }`}
                    >
                        <div
                            className="flex items-start justify-between gap-4 border-b px-5 py-4"
                            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E7E5E4' }}
                        >
                            <div>
                                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                                    isDarkMode ? 'text-orange-accent' : 'text-orange-accent'
                                }`}>
                                    Panel de administracion
                                </p>
                                <h2
                                    id="admin-panel-title"
                                    className={`mt-1 text-lg font-black leading-tight ${
                                        isDarkMode ? 'text-white' : 'text-stone-950'
                                    }`}
                                >
                                    Configuracion de onboarding
                                </h2>
                                <p className={`mt-1 text-[12px] font-semibold leading-relaxed ${
                                    isDarkMode ? 'text-white/52' : 'text-stone-500'
                                }`}>
                                    Ajustes internos para la experiencia inicial de usuarios.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAdminPanelOpen(false)}
                                className={`rounded-[8px] border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-colors ${
                                    isDarkMode
                                        ? 'border-white/10 text-white/70 hover:border-orange-accent/35 hover:text-orange-accent'
                                        : 'border-stone-200 text-stone-600 hover:border-orange-accent/45 hover:text-orange-accent'
                                }`}
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="px-4 pb-4">
                            <OnboardingVideoAdminCard
                                isDarkMode={isDarkMode}
                                initialVideoUrl={onboardingVideoConfig?.introVideoUrl || ''}
                                initialEnabled={Boolean(onboardingVideoConfig?.introVideoEnabled)}
                                initialMaxChatInteractions={maxChatInteractions}
                                onSaved={(nextConfig) => {
                                    setOnboardingVideoConfig((previousConfig) => ({
                                        ...(previousConfig || {}),
                                        ...nextConfig,
                                    }));
                                    setMaxChatInteractions(normalizeMaxChatInteractions(nextConfig?.maxChatInteractions));
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <OnboardingVideoModal
                open={showOnboardingVideo}
                videoUrl={onboardingVideoConfig?.introVideoUrl}
                isDarkMode={isDarkMode}
                onClose={handleOnboardingVideoClose}
            />

            {needsMasterSelection && showMasterSelectionModal && (
                <MasterSelectionModal
                    isDarkMode={isDarkMode}
                    masters={masters}
                    onClose={actions.handleCloseMasterSelectionModal}
                    onSelect={actions.handleMasterSelection}
                />
            )}
        </div>
    );
};

export default HomePage;
