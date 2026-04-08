import React from 'react';
import { Clock, Loader2, LogOut, MessageSquare, Moon, Plus, Sun, Trash2, User } from 'lucide-react';

const HomeSidebar = ({
    chatId,
    history,
    historyLoading,
    hoverTooltipHandlers,
    isDarkMode,
    isSidebarOpen,
    onDeleteChat,
    onLogout,
    onNewChat,
    onOpenProfile,
    onSelectChat,
    onToggleSidebar,
    onToggleTheme,
}) => {
    const actions = [
        {
            key: 'perfil',
            label: 'Perfil',
            onClick: onOpenProfile,
            icon: <User size={13} />,
            className: isDarkMode
                ? 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100',
        },
        {
            key: 'theme',
            label: 'Cambiar tema',
            onClick: onToggleTheme,
            icon: isDarkMode ? <Sun size={13} /> : <Moon size={13} />,
            className: isDarkMode
                ? 'border-white/10 bg-white/[0.04] text-orange-accent hover:bg-white/[0.08]'
                : 'border-stone-200 bg-stone-50 text-orange-accent hover:bg-stone-100',
        },
        {
            key: 'logout',
            label: 'Cerrar sesion',
            onClick: onLogout,
            icon: <LogOut size={13} />,
            className: isDarkMode
                ? 'border-white/10 bg-white/[0.04] text-white/80 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400'
                : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
        },
    ];

    return (
        <aside
            className={`sidebar-transition relative z-[90] flex h-full flex-shrink-0 overflow-x-visible overflow-y-hidden border-r transition-colors duration-300 ${
                isDarkMode ? 'border-white/5 bg-[#070707]/95 backdrop-blur-xl' : 'border-stone-200 bg-white/95 backdrop-blur-xl'
            } ${isSidebarOpen ? 'w-[258px]' : 'w-[78px]'}`}
        >
            <div className="flex h-full min-h-0 w-full flex-col px-3 py-3">
                <div className={`shrink-0 space-y-3 border-b pb-3 ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                    <div className={`flex items-center ${isSidebarOpen ? 'justify-start gap-3 px-1.5' : 'justify-center'}`}>
                        <button
                            type="button"
                            onClick={onToggleSidebar}
                            title={isSidebarOpen ? 'Contraer sidebar' : 'Expandir sidebar'}
                            className={`group flex min-w-0 items-center rounded-2xl transition-all ${
                                isSidebarOpen ? 'gap-2.5 px-1.5 py-1.5 hover:bg-white/[0.04]' : 'justify-center p-1.5 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div
                                className={`flex items-center justify-center rounded-2xl px-2 ${
                                    isSidebarOpen
                                        ? isDarkMode
                                            ? 'h-10 bg-white/[0.04]'
                                            : 'h-10 bg-stone-100/80'
                                        : isDarkMode
                                            ? 'h-10 w-10 bg-white/[0.04]'
                                            : 'h-10 w-10 bg-stone-100/80'
                                }`}
                            >
                                <img
                                    src={isDarkMode ? '/lar-hub-white.png' : '/lar-hub.svg'}
                                    alt="LAR Hub"
                                    className={`${isSidebarOpen ? 'h-[22px] w-auto max-w-[152px]' : 'h-[18px] w-auto max-w-[28px]'} object-contain`}
                                />
                            </div>
                        </button>
                    </div>

                    <div className="space-y-1.5">
                        {actions.map((action) => (
                            <button
                                key={action.key}
                                onClick={action.onClick}
                                title={action.label}
                                onMouseEnter={(event) => hoverTooltipHandlers.show(event, action.label)}
                                onMouseLeave={hoverTooltipHandlers.hide}
                                className={`group relative flex items-center rounded-xl border transition-all ${action.className} ${
                                    isSidebarOpen ? 'w-full justify-start gap-3 px-3 py-2.5' : 'mx-auto h-9 w-9 justify-center'
                                }`}
                            >
                                <span className="flex-shrink-0">{action.icon}</span>
                                {isSidebarOpen ? <span className="truncate text-[10px] font-bold tracking-[0.08em]">{action.label}</span> : null}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onNewChat}
                        className={`rounded-2xl bg-orange-accent text-white shadow-[0_14px_34px_rgba(240,90,40,0.22)] transition-all hover:brightness-110 active:scale-[0.99] ${
                            isSidebarOpen
                                ? 'w-full px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.22em]'
                                : 'mx-auto flex h-10 w-10 items-center justify-center'
                        }`}
                        title="Nuevo chat"
                    >
                        {isSidebarOpen ? 'Nuevo chat' : <Plus size={16} />}
                    </button>
                </div>

                {isSidebarOpen ? (
                    <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-1.5 pt-3">
                        <div className="space-y-2">
                            <div className="px-1">
                                <p className={`text-[9px] font-bold tracking-[0.08em] ${isDarkMode ? 'text-white/28' : 'text-stone-500'}`}>
                                    Historial
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                {historyLoading ? (
                                    <div className="py-10 text-center opacity-40">
                                        <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                                        <p className="text-[8px] font-bold uppercase tracking-[0.18em]">Cargando</p>
                                    </div>
                                ) : history.length > 0 ? (
                                    history.map((chat) => (
                                        <div key={chat.id} className="group relative">
                                            <button
                                                onClick={() => onSelectChat(chat.id)}
                                                onMouseEnter={(event) => hoverTooltipHandlers.show(event, chat.title)}
                                                onMouseLeave={hoverTooltipHandlers.hide}
                                                className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                                                    chatId === chat.id
                                                        ? 'border-orange-accent/25 bg-orange-accent/12 text-orange-accent shadow-[0_8px_24px_rgba(240,90,40,0.12)]'
                                                        : isDarkMode
                                                            ? 'border-transparent bg-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                                                            : 'border-transparent bg-transparent text-stone-500 hover:border-stone-200 hover:bg-stone-100/80 hover:text-stone-900'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 pr-7">
                                                    <MessageSquare size={13} className="flex-shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[10px] font-bold tracking-[0.02em]">{chat.title}</p>
                                                    </div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={(event) => onDeleteChat(event, chat.id, chat.title)}
                                                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-10 text-center opacity-20">
                                        <Clock size={24} className="mx-auto mb-2" />
                                        <p className="text-[8px] font-bold uppercase tracking-[0.18em]">Sin actividad</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </aside>
    );
};

export default HomeSidebar;
