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
    const [chatId, setChatId] = useState(location.state?.openChatId || null);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [isChoosingMaster, setIsChoosingMaster] = useState(false);
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

    const needsMasterSelection = !selectedMaster || isChoosingMaster;
    const currentStep = analysis ? 3 : needsMasterSelection ? 1 : 2;
    const selectedMasterVisual = getMasterVisual(selectedMaster?.id);
    const cvSummary = buildCvSummary(analysis);
    const recommendation = analysis?.recommendation || null;
    const recommendedCourses = recommendation?.recommendedCourses || [];
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

        if (recommendedCourses.length) {
            tips.push(
                `Cursos mas cercanos a tu perfil: ${recommendedCourses
                    .slice(0, 2)
                    .map((course) => course.title)
                    .join(', ')}.`
            );
        }

        return tips.slice(0, 3);
    }, [recommendation, suggestedSubjects, recommendedCourses]);

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
        <div className={`flex w-full min-h-screen relative overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-transparent' : 'bg-light-bg'}`}>
            <aside
                className={`sidebar-transition flex-shrink-0 relative z-[60] overflow-hidden border-r transition-colors duration-300 ${
                    isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-stone-200'
                } ${isSidebarOpen ? 'w-52 xl:w-48 opacity-100 p-2.5 xl:p-2' : 'w-0 opacity-0 p-0'}`}
            >
                <div className="h-full flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">Historial</h3>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="p-1.5 hover:bg-orange-accent/10 rounded-lg text-orange-accent transition-all"
                        >
                            <Plus className="rotate-45" size={16} />
                        </button>
                    </div>

                    <div className={`grid grid-cols-3 gap-1.5 pb-2 border-b ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                        <button
                            onClick={() => navigate('/perfil')}
                            title="Perfil"
                            className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                                isDarkMode ? 'bg-white/5 text-white/80 hover:bg-white/10' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                        >
                            <User size={14} />
                        </button>
                        <button
                            onClick={toggleTheme}
                            title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                            className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                                isDarkMode ? 'bg-white/5 text-orange-accent hover:bg-white/10' : 'bg-stone-100 text-orange-accent hover:bg-stone-200'
                            }`}
                        >
                            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            title="Cerrar sesion"
                            className={`h-8 rounded-lg flex items-center justify-center transition-all ${
                                isDarkMode ? 'bg-white/5 text-white/80 hover:bg-red-500/10 hover:text-red-400' : 'bg-stone-100 text-stone-700 hover:bg-red-100 hover:text-red-600'
                            }`}
                        >
                            <LogOut size={14} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                        {historyLoading ? (
                            <div className="text-center py-10 opacity-40">
                                <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
                                <p className="text-[8px] font-bold uppercase">Cargando</p>
                            </div>
                        ) : history.length > 0 ? (
                            history.map((chat) => (
                                <div key={chat.id} className="group relative">
                                    <button
                                        onClick={() => setChatId(chat.id)}
                                        className={`w-full text-left px-2.5 py-2 rounded-lg transition-all flex items-center gap-2 border ${
                                            chatId === chat.id
                                                ? 'bg-orange-accent/10 border-orange-accent/20 text-orange-accent'
                                                : 'border-transparent hover:bg-stone-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                                        }`}
                                    >
                                        <MessageSquare size={12} className="flex-shrink-0" />
                                        <p className="font-bold text-[8px] truncate uppercase tracking-tight">{chat.title}</p>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteChat(e, chat.id)}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 opacity-20">
                                <Clock size={24} className="mx-auto mb-2" />
                                <p className="text-[8px] font-bold uppercase">Sin actividad</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleNewChat}
                        className="w-full py-3 rounded-lg bg-orange-accent text-white font-bold text-[9px] tracking-[0.18em] shadow-xl shadow-orange-accent/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    >
                        Nuevo chat
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 transform-gpu overflow-y-auto overflow-x-hidden">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`fixed top-3 sm:top-0 left-0 z-[100] w-12 h-12 rounded-br-2xl bg-orange-accent text-white shadow-2xl shadow-orange-accent/40 flex flex-col items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'w-14 h-14' : 'hover:w-14 hover:h-14'} border-none m-0 p-0`}
                >
                    <div className="flex flex-col gap-[4px]">
                        <span className="hamburger-line line-1"></span>
                        <span className="hamburger-line line-2"></span>
                        <span className="hamburger-line line-3"></span>
                    </div>
                </button>

                <div className="w-full space-y-4 py-4 px-2 sm:px-3 lg:px-4 xl:px-3 2xl:px-4">
                    <div className="flex items-center justify-start pl-14 sm:pl-24 lg:pl-12 pt-12 sm:pt-0">
                        <button type="button" onClick={() => navigate('/')} className="flex items-center gap-2.5 group">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-white border border-stone-200'}`}>
                                <svg viewBox="0 0 100 100" className="w-6 h-6">
                                    <polygon points="50,20 15,80 85,80" fill="none" stroke="#F05A28" strokeWidth="12" />
                                    <rect x="42" y="4" width="8" height="8" fill="#F05A28" />
                                    <rect x="52" y="4" width="8" height="8" fill="#F05A28" />
                                </svg>
                            </div>
                            <div className="leading-none text-left">
                                <p className={`text-[1rem] font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                                    LAR <span className="text-orange-accent">UNIVERSITY</span>
                                </p>
                                <p className="text-[8px] uppercase tracking-[0.22em] text-orange-accent/60 font-black mt-1">
                                    Elite Tech
                                </p>
                            </div>
                        </button>
                    </div>
                    <header className="w-full max-w-xl mx-auto">
                        <div className="flex items-center justify-between relative px-2">
                            <div className={`absolute top-1/2 left-0 w-full h-[4px] -translate-y-1/2 z-0 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]' : 'bg-stone-200 shadow-[0_0_12px_rgba(0,0,0,0.12)]'}`}></div>
                            {[1, 2, 3].map((step) => (
                                <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all border-2 ${
                                            currentStep >= step
                                                ? 'bg-orange-accent text-white border-orange-accent shadow-[0_0_15px_rgba(240,90,40,0.5)] scale-110'
                                                : isDarkMode
                                                    ? 'bg-stone-900 border-white/10 text-stone-500'
                                                    : 'bg-white border-stone-200 text-stone-500'
                                        }`}
                                    >
                                        {step}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </header>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">
                        <div className="space-y-4">
                            <div className={`rounded-[2rem] border p-4 sm:p-5 ${isDarkMode ? 'bg-[#0D0D0D]/80 border-white/10' : 'bg-white/90 border-stone-200'} shadow-2xl`}>
                                <ChatComponent
                                    chatId={chatId}
                                    cvAnalysisId={analysisForChat}
                                    userName={user?.name}
                                    selectedMaster={selectedMaster}
                                    recommendation={recommendation}
                                    suggestedSubjects={suggestedSubjects}
                                    recommendedCourses={recommendedCourses}
                                    chatEnabled={Boolean(selectedMaster && chatId)}
                                    lockedMessage={lockedMessage}
                                />
                            </div>
                        </div>

                        <div className={`rounded-[2rem] border p-5 sm:p-6 cv-upload-section ${isDarkMode ? 'bg-[#0D0D0D]/90 border-white/10' : 'bg-white/95 border-stone-200'} shadow-2xl space-y-6`}>
                            {needsMasterSelection ? (
                                <div className="flex flex-col items-center justify-center text-center py-12 space-y-5">
                                    <div className="w-20 h-20 rounded-[1.5rem] flex items-center justify-center border border-orange-accent/20 bg-orange-accent/10">
                                        <Upload className="text-orange-accent" size={28} />
                                    </div>
                                    <div className="space-y-2 max-w-[260px]">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">Primer paso</p>
                                        <h3 className={`text-xl font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                            Selecciona tu master
                                        </h3>
                                        <p className={`text-[10px] font-medium uppercase tracking-[0.16em] leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-stone-500'}`}>
                                            El selector aparecera sobre la pantalla para definir el contexto de tu ruta.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className={`flex items-center justify-between border-b pb-4 ${isDarkMode ? 'border-white/10' : 'border-stone-200'}`}>
                                        <button
                                            onClick={handleChangeMaster}
                                            className={`text-[10px] font-bold tracking-widest uppercase transition-all ${isDarkMode ? 'text-white/50 hover:text-orange-accent' : 'text-stone-500 hover:text-orange-accent'}`}
                                        >
                                            Cambiar master
                                        </button>
                                        <span
                                            className="text-[10px] font-bold py-2 px-4 rounded-full text-white uppercase tracking-widest"
                                            style={{ backgroundColor: selectedMasterVisual.color }}
                                        >
                                            {getMasterDisplayName(selectedMaster)}
                                        </span>
                                    </div>

                                    {analysisLoading ? (
                                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                                            <Loader2 className="animate-spin text-orange-accent" size={28} />
                                            <p className={`${isDarkMode ? 'text-white/60' : 'text-stone-500'} text-[10px] uppercase tracking-[0.18em]`}>
                                                Cargando analisis
                                            </p>
                                        </div>
                                    ) : !analysis ? (
                                        <div className="space-y-5">
                                            <div className="flex flex-col items-center text-center space-y-5">
                                                <div className="relative w-20 h-20 rounded-[1.5rem] flex items-center justify-center border-2 border-dashed border-orange-accent/40 bg-orange-accent/5">
                                                    <Upload className="text-orange-accent" size={30} />
                                                </div>

                                                <div className="space-y-2">
                                                    <h3 className={`text-xl font-bold tracking-tight uppercase italic ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                                        Vincular potencial
                                                    </h3>
                                                    <p className={`text-[10px] font-medium uppercase tracking-[0.2em] leading-relaxed ${isDarkMode ? 'opacity-50 text-white' : 'text-stone-500'}`}>
                                                        Sube tu CV para obtener una recomendacion y una ruta adaptada a {getMasterDisplayName(selectedMaster)}.
                                                    </p>
                                                </div>

                                                <div className="w-full space-y-3">
                                                    <label
                                                        className={`flex items-center justify-center gap-3 w-full h-12 rounded-xl border-2 font-bold text-[10px] tracking-widest transition-all cursor-pointer ${
                                                            file
                                                                ? isDarkMode
                                                                    ? 'border-orange-accent text-orange-accent bg-orange-accent/10'
                                                                    : 'border-orange-accent text-orange-accent bg-orange-50'
                                                                : isDarkMode
                                                                    ? 'border-white/10 bg-stone-900/40 text-white/70'
                                                                    : 'border-stone-300 bg-white text-stone-700'
                                                        }`}
                                                    >
                                                        <FileText size={16} />
                                                        <span className="truncate max-w-[220px]">{file ? file.name : 'Seleccionar PDF'}</span>
                                                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                                    </label>

                                                    <button
                                                        onClick={handleUpload}
                                                        disabled={!file || uploading}
                                                        className="w-full h-12 rounded-xl bg-orange-accent text-white font-bold text-[10px] tracking-[0.25em] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    >
                                                        {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Analizar CV'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-500/40 bg-emerald-50'}`}>
                                                <CheckCircle size={18} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                                                <p className={`text-[10px] uppercase tracking-[0.15em] font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                                                    CV analizado para {getMasterDisplayName(selectedMaster)}
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">Resumen del perfil</p>
                                                <div className={`space-y-2 text-[11px] ${isDarkMode ? 'text-white/80' : 'text-stone-700'}`}>
                                                    <p><span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>Rol:</span> {cvSummary.role}</p>
                                                    <p><span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>Industria:</span> {cvSummary.industry}</p>
                                                    <p><span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>Experiencia:</span> {cvSummary.experience}</p>
                                                    <p><span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>Skills:</span> {cvSummary.topSkills.length ? cvSummary.topSkills.join(', ') : 'No especificadas'}</p>
                                                </div>
                                            </div>

                                            {improvementTips.length > 0 && (
                                                <div className="space-y-3 pt-1">
                                                    <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">Recomendaciones de tu CV</p>
                                                    <div className="space-y-2">
                                                        {improvementTips.map((tip) => (
                                                            <div
                                                                key={tip}
                                                                className={`rounded-xl border px-3 py-2 ${isDarkMode ? 'border-white/10 bg-white/[0.03]' : 'border-stone-200 bg-stone-50'}`}
                                                            >
                                                                <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-white/85' : 'text-stone-700'}`}>
                                                                    {tip}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

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
