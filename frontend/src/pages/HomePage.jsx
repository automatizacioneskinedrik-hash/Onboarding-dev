import React from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { ChatComponent } from '../features/chat';
import { ErrorToast, HomeSidebar, OnboardingVideoAdminCard, OnboardingVideoModal, SidebarTooltip, useHomeDashboard } from '../features/home-dashboard';
import { getOnboardingVideo } from '../features/home-dashboard/services/onboardingService';
import { MasterSelectionModal } from '../features/master-selection';
import { RecommendationSupportPanel } from '../features/recommendation';
import ConfirmDialog from '../shared/ui/ConfirmDialog';

const ONBOARDING_STORAGE_KEY = 'lar_onboarding_seen';

const onboardingSteps = [
    {
        target: '[data-tour="selected-master"]',
        content: 'Aqu\u00ed ves el m\u00e1ster activo con el que se personalizar\u00e1 tu ruta.',
        placement: 'left',
        skipBeacon: true,
    },
    {
        target: '[data-tour="upload-pdf"]',
        content: 'Sube tu CV aqu\u00ed para que podamos analizar tu perfil.',
        placement: 'left',
        skipBeacon: true,
    },
    {
        target: '[data-tour="analyze-cv"]',
        content: 'Haz clic aqu\u00ed para generar tu an\u00e1lisis personalizado.',
        placement: 'left',
        skipBeacon: true,
    },
    {
        target: '[data-tour="chat-panel"]',
        content: 'Aqu\u00ed aparecer\u00e1 tu an\u00e1lisis, recomendaciones y podr\u00e1s conversar con el asistente.',
        placement: 'auto',
        skipBeacon: true,
    },
    {
        target: '[data-tour="history-sidebar"]',
        content: 'Aqu\u00ed podr\u00e1s retomar consultas anteriores.',
        placement: 'right',
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
            <div className="mb-3 flex items-center justify-between gap-4">
                <span className="rounded-full bg-[#EE5522]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#EE5522]">
                    Paso {index + 1} de {size}
                </span>
                <button
                    type="button"
                    {...skipProps}
                    className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2D2926]/55 underline-offset-4 transition-colors hover:text-[#EE5522] hover:underline"
                >
                    Saltar tour
                </button>
            </div>

            <div className="text-[13px] font-semibold leading-relaxed text-[#2D2926]">
                {step.content}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
                <button
                    type="button"
                    {...backProps}
                    disabled={isFirstStep}
                    className={`rounded-[8px] border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
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
                    className="rounded-[8px] bg-[#EE5522] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white shadow-[0_12px_28px_rgba(238,85,34,0.28)] transition-all hover:brightness-110"
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
                spotlightPadding={14}
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
                    spotlightRadius: 12,
                    textColor: '#2D2926',
                    width: 330,
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
                        filter: 'drop-shadow(0 8px 14px rgba(45, 41, 38, 0.18))',
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
                onOpenProfile={actions.handleOpenProfile}
                onSelectChat={actions.openChat}
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
                                        {isAdmin && (
                                            <OnboardingVideoAdminCard
                                                isDarkMode={isDarkMode}
                                                initialVideoUrl={onboardingVideoConfig?.introVideoUrl || ''}
                                                initialEnabled={Boolean(onboardingVideoConfig?.introVideoEnabled)}
                                                onSaved={(nextConfig) => setOnboardingVideoConfig((previousConfig) => ({
                                                    ...(previousConfig || {}),
                                                    ...nextConfig,
                                                }))}
                                            />
                                        )}
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
