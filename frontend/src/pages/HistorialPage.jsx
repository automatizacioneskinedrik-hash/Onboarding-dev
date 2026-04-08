import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, GraduationCap, Loader2, MessageSquare, Search, Trash2 } from 'lucide-react';
import { useTheme } from '../features/theme';
import { useChatHistory } from '../features/chat';
import ConfirmDialog from '../shared/ui/ConfirmDialog';

const HistorialPage = () => {
    const { history: chats, historyLoading: loading, deleteChat } = useChatHistory({ enabled: true });
    const { isDarkMode } = useTheme();
    const [chatPendingDelete, setChatPendingDelete] = useState(null);
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    const filteredChats = useMemo(
        () => chats.filter((chat) => chat.title.toLowerCase().includes(searchTerm.toLowerCase())),
        [chats, searchTerm]
    );

    const handleDeleteChat = (event, chatId, chatTitle) => {
        event.stopPropagation();
        setChatPendingDelete({
            id: chatId,
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
            setChatPendingDelete(null);
        } catch (error) {
            console.error('Error deleting chat:', error);
        } finally {
            setIsDeletingChat(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                <Loader2 className="animate-spin text-orange-accent" size={40} />
                <p className="text-dark-muted">Cargando tus conversaciones...</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in space-y-8 duration-700">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="mb-2 text-3xl font-bold">Historial de Consultas</h1>
                    <p className="text-sm text-muted">Todas tus conversaciones guardadas con el Asistente LÄR University</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por titulo..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="input-field pl-10 md:w-64"
                    />
                </div>
            </header>

            {filteredChats.length === 0 ? (
                <div className="card-premium flex flex-col items-center justify-center py-20 text-center">
                    <div className="relative mb-8">
                        <div className="animate-float-1 absolute -right-4 -top-4 h-3 w-3 rounded-full bg-orange-accent opacity-60" />
                        <div className="animate-float-2 absolute -bottom-2 -left-6 h-2 w-2 rounded-full bg-orange-accent opacity-40" />

                        <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-[2rem] border border-orange-accent/20 bg-[#121212] text-orange-accent shadow-2xl">
                            <MessageSquare size={44} strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="mb-8 space-y-2">
                        <h2 className="text-2xl font-black text-white">No se encontraron conversaciones</h2>
                        <div className="space-y-1">
                            <p className="mx-auto max-w-sm text-stone-400">
                                Parece que aun no has iniciado ninguna charla o no coincide con tu busqueda.
                            </p>
                            <p className="text-sm font-bold italic text-orange-accent/80">
                                Empieza a trazar tu ruta profesional hoy.
                            </p>
                        </div>
                    </div>

                    <button onClick={() => navigate('/')} className="btn-primary">
                        <span className="mr-2 text-xl leading-none">+</span>
                        <span>Comenzar nueva asesoria</span>
                    </button>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredChats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => navigate('/', { state: { openChatId: chat.id } })}
                            className="group card flex cursor-pointer items-center gap-4 p-4 transition-all hover:border-orange-accent/30"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-dark-border text-orange-accent transition-colors group-hover:bg-orange-accent group-hover:text-white">
                                <MessageSquare size={24} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="truncate text-lg font-bold transition-colors group-hover:text-orange-accent">
                                    {chat.title}
                                </h3>
                                <div className="flex items-center gap-1">
                                    <Calendar size={14} />
                                    <span>{formatDate(chat.createdAt)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <GraduationCap size={14} />
                                    <span>{chat.messages?.length || 0} mensajes</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(event) => handleDeleteChat(event, chat.id, chat.title)}
                                    className={`rounded-lg p-2 transition-all ${
                                        isDarkMode
                                            ? 'text-dark-muted hover:bg-red-500/10 hover:text-red-500'
                                            : 'text-light-muted hover:bg-red-500/10 hover:text-red-500'
                                    }`}
                                    title="Eliminar conversacion"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <ChevronRight
                                    className="text-dark-muted transition-transform group-hover:translate-x-1 group-hover:text-orange-accent"
                                    size={20}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={Boolean(chatPendingDelete)}
                isDarkMode={isDarkMode}
                title="Eliminar conversacion"
                description={`Se eliminara "${chatPendingDelete?.title || 'este chat'}" de tu historial. Esta accion no se puede deshacer.`}
                confirmLabel="Eliminar chat"
                cancelLabel="Conservar"
                loading={isDeletingChat}
                onCancel={handleCancelDeleteChat}
                onConfirm={handleConfirmDeleteChat}
            />
        </div>
    );
};

export default HistorialPage;
