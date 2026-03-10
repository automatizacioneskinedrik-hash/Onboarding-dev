import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Sparkles, ArrowRight, BookOpen, MessageSquare, Clock, Plus, Trash2 } from 'lucide-react';
import api from '../services/api';
import ChatComponent from '../components/ChatComponent';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const MASTERS = [
    { id: 'MINTEAR', name: 'MINTEAR', desc: 'Master in intelligence', color: 'rgb(255, 107, 53)' },
    { id: 'MTECMBA', name: 'MTECMBA', desc: 'tech management mba', color: 'rgb(132, 193, 193)' },
    { id: 'DATALAR-MBA', name: 'DATALAR-MBA', desc: 'data driven mba', color: 'rgb(80, 165, 132)' }
];

const SPRINTS = [
    { title: 'Fundamentos y Estrategia' },
    { title: 'Implementación Técnica' },
    { title: 'Optimización y Escala' },
    { title: 'Liderazgo y Gestión' },
    { title: 'Innovación Disruptiva' },
    { title: 'Proyecto de Élite' }
];

const MOTIVATIONAL_PHRASES = [
    { text: 'TU VOLUNTAD ES EL ÚNICO LÍMITE', color: '#F05A28', bg: '#1A1A1A' },
    { text: 'ESTRATEGIA, VISIÓN Y ACCIÓN', color: '#fbdace', bg: '#F05A28' },
    { text: 'EL ÉXITO ES UN HÁBITO', color: '#F05A28', bg: '#000000' }
];

const getMasterById = (id) => MASTERS.find((m) => m.id === id);
const getMasterDisplayName = (id) => getMasterById(id)?.desc || id || '';
const buildCvSummary = (profile = {}) => ({
    role: profile.currentRole || 'No especificado',
    industry: profile.industry || 'No especificada',
    experience: profile.yearsOfExperience ? `${profile.yearsOfExperience} años` : 'No especificada',
    topSkills: (profile.skills || []).slice(0, 3),
});

const HomePage = () => {
    const { user } = useAuth();
    const location = useLocation();
    const { isDarkMode } = useTheme();

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const [chatId, setChatId] = useState(location.state?.openChatId || null);
    const [history, setHistory] = useState([]);
    const [error, setError] = useState('');
    const [selectedMaster, setSelectedMaster] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentPhrase, setCurrentPhrase] = useState(0);
    const [showMasterGate, setShowMasterGate] = useState(false);
    const [masterReady, setMasterReady] = useState(false);
    const [cvUploadedNotice, setCvUploadedNotice] = useState(false);

    const getMasterStorageKey = (currentUser) =>
        currentUser?.id ? `lar_selected_master_${currentUser.id}` : `lar_selected_master_${currentUser?.email || 'guest'}`;

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentPhrase((prev) => (prev + 1) % MOTIVATIONAL_PHRASES.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!user) {
            setMasterReady(false);
            return;
        }
        const storedMaster = localStorage.getItem(getMasterStorageKey(user));
        if (storedMaster && MASTERS.some((m) => m.id === storedMaster)) {
            setSelectedMaster(storedMaster);
        }
        setMasterReady(true);
    }, [user]);

    useEffect(() => {
        if (!user || !masterReady) return;
        const key = getMasterStorageKey(user);
        if (selectedMaster) localStorage.setItem(key, selectedMaster);
        else localStorage.removeItem(key);
    }, [selectedMaster, user, masterReady]);

    useEffect(() => {
        setShowMasterGate(Boolean(masterReady && user && !selectedMaster));
    }, [masterReady, user, selectedMaster]);

    useEffect(() => {
        if (!user) return;
        const fetchHistory = async () => {
            try {
                const res = await api.get('/chat');
                if (res.data.success) setHistory(res.data.data.chats);
            } catch (err) {
                console.error('Error fetching history:', err);
            }
        };
        fetchHistory();
    }, [user, chatId]);

    const handleDeleteChat = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar esta conversación?')) return;
        try {
            await api.delete(`/chat/${id}`);
            if (chatId === id) setChatId(null);
        } catch (err) {
            console.error('Error deleting chat:', err);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;
        const ext = selectedFile.name.split('.').pop().toLowerCase();
        if (ext !== 'pdf') {
            setError('Por favor sube un archivo PDF válido (Hoja de Vida)');
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
            formData.append('master', selectedMaster);

            const uploadRes = await api.post('/cv/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data.success) {
                const { cvAnalysisId, profile, recommendation } = uploadRes.data.data;
                setAnalysis({
                    id: cvAnalysisId,
                    extractedProfile: profile,
                    recommendation
                });

                const chatRes = await api.post('/chat', {
                    title: `Consulta ${getMasterDisplayName(selectedMaster)}: ${file.name}`,
                    cvAnalysisId
                });
                if (chatRes.data.success) {
                    setChatId(chatRes.data.data.chat.id);
                }
                setCvUploadedNotice(true);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error al procesar el archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleMasterSelection = async (masterId) => {
        setSelectedMaster(masterId);
        setShowMasterGate(false);
        setAnalysis(null);
        setFile(null);
        setChatId(null);
        setCvUploadedNotice(false);

        try {
            const chatRes = await api.post('/chat', {
                title: `Consulta ${getMasterDisplayName(masterId)}`,
            });
            if (chatRes.data.success) {
                setChatId(chatRes.data.data.chat.id);
            }
        } catch (err) {
            console.error('Error creating chat after master selection:', err);
            setError('No se pudo crear un chat automático para el máster seleccionado.');
        }
    };

    const handleChangeMaster = () => {
        setSelectedMaster(null);
        setAnalysis(null);
        setFile(null);
        setChatId(null);
        setCvUploadedNotice(false);
        setShowMasterGate(true);
    };

    const handleNewChat = async () => {
        if (!selectedMaster) {
            setShowMasterGate(true);
            return;
        }
        try {
            const payload = { title: `Consulta ${getMasterDisplayName(selectedMaster)}` };
            if (analysis?.id && analysis.id !== 'existing') {
                payload.cvAnalysisId = analysis.id;
            }
            const chatRes = await api.post('/chat', payload);
            if (chatRes.data.success) setChatId(chatRes.data.data.chat.id);
        } catch (err) {
            console.error('Error creating new chat:', err);
            setError('No se pudo crear un nuevo chat.');
        }
    };

    const currentStep = analysis ? 3 : selectedMaster ? 2 : 1;
    // Allow accessing existing chats even if CV analysis does not exist yet.
    const chatEnabled = Boolean(chatId);
    const selectedMasterDisplayName = getMasterDisplayName(selectedMaster);
    const cvSummary = buildCvSummary(analysis?.extractedProfile);

    return (
        <div
            className={`flex w-full min-h-[calc(100vh-120px)] relative overflow-hidden transition-colors duration-300 ${
                isDarkMode ? 'bg-transparent' : 'bg-light-bg'
            }`}
        >
            <aside
                className={`sidebar-transition flex-shrink-0 relative z-[60] overflow-hidden border-r transition-colors duration-300 ${
                    isDarkMode ? 'bg-[#0A0A0A] border-white/5' : 'bg-white border-stone-200'
                } ${isSidebarOpen ? 'w-72 opacity-100 p-6' : 'w-0 opacity-0 p-0'}`}
                style={{ marginLeft: 0 }}
            >
                <div className="h-full flex flex-col space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-40">HISTORIAL</h3>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-orange-accent/10 rounded-lg text-orange-accent transition-all">
                            <Plus className="rotate-45" size={18} />
                        </button>
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                        {history.length > 0 ? (
                            history.map((chat) => (
                                <div key={chat.id} className="group relative">
                                    <button
                                        onClick={() => {
                                            setChatId(chat.id);
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 border ${chatId === chat.id ? 'bg-orange-accent/10 border-orange-accent/20 text-orange-accent' : 'border-transparent hover:bg-stone-100 dark:hover:bg-white/5 opacity-60 hover:opacity-100'}`}
                                    >
                                        <MessageSquare size={14} className="flex-shrink-0" />
                                        <p className="font-bold text-[9px] truncate uppercase tracking-tighter">{chat.title}</p>
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteChat(e, chat.id)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 opacity-20"><Clock size={24} className="mx-auto mb-2" /><p className="text-[8px] font-bold uppercase">Sin actividad</p></div>
                        )}
                    </div>

                    <button onClick={handleNewChat} className="w-full py-4 rounded-xl bg-orange-accent text-white font-bold text-[10px] tracking-[0.2em] shadow-xl shadow-orange-accent/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
                        NUEVO CHAT
                    </button>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 transform-gpu overflow-y-auto overflow-x-hidden">
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`fixed top-0 left-0 z-[100] w-12 h-12 rounded-br-2xl bg-orange-accent text-white shadow-2xl shadow-orange-accent/40 flex flex-col items-center justify-center transition-all duration-300 ${isSidebarOpen ? 'w-14 h-14' : 'hover:w-14 hover:h-14'} border-none m-0 p-0`}
                >
                    <div className="flex flex-col gap-[4px]">
                        <span className="hamburger-line line-1"></span>
                        <span className="hamburger-line line-2"></span>
                        <span className="hamburger-line line-3"></span>
                    </div>
                </button>

                <div className="w-full space-y-8 py-6 px-4 sm:px-8 lg:px-12 animate-in fade-in duration-700">
                    <header className="w-full max-w-xl mx-auto mb-6">
                        <div className="flex items-center justify-between relative px-2">
                            <div
                                className={`absolute top-1/2 left-0 w-full h-[4px] -translate-y-1/2 z-0 rounded-full transition-colors duration-300 ${
                                    isDarkMode
                                        ? 'bg-white shadow-[0_0_15px_rgba(255,255,255,0.6)]'
                                        : 'bg-stone-200 shadow-[0_0_12px_rgba(0,0,0,0.12)]'
                                }`}
                            ></div>
                            {[1, 2, 3].map((s) => (
                                <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold transition-all border-2 ${
                                            currentStep >= s
                                                ? 'bg-orange-accent text-white border-orange-accent shadow-[0_0_15px_rgba(240,90,40,0.5)] scale-110'
                                                : isDarkMode
                                                    ? 'bg-stone-900 border-white/10 text-stone-500'
                                                    : 'bg-white border-stone-200 text-stone-500'
                                        }`}
                                    >
                                        {s === 1 ? <BookOpen size={16} /> : s === 2 ? <Upload size={16} /> : <Sparkles size={16} />}
                                    </div>
                                    <span
                                        className={`text-[8px] font-bold tracking-[0.25em] transition-opacity uppercase ${
                                            currentStep === s
                                                ? 'opacity-100 text-orange-accent'
                                                : isDarkMode
                                                    ? 'opacity-40 text-stone-400'
                                                    : 'opacity-60 text-stone-500'
                                        }`}
                                    >
                                        {s === 1 ? 'MÁSTER' : s === 2 ? 'CV' : 'RUTA'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </header>

                    <div className="flex flex-col xl:flex-row gap-8 items-start">
                        <div className="flex-[1.35] w-full h-[66vh] min-h-[560px] flex flex-col">
                            <div className="mb-3 pl-1 flex items-center gap-3">
                                <span
                                    className={`text-[10px] font-bold tracking-[0.45em] uppercase ${
                                        isDarkMode ? 'text-white' : 'text-stone-900'
                                    }`}
                                >
                                    TRAZA TU
                                </span>
                                <span className="text-[10px] font-bold tracking-[0.45em] text-[#F05A28] uppercase">FUTURO</span>
                                <div className="h-[1px] flex-1 bg-gradient-to-r from-orange-accent/30 to-transparent"></div>
                            </div>

                            {cvUploadedNotice && (
                                <div
                                    className={`mb-3 rounded-xl border px-4 py-2 text-[10px] uppercase tracking-[0.2em] font-bold ${
                                        isDarkMode
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                            : 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
                                    }`}
                                >
                                    CV subido y analizado. El chat ya estÃ¡ habilitado.
                                </div>
                            )}

                            <div
                                className={`flex-1 p-1 rounded-[2rem] border transition-colors duration-300 ${
                                    isDarkMode ? 'bg-stone-900 border-white/5' : 'bg-white border-stone-200'
                                }`}
                            >
                                <ChatComponent
                                    chatId={chatEnabled ? chatId : null}
                                    cvAnalysisId={analysis?.id}
                                    userName={user?.name || user?.email?.split('@')[0]}
                                    selectedMaster={selectedMaster}
                                    sprints={SPRINTS.map((s) => s.title)}
                                    chatEnabled={chatEnabled}
                                    lockedMessage={selectedMaster ? 'Sube y analiza tu CV para habilitar el chat.' : 'Selecciona un mÃ¡ster para continuar.'}
                                />
                            </div>
                        </div>

                        <div className="flex-[0.75] w-full xl:max-w-md space-y-6 xl:pt-6">
                            {!selectedMaster ? (
                                <div className="space-y-6 animate-in slide-in-from-right duration-700">
                                    <div className="flex justify-center h-10">
                                        <div
                                            className="px-8 py-2 rounded-xl flex items-center gap-4 shadow-2xl"
                                            style={{
                                                backgroundColor: isDarkMode
                                                    ? MOTIVATIONAL_PHRASES[currentPhrase].bg
                                                    : '#ffffff',
                                                border: `1px solid ${
                                                    MOTIVATIONAL_PHRASES[currentPhrase].color === '#F05A28'
                                                        ? 'rgba(240, 90, 40, 0.4)'
                                                        : isDarkMode
                                                            ? 'rgba(255,255,255,0.1)'
                                                            : 'rgba(0,0,0,0.06)'
                                                }`
                                            }}
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: MOTIVATIONAL_PHRASES[currentPhrase].color }}></div>
                                            <p className="text-[10px] font-bold tracking-[0.35em] uppercase" style={{ color: MOTIVATIONAL_PHRASES[currentPhrase].color }}>
                                                {MOTIVATIONAL_PHRASES[currentPhrase].text}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        {MASTERS.map((m, idx) => (
                                            <button
                                                key={m.id}
                                                onClick={() => handleMasterSelection(m.id)}
                                                className={`p-6 rounded-[2rem] border text-left transition-all duration-300 group relative overflow-hidden transform hover:-translate-y-1 shadow-2xl ${
                                                    isDarkMode
                                                        ? 'bg-stone-900 border-white/5 hover:border-orange-accent/40'
                                                        : 'bg-white border-stone-200 hover:border-orange-accent/40'
                                                }`}
                                            >
                                                <div className="absolute top-0 right-0 w-36 h-36 blur-[70px] opacity-10 group-hover:opacity-30 transition-all" style={{ backgroundColor: m.color }}></div>
                                                <div className="relative z-10 flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-4xl font-black italic" style={{ color: m.color, opacity: 0.45 }}>
                                                            {String(idx + 1).padStart(2, '0')}
                                                        </span>
                                                        <div>
                                                            <h4
                                                                className={`text-lg font-bold uppercase tracking-tight italic ${
                                                                    isDarkMode ? 'text-white' : 'text-stone-900'
                                                                }`}
                                                            >
                                                                {m.name}
                                                            </h4>
                                                            <p
                                                                className={`text-[9px] font-medium uppercase tracking-[0.15em] ${
                                                                    isDarkMode ? 'opacity-50 text-white' : 'text-stone-500'
                                                                }`}
                                                            >
                                                                {m.desc}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="w-9 h-9 rounded-xl bg-orange-accent text-white flex items-center justify-center">
                                                        <ArrowRight size={18} />
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : !analysis ? (
                                <div
                                    className={`p-6 rounded-[2rem] border shadow-3xl ${
                                        isDarkMode ? 'bg-[#0D0D0D] border-white/10' : 'bg-white border-stone-200'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-between border-b pb-4 mb-6 ${
                                            isDarkMode ? 'border-white/10' : 'border-stone-200'
                                        }`}
                                    >
                                        <button
                                            onClick={handleChangeMaster}
                                            className={`text-[10px] font-bold tracking-widest uppercase transition-all ${
                                                isDarkMode ? 'text-white/50 hover:text-orange-accent' : 'text-stone-500 hover:text-orange-accent'
                                            }`}
                                        >
                                            ← VOLVER
                                        </button>
                                        <span className="text-[10px] font-bold py-2 px-4 rounded-full text-white uppercase tracking-widest bg-orange-accent">
                                            {selectedMaster}
                                        </span>
                                    </div>

                                    <div className="flex flex-col items-center text-center space-y-5">
                                        <div className="relative w-20 h-20 rounded-[1.5rem] flex items-center justify-center border-2 border-dashed border-orange-accent/40 bg-orange-accent/5">
                                            <Upload className="text-orange-accent" size={30} />
                                        </div>

                                        <div className="space-y-2">
                                            <h3
                                                className={`text-xl font-bold tracking-tight uppercase italic ${
                                                    isDarkMode ? 'text-white' : 'text-stone-900'
                                                }`}
                                            >
                                                VINCULAR POTENCIAL
                                            </h3>
                                            <p
                                                className={`text-[10px] font-medium uppercase tracking-[0.2em] leading-relaxed ${
                                                    isDarkMode ? 'opacity-50 text-white' : 'text-stone-500'
                                                }`}
                                            >
                                                Sube tu CV para habilitar el chat y generar tu resumen.
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
                                                <span className="truncate max-w-[220px]">{file ? file.name : 'SELECCIONAR PDF'}</span>
                                                <input id="cv-input" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                                            </label>

                                            <button
                                                onClick={handleUpload}
                                                disabled={!file || uploading}
                                                className="w-full h-12 rounded-xl bg-orange-accent text-white font-bold text-[10px] tracking-[0.25em] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {uploading ? <Loader2 className="animate-spin" size={18} /> : 'ANALIZAR CV'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className={`p-6 rounded-[2rem] border shadow-3xl space-y-5 ${
                                        isDarkMode ? 'bg-[#0D0D0D] border-white/10' : 'bg-white border-stone-200'
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-between border-b pb-4 ${
                                            isDarkMode ? 'border-white/10' : 'border-stone-200'
                                        }`}
                                    >
                                        <button
                                            onClick={handleChangeMaster}
                                            className={`text-[10px] font-bold tracking-widest uppercase transition-all ${
                                                isDarkMode ? 'text-white/50 hover:text-orange-accent' : 'text-stone-500 hover:text-orange-accent'
                                            }`}
                                        >
                                            ← VOLVER
                                        </button>
                                        <span className="text-[10px] font-bold py-2 px-4 rounded-full text-white uppercase tracking-widest bg-orange-accent">
                                            {selectedMaster}
                                        </span>
                                    </div>

                                    <div
                                        className={`flex items-center gap-3 p-3 rounded-xl border ${
                                            isDarkMode ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-emerald-500/40 bg-emerald-50'
                                        }`}
                                    >
                                        <CheckCircle
                                            size={18}
                                            className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}
                                        />
                                        <p
                                            className={`text-[10px] uppercase tracking-[0.15em] font-bold ${
                                                isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                                            }`}
                                        >
                                            CV subido y validado
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-orange-accent font-bold">Resumen del CV</p>
                                        <div
                                            className={`space-y-2 text-[11px] ${
                                                isDarkMode ? 'text-white/80' : 'text-stone-700'
                                            }`}
                                        >
                                            <p>
                                                <span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>
                                                    Máster:
                                                </span>{' '}
                                                {selectedMasterDisplayName}
                                            </p>
                                            <p>
                                                <span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>
                                                    Rol:
                                                </span>{' '}
                                                {cvSummary.role}
                                            </p>
                                            <p>
                                                <span className={isDarkMode ? 'text-white/50' : 'text-stone-500'}>
                                                    Skills:
                                                </span>{' '}
                                                {cvSummary.topSkills.length
                                                    ? cvSummary.topSkills.join(', ')
                                                    : 'No especificadas'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
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
                        <h4 className="font-bold text-[11px] tracking-widest uppercase mb-1 text-orange-accent">SISTEMA LAR</h4>
                        <p className="text-[12px] font-medium uppercase tracking-wider leading-relaxed opacity-90">{error}</p>
                    </div>
                </div>
            )}

            {showMasterGate && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="w-full max-w-3xl rounded-[2.5rem] border border-orange-accent/25 bg-[#0D0D0D] p-8 sm:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.8)]">
                        <div className="text-center mb-8">
                            <p className="text-[10px] tracking-[0.35em] uppercase text-orange-accent font-bold mb-3">Primer Paso</p>
                            <h3 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white">
                                Elige Tu <span className="text-orange-accent italic">MÁSTER</span>
                            </h3>
                            <p className="mt-3 text-[11px] uppercase tracking-[0.2em] text-white/50">
                                El chat se habilita después de subir y analizar tu CV.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {MASTERS.map((m) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleMasterSelection(m.id)}
                                    className="rounded-2xl border border-white/10 bg-stone-900 p-5 text-left hover:border-orange-accent/60 transition-all"
                                >
                                    <p className="text-lg font-bold italic text-white">{m.name}</p>
                                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1">{m.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
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
            `}} />
        </div>
    );
};

export default HomePage;
