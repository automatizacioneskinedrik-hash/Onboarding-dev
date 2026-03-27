import React from 'react';
import { ChatComponent } from '../features/chat';
import { ErrorToast, HomeSidebar, SidebarTooltip, useHomeDashboard } from '../features/home-dashboard';
import { MasterSelectionModal } from '../features/master-selection';
import { RecommendationSupportPanel } from '../features/recommendation';

const HomePage = () => {
    const {
        analysis,
        analysisForChat,
        analysisLoading,
        chatId,
        error,
        file,
        history,
        historyLoading,
        hoverTooltip,
        improvementTips,
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
        actions,
    } = useHomeDashboard();

    return (
        <div
            className={`relative flex h-full min-h-screen w-full overflow-hidden transition-colors duration-300 xl:h-screen ${
                isDarkMode ? 'bg-transparent' : 'bg-light-bg'
            }`}
        >
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
            <ErrorToast error={error} />

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
