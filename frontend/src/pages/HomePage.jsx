import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    CheckCircle,
    Clock,
    FileText,
    Loader2,
    LogOut,
    MessageSquare,
    Moon,
    Plus,
    Sun,
    Trash2,
    Upload,
    User,
} from 'lucide-react';
import api from '../services/api';
import ChatComponent from '../components/ChatComponent';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
    findMasterById,
    getMasterDescription,
    getMasterDisplayName,
    getMasterVisual,
} from '../utils/masters';

const MOTIVATIONAL_PHRASES = [
    { text: 'Tu siguiente salto se disena con foco', color: '#F05A28', bg: '#1A1A1A' },
    { text: 'Primero el master, luego la ruta', color: '#fbdace', bg: '#F05A28' },
    { text: 'Sube tu CV y convierte teoria en sprint', color: '#F05A28', bg: '#000000' },
];

const normalizeAnalysis = (payload, masters) => {
    if (!payload) return null;

    const master = findMasterById(masters, payload.masterId);
    return {
        ...payload,
        master,
        masterId: payload.masterId || master?.id || null,
        extractedProfile: payload.extractedProfile || payload.profile || {},
        recommendation: payload.recommendation || {},
    };
};

const buildCvSummary = (analysis) => {
    const profile = analysis?.extractedProfile || {};
    return {
        role: profile.currentRole || 'No especificado',
        industry: profile.industry || 'No especificada',
        experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} anos` : 'No especificada',
        topSkills: (profile.skills || []).slice(0, 4),
    };
};

const HomePage = () => {
    const { user, logout, masters, selectedMaster, selectMaster } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();

    const [currentPhrase, setCurrentPhrase] = useState(0);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [availableModules, setAvailableModules] = useState([]);
    const [modulesLoading, setModulesLoading] = useState(false);
    const [chatId, setChatId] = useState(location.state?.openChatId || null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [isChoosingMaster, setIsChoosingMaster] = useState(false);
    const [hoverTooltip, setHoverTooltip] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(
        typeof window !== 'undefined' ? window.innerWidth >= 1280 : false
    );

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPhrase((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const response = await api.get('/chat');
                if (response.data.success) {
                    setHistory(response.data.data.chats || []);
                }
            } catch (err) {
                console.error('Error fetching history:', err);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchHistory();
    }, [user, chatId]);

    useEffect(() => {
        if (!user) return;

        const fetchAnalysis = async () => {
            setAnalysisLoading(true);
            try {
                const response = await api.get('/cv/my-analysis');
                if (response.data.success) {
                    setAnalysis(normalizeAnalysis(response.data.data.analysis, masters));
                } else {
                    setAnalysis(null);
                }
            } catch (err) {
                setAnalysis(null);
            } finally {
                setAnalysisLoading(false);
            }
        };

        fetchAnalysis();
    }, [user, masters]);

    useEffect(() => {
        if (!analysis || !selectedMaster) return;
        if (analysis.masterId !== selectedMaster.id) {
            setAnalysis(null);
        }
    }, [analysis, selectedMaster]);

    useEffect(() => {
        if (!selectedMaster?.id) {
            setAvailableModules([]);
            return;
        }

        const fetchMasterModules = async () => {
            setModulesLoading(true);
            try {
                const response = await api.get('/users/master-modules', {
                    params: { masterId: selectedMaster.id },
                });

                if (response.data.success) {
                    setAvailableModules(response.data.data.modules || []);
                } else {
                    setAvailableModules([]);
                }
            } catch (error) {
                console.error('Error fetching master modules:', error);
                setAvailableModules([]);
            } finally {
                setModulesLoading(false);
            }
        };

        fetchMasterModules();
    }, [selectedMaster]);

    const needsMasterSelection = !selectedMaster || isChoosingMaster;
    const currentStep = analysis ? 3 : needsMasterSelection ? 1 : 2;
    const selectedMasterVisual = getMasterVisual(selectedMaster?.id);
    const cvSummary = buildCvSummary(analysis);
    const recommendation = analysis?.recommendation || null;
    const routeBlocks = recommendation?.sprint?.blocks || recommendation?.planBlocks || [];
    const suggestedSubjects = recommendation?.subjects || [];

    const lockedMessage = selectedMaster
        ? 'Sube tu CV para habilitar recomendaciones personalizadas en el chat.'
        : 'Selecciona un master para comenzar.';

    const analysisForChat = analysis?.id ? analysis.id : null;

    const improvementTips = useMemo(() => {
        if (!recommendation) return [];

        const tips = [];

        if (recommendation.reasoning) {
            tips.push(recommendation.reasoning);
        }

        if (suggestedSubjects.length) {
            tips.push(`Materias clave: ${suggestedSubjects.slice(0, 3).join(', ')}.`);
        }

        if (routeBlocks.length) {
            tips.push(
                `Bloques principales de la ruta: ${routeBlocks
                    .slice(0, 2)
                    .map((block) => block.blockTitle || block.title)
                    .join(', ')}.`
            );
        }

        return tips.slice(0, 3);
    }, [recommendation, suggestedSubjects, routeBlocks]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleDeleteChat = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('Eliminar esta conversacion?')) return;

        try {
            await api.delete(`/chat/${id}`);
            setHistory((prev) => prev.filter((chat) => chat.id !== id));
            if (chatId === id) setChatId(null);
        } catch (err) {
            console.error('Error deleting chat:', err);
        }
    };

    const handleMasterSelection = async (masterId) => {
        setError('');
        try {
            const response = await selectMaster(masterId);
            if (!response.success) {
                setError(response.message || 'No se pudo seleccionar el master.');
                return;
            }

            setIsChoosingMaster(false);
            setAnalysis(null);
            setFile(null);

            const master = findMasterById(masters, masterId);
            const chatResponse = await api.post('/chat', {
                title: `Consulta ${getMasterDisplayName(master) || masterId}`,
            });

            if (chatResponse.data.success) {
                setChatId(chatResponse.data.data.chat.id);
            }
        } catch (err) {
            console.error('Error selecting master:', err);
            setError(err.response?.data?.message || 'No se pudo seleccionar el master.');
        }
    };

    const handleNewChat = async () => {
        if (!selectedMaster) {
            setError('Selecciona un master antes de iniciar una conversacion.');
            return;
        }

        try {
            const response = await api.post('/chat', {
                title: `Consulta ${getMasterDisplayName(selectedMaster)}`,
                cvAnalysisId: analysisForChat || undefined,
            });

            if (response.data.success) {
                setChatId(response.data.data.chat.id);
            }
        } catch (err) {
            console.error('Error creating chat:', err);
            setError('No se pudo crear un nuevo chat.');
        }
    };

    const handleChangeMaster = () => {
        setIsChoosingMaster(true);
        setAnalysis(null);
        setFile(null);
        setChatId(null);
        setError('');
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (ext !== 'pdf') {
            setError('Solo se permite subir archivos PDF.');
            setFile(null);
            return;
        }

        setFile(selectedFile);
        setError('');
    };

    const showSidebarTooltip = (event, text) => {
        if (isSidebarOpen) return;

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

    const handleUpload = async () => {
        if (!file || !selectedMaster) return;

        setUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('cv', file);
            formData.append('masterId', selectedMaster.id);

            const response = await api.post('/cv/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data.success) {
                const normalized = normalizeAnalysis(
                    {
                        id: response.data.data.cvAnalysisId,
                        masterId: response.data.data.masterId,
                        extractedProfile: response.data.data.profile,
                        recommendation: response.data.data.recommendation,
                    },
                    masters
                );

                setAnalysis(normalized);

                const chatResponse = await api.post('/chat', {
                    title: `Consulta ${getMasterDisplayName(selectedMaster)}: ${file.name}`,
                    cvAnalysisId: response.data.data.cvAnalysisId,
                });

                if (chatResponse.data.success) {
                    setChatId(chatResponse.data.data.chat.id);
                }
            }
        } catch (err) {
            console.error('Error uploading CV:', err);
            setError(err.response?.data?.message || 'No se pudo procesar el CV.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`relative flex h-full min-h-screen w-full overflow-hidden transition-colors duration-300 xl:h-screen ${isDarkMode ? 'bg-transparent' : 'bg-light-bg'}`}>
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
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                title={isSidebarOpen ? 'Contraer sidebar' : 'Expandir sidebar'}
                                className={`group flex min-w-0 items-center rounded-2xl transition-all ${isSidebarOpen ? 'gap-2.5 px-1.5 py-1.5 hover:bg-white/[0.04]' : 'justify-center p-1.5 hover:bg-white/[0.04]'}`}
                            >
                                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-white/[0.04]' : 'bg-stone-100/80'}`}>
                                    <svg viewBox="0 0 100 100" className="h-6 w-6">
                                        <polygon points="50,20 15,80 85,80" fill="none" stroke="#F05A28" strokeWidth="12" />
                                        <rect x="42" y="4" width="8" height="8" fill="#F05A28" />
                                        <rect x="52" y="4" width="8" height="8" fill="#F05A28" />
                                    </svg>
                                </div>
                                {isSidebarOpen && (
                                    <div className="min-w-0 leading-none">
                                        <p className={`truncate text-[0.92rem] font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                                            LAR <span className="text-orange-accent">UNIVERSITY</span>
                                        </p>
                                        <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-orange-accent/60">
                                            Elite Tech
                                        </p>
                                    </div>
                                )}
                            </button>
                        </div>

                        <div className="space-y-1.5">
                            {[
                                {
                                    key: 'perfil',
                                    label: 'Perfil',
                                    onClick: () => navigate('/perfil'),
                                    icon: <User size={13} />,
                                    className: isDarkMode
                                        ? 'border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]'
                                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100',
                                },
                                {
                                    key: 'theme',
                                    label: 'Cambiar tema',
                                    onClick: toggleTheme,
                                    icon: isDarkMode ? <Sun size={13} /> : <Moon size={13} />,
                                    className: isDarkMode
                                        ? 'border-white/10 bg-white/[0.04] text-orange-accent hover:bg-white/[0.08]'
                                        : 'border-stone-200 bg-stone-50 text-orange-accent hover:bg-stone-100',
                                },
                                {
                                    key: 'logout',
                                    label: 'Cerrar sesion',
                                    onClick: handleLogout,
                                    icon: <LogOut size={13} />,
                                    className: isDarkMode
                                        ? 'border-white/10 bg-white/[0.04] text-white/80 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400'
                                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-red-200 hover:bg-red-50 hover:text-red-600',
                                },
                            ].map((action) => (
                                <button
                                    key={action.key}
                                    onClick={action.onClick}
                                    title={action.label}
                                    onMouseEnter={(event) => showSidebarTooltip(event, action.label)}
                                    onMouseLeave={hideSidebarTooltip}
                                    className={`group relative flex items-center rounded-xl border transition-all ${action.className} ${
                                        isSidebarOpen ? 'w-full gap-3 px-3 py-2.5 justify-start' : 'mx-auto h-9 w-9 justify-center'
                                    }`}
                                >
                                    <span className="flex-shrink-0">{action.icon}</span>
                                    {isSidebarOpen ? (
                                        <span className="truncate text-[10px] font-bold tracking-[0.08em]">{action.label}</span>
                                    ) : null}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleNewChat}
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

                    <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-1.5 pt-3">
                        <div className="space-y-2">
                            {isSidebarOpen && (
                                <div className="px-1">
                                    <p className={`text-[9px] font-bold tracking-[0.08em] ${isDarkMode ? 'text-white/28' : 'text-stone-500'}`}>
                                        Historial
                                    </p>
                                </div>
                            )}
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
                                        onClick={() => setChatId(chat.id)}
                                        onMouseEnter={(event) => showSidebarTooltip(event, chat.title)}
                                        onMouseLeave={hideSidebarTooltip}
                                        className={`w-full rounded-xl border text-left transition-all ${
                                            chatId === chat.id
                                                ? 'border-orange-accent/25 bg-orange-accent/12 text-orange-accent shadow-[0_8px_24px_rgba(240,90,40,0.12)]'
                                                : isDarkMode
                                                    ? 'border-transparent bg-transparent text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                                                    : 'border-transparent bg-transparent text-stone-500 hover:border-stone-200 hover:bg-stone-100/80 hover:text-stone-900'
                                        } ${isSidebarOpen ? 'px-3 py-2' : 'mx-auto flex h-10 w-10 items-center justify-center px-0 py-0'}`}
                                        >
                                            <div className={`flex items-center ${isSidebarOpen ? 'gap-2.5 pr-7' : 'justify-center'}`}>
                                                <MessageSquare size={13} className="flex-shrink-0" />
                                                {isSidebarOpen && (
                                                    <div className="min-w-0">
                                                        <p className="truncate text-[10px] font-bold tracking-[0.02em]">{chat.title}</p>
                                                    </div>
                                                )}
                                            </div>
                                    </button>
                                    {isSidebarOpen && (
                                        <button
                                            onClick={(e) => handleDeleteChat(e, chat.id)}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
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
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 overflow-hidden">
                <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <div className="flex-1 min-h-0 overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pt-3 xl:px-5 xl:pt-4">
                        <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-0">
                            <div className={`min-h-0 overflow-hidden rounded-[28px] border ${isDarkMode ? 'border-white/5 bg-[#0C0C0C]/88' : 'border-stone-200 bg-white/88'} shadow-[0_18px_60px_rgba(0,0,0,0.22)]`}>
                                <ChatComponent
                                    chatId={chatId}
                                    cvAnalysisId={analysisForChat}
                                    userName={user?.name}
                                    selectedMaster={selectedMaster}
                                    recommendation={recommendation}
                                    suggestedSubjects={suggestedSubjects}
                                    routeBlocks={routeBlocks}
                                    availableModules={availableModules}
                                    modulesLoading={modulesLoading}
                                    chatEnabled={Boolean(selectedMaster && chatId)}
                                    lockedMessage={lockedMessage}
                                />
                            </div>

                            <aside className="min-h-0 overflow-hidden xl:pl-3">
                                <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l ${isDarkMode ? 'border-white/5 bg-[#111111]/86 xl:bg-[#0E0E0E]/88' : 'border-stone-200 bg-white/92 xl:bg-white/88'} backdrop-blur-xl`}>
                                    <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto px-4 py-4">
                                        {needsMasterSelection ? (
                                            <div className="flex h-full flex-col items-center justify-center text-center">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] border border-orange-accent/20 bg-orange-accent/10">
                                                    <Upload className="text-orange-accent" size={24} />
                                                </div>
                                                <div className="mt-5 max-w-[240px] space-y-2">
                                                    <h3 className={`text-[1.05rem] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        Selecciona tu master
                                                    </h3>
                                                    <p className={`text-[11px] uppercase tracking-[0.16em] leading-relaxed ${isDarkMode ? 'text-white/45' : 'text-stone-500'}`}>
                                                        El panel derecho se convertira en tu area de apoyo cuando definas el contexto.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : analysisLoading ? (
                                            <div className="flex flex-col items-center justify-center gap-3 py-16">
                                                <Loader2 className="animate-spin text-orange-accent" size={28} />
                                                <p className={`${isDarkMode ? 'text-white/60' : 'text-stone-500'} text-[10px] uppercase tracking-[0.18em]`}>
                                                    Cargando analisis
                                                </p>
                                            </div>
                                        ) : !analysis ? (
                                            <div className="space-y-5">
                                                <div className={`flex items-center justify-between gap-2 rounded-[18px] border px-3.5 py-3 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
                                                    <button
                                                        onClick={handleChangeMaster}
                                                        className={`text-[9px] font-bold uppercase tracking-[0.16em] transition-all ${isDarkMode ? 'text-white/55 hover:text-orange-accent' : 'text-stone-500 hover:text-orange-accent'}`}
                                                    >
                                                        Cambiar master
                                                    </button>
                                                    <span
                                                        className="rounded-full px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white"
                                                        style={{ backgroundColor: selectedMasterVisual.color }}
                                                    >
                                                        {getMasterDisplayName(selectedMaster)}
                                                    </span>
                                                </div>

                                                <div className={`rounded-[24px] border px-4 py-4 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
                                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-accent/20 bg-orange-accent/10">
                                                        <Upload className="text-orange-accent" size={20} />
                                                    </div>
                                                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Vincular potencial</p>
                                                    <h3 className={`mt-2 text-[1.15rem] font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        Activa una recomendacion personalizada
                                                    </h3>
                                                    <p className={`mt-2.5 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-600'}`}>
                                                        Sube tu CV para que podamos conectar tu perfil con {getMasterDisplayName(selectedMaster)} y proponerte una ruta mas precisa.
                                                    </p>
                                                </div>

                                                <div className="space-y-2.5">
                                                    <label
                                                        className={`flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3.5 transition-all ${
                                                            file
                                                                ? isDarkMode
                                                                    ? 'border-orange-accent/40 bg-orange-accent/10 text-orange-accent'
                                                                    : 'border-orange-accent/40 bg-orange-50 text-orange-accent'
                                                                : isDarkMode
                                                                    ? 'border-white/10 bg-black/20 text-white/70 hover:border-white/20 hover:bg-white/[0.03]'
                                                                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                                                        }`}
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${file ? 'bg-orange-accent/15' : isDarkMode ? 'bg-white/5' : 'bg-stone-100'}`}>
                                                                <FileText size={15} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="text-[9px] font-bold uppercase tracking-[0.18em]">Subir PDF</p>
                                                                <p className="truncate text-[11px]">{file ? file.name : 'Seleccionar archivo'}</p>
                                                            </div>
                                                        </div>
                                                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                                        <ArrowRight size={16} className="flex-shrink-0" />
                                                    </label>

                                                    <button
                                                        onClick={handleUpload}
                                                        disabled={!file || uploading}
                                                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-accent text-[9px] font-bold uppercase tracking-[0.24em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Analizar CV'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${isDarkMode ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-500/30 bg-emerald-50'}`}>
                                                    <CheckCircle size={18} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                                        CV analizado para {getMasterDisplayName(selectedMaster)}
                                                    </p>
                                                </div>

                                                <div className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Resumen del perfil</p>
                                                        <button
                                                            onClick={handleChangeMaster}
                                                            className={`text-[9px] font-bold uppercase tracking-[0.16em] transition-all ${isDarkMode ? 'text-white/45 hover:text-orange-accent' : 'text-stone-500 hover:text-orange-accent'}`}
                                                        >
                                                            Cambiar master
                                                        </button>
                                                    </div>
                                                    <div className={`mt-3.5 space-y-2.5 text-[11px] ${isDarkMode ? 'text-white/80' : 'text-stone-700'}`}>
                                                        <p><span className={isDarkMode ? 'text-white/45' : 'text-stone-500'}>Rol:</span> {cvSummary.role}</p>
                                                        <p><span className={isDarkMode ? 'text-white/45' : 'text-stone-500'}>Industria:</span> {cvSummary.industry}</p>
                                                        <p><span className={isDarkMode ? 'text-white/45' : 'text-stone-500'}>Experiencia:</span> {cvSummary.experience}</p>
                                                        <p><span className={isDarkMode ? 'text-white/45' : 'text-stone-500'}>Skills:</span> {cvSummary.topSkills.length ? cvSummary.topSkills.join(', ') : 'No especificadas'}</p>
                                                    </div>
                                                </div>

                                                {improvementTips.length > 0 && (
                                                    <div className="space-y-2.5">
                                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Recomendaciones de tu CV</p>
                                                        <div className="space-y-2.5">
                                                            {improvementTips.map((tip) => (
                                                                <div
                                                                    key={tip}
                                                                    className={`rounded-[20px] border px-4 py-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50/80'}`}
                                                                >
                                                                    <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-white/82' : 'text-stone-700'}`}>
                                                                        {tip}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                </section>
            </div>

            {hoverTooltip && (
                <div
                    className={`pointer-events-none fixed z-[220] whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-medium shadow-lg ${
                        isDarkMode ? 'border-white/10 bg-[#161616] text-white' : 'border-stone-700 bg-stone-900 text-white'
                    }`}
                    style={{
                        left: hoverTooltip.left,
                        top: hoverTooltip.top,
                        transform: 'translateY(-50%)',
                    }}
                >
                    {hoverTooltip.text}
                </div>
            )}

            {error && (
                <div className="fixed bottom-10 right-10 flex items-center gap-4 p-6 bg-[#0D0D0D] border-l-[6px] border-orange-accent rounded-3xl text-white shadow-[0_30px_80px_rgba(0,0,0,0.8)] z-[100] max-w-lg">
                    <div className="w-12 h-12 rounded-full bg-orange-accent/10 flex items-center justify-center flex-shrink-0 border border-orange-accent/20">
                        <AlertCircle size={24} className="text-orange-accent" />
                    </div>
                    <div>
                        <h4 className="font-bold text-[11px] tracking-widest uppercase mb-1 text-orange-accent">Sistema LAR</h4>
                        <p className="text-[12px] font-medium uppercase tracking-wider leading-relaxed opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {needsMasterSelection && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="w-full max-w-3xl rounded-[2.5rem] border border-orange-accent/25 bg-[#0D0D0D] p-8 sm:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
                        <div className="text-center mb-8">
                            <p className="text-[10px] tracking-[0.35em] uppercase text-orange-accent font-bold mb-3">
                                Primer paso
                            </p>
                            <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
                                Elige tu <span className="text-orange-accent italic">MBA</span>
                            </h3>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">
                                El chat se habilita despues de subir y analizar tu CV.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {masters.map((master) => (
                                <button
                                    key={master.id}
                                    onClick={() => handleMasterSelection(master.id)}
                                    className="rounded-2xl border border-white/10 bg-stone-900 p-5 text-left hover:border-orange-accent/60 transition-all"
                                >
                                    <p className="text-lg font-bold italic text-white">
                                        {getMasterDisplayName(master)}
                                    </p>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1">
                                        {getMasterDescription(master)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style
                dangerouslySetInnerHTML={{
                    __html: `
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(240, 90, 40, 0.3);
                        border-radius: 10px;
                    }
                `,
                }}
            />
        </div>
    );
};

export default HomePage;

