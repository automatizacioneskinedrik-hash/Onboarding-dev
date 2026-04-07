import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useTheme } from '../../theme';
import { useChatHistory } from '../../chat';
import { createChat } from '../../chat/services/chatService';
import { normalizeAnalysis, useCvAnalysis } from '../../cv-analysis';
import {
    buildCvImprovementContent,
    buildImprovementTips,
    getRecommendation,
    getRouteBlocks,
    getSuggestedSubjects,
} from '../../recommendation';
import { getMasterDisplayName, getMasterVisual } from '../../../shared/utils/masters';
import { useHomeDashboardState } from './useHomeDashboardState';
import {
    buildChatPayload,
    buildSidebarTooltip,
    resolveActiveAnalysis,
    resolveActiveMaster,
    resolveAnalysisForChat,
} from '../utils/homeDashboard';

export const useHomeDashboard = () => {
    const { logout, masters, selectedMaster, selectMaster, user } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const {
        activeChatContext,
        chatId,
        chatPendingDelete,
        error,
        file,
        hoverTooltip,
        isChoosingMaster,
        isDeletingChat,
        isSidebarOpen,
        setActiveChatContext,
        setChatId,
        setChatPendingDelete,
        setError,
        setFile,
        setHoverTooltip,
        setIsChoosingMaster,
        setIsDeletingChat,
        setIsSidebarOpen,
        setShowMasterSelectionModal,
        showMasterSelectionModal,
    } = useHomeDashboardState({
        initialChatId: location.state?.openChatId,
        showMasterSelectionInitially: !selectedMaster,
    });

    const { history, historyLoading, refreshHistory, deleteChat } = useChatHistory({
        enabled: Boolean(user),
    });

    const { analysis, analysisLoading, setAnalysis, uploadAnalysis, uploading } = useCvAnalysis({
        enabled: Boolean(user),
        masters,
        selectedMaster,
    });

    // La vista activa puede venir del perfil global del usuario o del chat abierto. Estas
    // resoluciones mantienen ambos contextos sincronizados sin mezclar masters/analisis.
    const activeMaster = resolveActiveMaster({
        chatId,
        masters,
        activeChatContext,
        selectedMaster,
    });
    const activeAnalysis = resolveActiveAnalysis({
        chatId,
        activeChatContext,
        analysis,
        masters,
    });
    const recommendation = getRecommendation(activeAnalysis);
    const routeBlocks = getRouteBlocks(recommendation);
    const suggestedSubjects = getSuggestedSubjects(recommendation);
    const improvementTips = useMemo(
        () =>
            buildImprovementTips({
                recommendation,
                routeBlocks,
                suggestedSubjects,
            }),
        [recommendation, routeBlocks, suggestedSubjects]
    );
    const cvImprovementContent = useMemo(
        () =>
            buildCvImprovementContent({
                analysis: activeAnalysis,
                improvementTips,
                recommendation,
                routeBlocks,
                suggestedSubjects,
            }),
        [activeAnalysis, improvementTips, recommendation, routeBlocks, suggestedSubjects]
    );
    const needsMasterSelection = !activeMaster || isChoosingMaster;
    const selectedMasterVisual = getMasterVisual(activeMaster?.id);
    const analysisForChat = resolveAnalysisForChat({
        chatId,
        activeChatContext,
        analysis,
    });

    // Cambiar de master invalida el archivo seleccionado y el analisis visible porque ambos
    // dependen del MBA activo.
    const clearCurrentAnalysis = useCallback(() => {
        setAnalysis(null);
        setFile(null);
    }, [setAnalysis, setFile]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleOpenProfile = () => {
        navigate('/perfil');
    };

    const openChat = (nextChatId) => {
        setChatId(nextChatId);
        setActiveChatContext(null);
    };

    const handleDeleteChat = (event, chatToDeleteId, chatTitle = 'esta conversacion') => {
        event.stopPropagation();
        setChatPendingDelete({
            id: chatToDeleteId,
            title: chatTitle,
        });
    };

    const handleCancelDeleteChat = () => {
        if (isDeletingChat) {
            return;
        }

        setChatPendingDelete(null);
    };

    const handleConfirmDeleteChat = async () => {
        if (!chatPendingDelete?.id || isDeletingChat) {
            return;
        }

        setIsDeletingChat(true);

        try {
            await deleteChat(chatPendingDelete.id);
            if (chatId === chatPendingDelete.id) {
                setChatId(null);
                setActiveChatContext(null);
            }
            setChatPendingDelete(null);
        } catch (deleteError) {
            console.error('Error deleting chat:', deleteError);
            setError('No se pudo eliminar la conversacion.');
        } finally {
            setIsDeletingChat(false);
        }
    };

    // Centraliza la creacion de chats para que historial, contexto activo y fallback de
    // analisis se actualicen siempre con la misma logica.
    const createContextChat = useCallback(async (payload) => {
        const response = await createChat(payload);

        if (response.success) {
            setChatId(response.data.chat.id);
            setActiveChatContext({
                chatId: response.data.chat.id,
                masterId: response.data.chat.masterId || payload.masterId || null,
                cvAnalysisId: response.data.chat.cvAnalysisId || payload.cvAnalysisId || null,
                analysis:
                    payload.cvAnalysisId && activeAnalysis?.id === payload.cvAnalysisId
                        ? activeAnalysis
                        : null,
            });
            await refreshHistory();
            return response.data.chat.id;
        }

        return null;
    }, [activeAnalysis, refreshHistory, setActiveChatContext, setChatId]);

    const handleMasterSelection = async (masterId) => {
        setError('');

        try {
            const response = await selectMaster(masterId);

            if (!response.success) {
                setError(response.message || 'No se pudo seleccionar el MBA.');
                return;
            }

            setIsChoosingMaster(false);
            setShowMasterSelectionModal(false);
            setActiveChatContext((previousContext) => {
                // Si el chat ya trae un master propio, no lo pisamos desde la seleccion global.
                if (!previousContext || previousContext.masterId) {
                    return previousContext;
                }

                return {
                    ...previousContext,
                    masterId,
                };
            });
            clearCurrentAnalysis();
        } catch (selectionError) {
            console.error('Error selecting master:', selectionError);
            setError(selectionError.response?.data?.message || 'No se pudo seleccionar el MBA.');
        }
    };

    const handleNewChat = async () => {
        try {
            await createContextChat(
                buildChatPayload({
                    masterId: selectedMaster?.id,
                    cvAnalysisId: analysis?.id,
                })
            );
        } catch (chatError) {
            console.error('Error creating chat:', chatError);
            setError('No se pudo crear un nuevo chat.');
        }
    };

    const ensureActiveChat = useCallback(async () => {
        if (chatId) {
            return chatId;
        }

        // El primer mensaje puede disparar la creacion perezosa del chat; este helper evita
        // duplicar esa decision entre dashboard y hook de sesion.
        return createContextChat(
            buildChatPayload({
                masterId: selectedMaster?.id,
                cvAnalysisId: analysis?.id,
            })
        );
    }, [analysis?.id, chatId, createContextChat, selectedMaster?.id]);

    const handleChangeMaster = () => {
        setIsChoosingMaster(true);
        setShowMasterSelectionModal(true);
        clearCurrentAnalysis();
        setChatId(null);
        setActiveChatContext(null);
        setError('');
    };

    const handleCloseMasterSelectionModal = () => {
        setShowMasterSelectionModal(false);
        setIsChoosingMaster(false);
    };

    const handleOpenMasterSelectionModal = () => {
        setShowMasterSelectionModal(true);
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files?.[0];

        if (!selectedFile) {
            return;
        }

        const extension = selectedFile.name.split('.').pop()?.toLowerCase();

        if (extension !== 'pdf') {
            setError('Solo se permite subir archivos PDF.');
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const handleUpload = async () => {
        if (!file || !activeMaster) {
            return;
        }

        setError('');

        try {
            const result = await uploadAnalysis(file, activeMaster.id);

            if (result?.response?.success) {
                // Si aun no existe chat, abrimos uno asociado al analisis recien creado para
                // que la conversacion nazca ya contextualizada.
                if (!chatId) {
                    await createContextChat({
                        ...buildChatPayload({
                            title: `Consulta ${getMasterDisplayName(activeMaster)}: ${file.name}`,
                            masterId: activeMaster.id,
                            cvAnalysisId: result.response.data.cvAnalysisId,
                        }),
                    });
                } else {
                    setActiveChatContext((previousContext) => ({
                        ...previousContext,
                        chatId,
                        masterId: activeMaster.id,
                        cvAnalysisId: result.response.data.cvAnalysisId,
                        analysis: result.analysis || null,
                    }));
                }
            }
        } catch (uploadError) {
            console.error('Error uploading CV:', uploadError);
            setError(uploadError.response?.data?.message || 'No se pudo procesar el CV.');
        }
    };

    const showSidebarTooltip = (event, text) => {
        if (isSidebarOpen) {
            return;
        }

        setHoverTooltip(buildSidebarTooltip(event.currentTarget, text));
    };

    const hideSidebarTooltip = () => {
        setHoverTooltip(null);
    };

    const handleChatContextChange = useCallback((chatContext) => {
        setActiveChatContext((previousContext) => {
            if (!chatContext) {
                return null;
            }

            // El backend puede devolver analisis con shape distinto al cache local; lo
            // normalizamos antes de mezclarlo con el contexto del chat.
            const normalizedAnalysis = chatContext.analysis
                ? normalizeAnalysis(chatContext.analysis, masters)
                : null;

            return {
                ...previousContext,
                ...chatContext,
                analysis: normalizedAnalysis,
            };
        });
    }, [masters, setActiveChatContext]);

    return {
        analysis: activeAnalysis,
        analysisForChat,
        analysisLoading,
        chatId,
        chatPendingDelete,
        error,
        file,
        history,
        historyLoading,
        hoverTooltip,
        cvImprovementContent,
        improvementTips,
        isDeletingChat,
        isDarkMode,
        isSidebarOpen,
        masters,
        needsMasterSelection,
        recommendation,
        routeBlocks,
        selectedMaster: activeMaster,
        selectedMasterVisual,
        showMasterSelectionModal,
        suggestedSubjects,
        toggleTheme,
        uploading,
        actions: {
            handleCancelDeleteChat,
            handleChangeMaster,
            handleCloseMasterSelectionModal,
            handleConfirmDeleteChat,
            handleDeleteChat,
            handleFileChange,
            handleLogout,
            handleMasterSelection,
            handleNewChat,
            handleOpenMasterSelectionModal,
            handleOpenProfile,
            handleUpload,
            handleChatContextChange,
            openChat,
            ensureActiveChat,
            setIsSidebarOpen,
            showSidebarTooltip,
            hideSidebarTooltip,
        },
    };
};
