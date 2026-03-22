import React from 'react';
import { ArrowRight, CheckCircle, FileText, Loader2, Upload } from 'lucide-react';
import { buildCvSummary } from '../../cv-analysis';
import { getMasterDisplayName } from '../../../shared/utils/masters';

const RecommendationSupportPanel = ({
    analysis,
    analysisLoading,
    file,
    improvementTips,
    isDarkMode,
    needsMasterSelection,
    onChangeMaster,
    onFileChange,
    onOpenMasterSelection,
    onUpload,
    selectedMaster,
    selectedMasterVisual,
    showMasterSelectionModal,
    uploading,
}) => {
    const cvSummary = buildCvSummary(analysis);

    if (needsMasterSelection) {
        return (
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
                {!showMasterSelectionModal && (
                    <button
                        type="button"
                        onClick={onOpenMasterSelection}
                        className="mt-5 rounded-2xl bg-orange-accent px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all hover:brightness-110"
                    >
                        Abrir seleccion
                    </button>
                )}
            </div>
        );
    }

    if (analysisLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="animate-spin text-orange-accent" size={28} />
                <p className={`${isDarkMode ? 'text-white/60' : 'text-stone-500'} text-[10px] uppercase tracking-[0.18em]`}>
                    Cargando analisis
                </p>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="space-y-5">
                <div className={`flex items-center justify-between gap-2 rounded-[18px] border px-3.5 py-3 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
                    <button
                        onClick={onChangeMaster}
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
                        <input type="file" className="hidden" accept=".pdf" onChange={onFileChange} />
                        <ArrowRight size={16} className="flex-shrink-0" />
                    </label>

                    <button
                        onClick={onUpload}
                        disabled={!file || uploading}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-accent text-[9px] font-bold uppercase tracking-[0.24em] text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Analizar CV'}
                    </button>
                </div>
            </div>
        );
    }

    return (
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
                        onClick={onChangeMaster}
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
    );
};

export default RecommendationSupportPanel;
