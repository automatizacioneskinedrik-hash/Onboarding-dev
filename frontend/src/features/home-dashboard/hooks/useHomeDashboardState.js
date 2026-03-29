import { useState } from 'react';

export const useHomeDashboardState = ({ initialChatId, showMasterSelectionInitially }) => {
    const [chatId, setChatId] = useState(initialChatId || null);
    const [error, setError] = useState('');
    const [file, setFile] = useState(null);
    const [hoverTooltip, setHoverTooltip] = useState(null);
    const [isChoosingMaster, setIsChoosingMaster] = useState(false);
    const [showMasterSelectionModal, setShowMasterSelectionModal] = useState(showMasterSelectionInitially);
    const [activeChatContext, setActiveChatContext] = useState(null);
    const [chatPendingDelete, setChatPendingDelete] = useState(null);
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    // En desktop dejamos la sidebar abierta por defecto; en mobile nace cerrada para no
    // tapar el panel principal.
    const [isSidebarOpen, setIsSidebarOpen] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
    );

    return {
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
    };
};
