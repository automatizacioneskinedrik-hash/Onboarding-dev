import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useTheme } from '../../theme';
import { useChatHistory } from '../../chat';
import { createChat } from '../../chat/services/chatService';
import { normalizeAnalysis, useCvAnalysis } from '../../cv-analysis';
import {
    buildImprovementTips,
    getRecommendation,
    getRouteBlocks,
    getSuggestedSubjects,
} from '../../recommendation';
import { findMasterById, getMasterDisplayName, getMasterVisual } from '../../../shared/utils/masters';

export const useHomeDashboard = () => {
    const { logout, masters, selectedMaster, selectMaster, user } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [chatId, setChatId] = useState(location.state?.openChatId || null);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [hoverTooltip, setHoverTooltip] = useState(null);
    const [isChoosingMaster, setIsChoosingMaster] = useState(false);
    const [showMasterSelectionModal, setShowMasterSelectionModal] = useState(!selectedMaster);
    const [activeChatContext, setActiveChatContext] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
    );

    const { history, historyLoading, refreshHistory, deleteChat } = useChatHistory({
        enabled: Boolean(user),
    });

    const { analysis, analysisLoading, setAnalysis, uploadAnalysis, uploading } = useCvAnalysis({
        enabled: Boolean(user),
        masters,
        selectedMaster,
    });

    const activeMaster = chatId
        ? findMasterById(masters, activeChatContext?.masterId) || null
        : selectedMaster || null;
    const activeAnalysis = chatId
        ? activeChatContext?.analysis
            ? normalizeAnalysis(activeChatContext.analysis, masters)
            : null
        : analysis;
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
    const needsMasterSelection = !activeMaster || isChoosingMaster;
    const selectedMasterVisual = getMasterVisual(activeMaster?.id);
    const analysisForChat = chatId ? activeChatContext?.cvAnalysisId || null : analysis?.id || null;

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

    const handleDeleteChat = async (event, chatToDeleteId) => {
        event.stopPropagation();

        if (!window.confirm('Eliminar esta conversacion?')) {
            return;
        }

        try {
            await deleteChat(chatToDeleteId);
            if (chatId === chatToDeleteId) {
                setChatId(null);
                setActiveChatContext(null);
            }
        } catch (deleteError) {
            console.error('Error deleting chat:', deleteError);
            setError('No se pudo eliminar la conversacion.');
        }
    };

    const createContextChat = async (payload) => {
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
    };

    const buildChatPayload = ({ title, masterId, cvAnalysisId } = {}) => ({
        ...(title ? { title } : {}),
        ...(masterId ? { masterId } : {}),
        ...(cvAnalysisId ? { cvAnalysisId } : {}),
    });

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
            setAnalysis(null);
            setFile(null);
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

        return createContextChat(
            buildChatPayload({
                masterId: selectedMaster?.id,
                cvAnalysisId: analysis?.id,
            })
        );
    }, [analysis?.id, chatId, selectedMaster?.id]);

    const handleChangeMaster = () => {
        setIsChoosingMaster(true);
        setShowMasterSelectionModal(true);
        setAnalysis(null);
        setFile(null);
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

        const rect = event.currentTarget.getBoundingClientRect();
        setHoverTooltip({
            text,
            left: rect.right + 12,
            top: rect.top + rect.height / 2,
        });
    };

    const hideSidebarTooltip = () => {
        setHoverTooltip(null);
    };

    const handleChatContextChange = useCallback((chatContext) => {
        setActiveChatContext((previousContext) => {
            if (!chatContext) {
                return null;
            }

            const normalizedAnalysis = chatContext.analysis
                ? normalizeAnalysis(chatContext.analysis, masters)
                : null;

            return {
                ...previousContext,
                ...chatContext,
                analysis: normalizedAnalysis,
            };
        });
    }, [masters]);

    return {
        analysis: activeAnalysis,
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
        selectedMaster: activeMaster,
        selectedMasterVisual,
        showMasterSelectionModal,
        suggestedSubjects,
        toggleTheme,
        uploading,
        actions: {
            handleChangeMaster,
            handleCloseMasterSelectionModal,
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
