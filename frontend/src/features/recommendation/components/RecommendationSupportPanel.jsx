import React from 'react';
import { ArrowRight, CheckCircle, ChevronRight, FileText, Loader2, Sparkles, Target, Upload } from 'lucide-react';
import { getMasterDisplayName } from '../../../shared/utils/masters';

const SupportListSection = ({ title, items, isDarkMode, icon: Icon }) => {
    if (!items?.length) {
        return null;
    }

    return (
        <section className={`rounded-[20px] border p-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.025]' : 'border-stone-200 bg-white/85'}`}>
            <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isDarkMode ? 'bg-orange-accent/12 text-orange-accent' : 'bg-orange-50 text-orange-accent'}`}>
                    <Icon size={15} />
                </div>
                <h4 className={`text-[11px] font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{title}</h4>
            </div>
            <div className="mt-3 space-y-2">
                {items.map((item) => (
                    <div
                        key={item}
                        className={`flex items-start gap-2 rounded-2xl px-3 py-2.5 ${isDarkMode ? 'bg-black/20 text-white/82' : 'bg-stone-50 text-stone-700'}`}
                    >
                        <span className="mt-[5px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-accent" />
                        <p className="text-[11px] leading-relaxed">{item}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

const RecommendedChangesSection = ({ items, isDarkMode }) => {
    if (!items?.length) {
        return null;
    }

    return (
        <section className={`rounded-[20px] border p-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.025]' : 'border-stone-200 bg-white/85'}`}>
            <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${isDarkMode ? 'bg-orange-accent/12 text-orange-accent' : 'bg-orange-50 text-orange-accent'}`}>
                    <ChevronRight size={15} />
                </div>
                <h4 className={`text-[11px] font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Cambios recomendados</h4>
            </div>
            <div className="mt-3 space-y-2.5">
                {items.map((item) => (
                    <article
                        key={`${item.title}-${item.suggestion}`}
                        className={`rounded-[18px] border px-3 py-3 ${isDarkMode ? 'border-white/8 bg-black/20' : 'border-stone-200 bg-stone-50'}`}
                    >
                        <p className={`text-[11px] font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{item.title}</p>
                        {item.suggestion && (
                            <p className={`mt-1.5 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/72' : 'text-stone-600'}`}>
                                {item.suggestion}
                            </p>
                        )}
                    </article>
                ))}
            </div>
        </section>
    );
};

const SelectedMasterBar = ({ isDarkMode, onChangeMaster, selectedMaster, selectedMasterVisual }) => (
    <div className={`rounded-[20px] border px-4 py-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
        <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
                <p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-white/45' : 'text-stone-500'}`}>
                    MBA seleccionado
                </p>
                <div className="mt-2 flex items-center gap-2">
                    <span
                        className="inline-flex rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white"
                        style={{ backgroundColor: selectedMasterVisual.color }}
                    >
                        {getMasterDisplayName(selectedMaster)}
                    </span>
                </div>
            </div>
            <button
                onClick={onChangeMaster}
                className={`inline-flex h-8 flex-shrink-0 items-center rounded-full border px-2.5 text-[8px] font-bold uppercase tracking-[0.14em] transition-all ${
                    isDarkMode
                        ? 'border-orange-accent/20 bg-transparent text-orange-accent hover:border-orange-accent/35 hover:bg-orange-accent/10'
                        : 'border-orange-accent/20 bg-white/60 text-orange-accent hover:border-orange-accent/35 hover:bg-orange-50'
                }`}
            >
                Cambiar MBA
            </button>
        </div>
    </div>
);

const RecommendationSupportPanel = ({
    analysis,
    analysisLoading,
    cvImprovementContent,
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
    const supportContent = cvImprovementContent || {
        strengths: [],
        growthAreas: [],
        recommendedChanges: [],
        narrativeTips: improvementTips,
    };

    if (needsMasterSelection) {
        return (
            <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] border border-orange-accent/20 bg-orange-accent/10">
                    <Upload className="text-orange-accent" size={24} />
                </div>
                <div className="mt-5 max-w-[240px] space-y-2">
                    <h3 className={`text-[1.05rem] font-black uppercase tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                        Selecciona tu MBA
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
                <SelectedMasterBar
                    isDarkMode={isDarkMode}
                    onChangeMaster={onChangeMaster}
                    selectedMaster={selectedMaster}
                    selectedMasterVisual={selectedMasterVisual}
                />

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
            <SelectedMasterBar
                isDarkMode={isDarkMode}
                onChangeMaster={onChangeMaster}
                selectedMaster={selectedMaster}
                selectedMasterVisual={selectedMasterVisual}
            />

            <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${isDarkMode ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-emerald-500/30 bg-emerald-50'}`}>
                <CheckCircle size={18} className={isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} />
                <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                    CV analizado para {getMasterDisplayName(selectedMaster)}
                </p>
            </div>

            {(supportContent.strengths.length > 0 ||
                supportContent.growthAreas.length > 0 ||
                supportContent.recommendedChanges.length > 0 ||
                supportContent.narrativeTips.length > 0) && (
                <div className={`rounded-[24px] border p-4 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}>
                    <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-orange-accent/12 text-orange-accent' : 'bg-orange-50 text-orange-accent'}`}>
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Como mejorar tu CV para este MBA</p>
                            <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-600'}`}>
                                Prioriza lo que ya destaca en tu perfil y enfoca tu hoja de vida en senales claras de impacto y proyeccion.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3">
                        <SupportListSection
                            title="Fortalezas"
                            items={supportContent.strengths}
                            isDarkMode={isDarkMode}
                            icon={Target}
                        />
                        <SupportListSection
                            title="Lo que debes reforzar"
                            items={supportContent.growthAreas}
                            isDarkMode={isDarkMode}
                            icon={Sparkles}
                        />
                        <RecommendedChangesSection items={supportContent.recommendedChanges} isDarkMode={isDarkMode} />
                        {!supportContent.recommendedChanges.length && supportContent.narrativeTips.length > 0 && (
                            <section className={`rounded-[20px] border p-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.025]' : 'border-stone-200 bg-white/85'}`}>
                                <h4 className={`text-[11px] font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>Notas adicionales</h4>
                                <div className="mt-3 space-y-2">
                                    {supportContent.narrativeTips.map((tip) => (
                                        <p key={tip} className={`rounded-2xl px-3 py-2.5 text-[11px] leading-relaxed ${isDarkMode ? 'bg-black/20 text-white/72' : 'bg-stone-50 text-stone-600'}`}>
                                            {tip}
                                        </p>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecommendationSupportPanel;
