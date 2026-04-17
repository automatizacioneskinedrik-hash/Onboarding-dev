import React from 'react';
import { Check, ChevronRight, Clipboard, Loader2, RefreshCw, Sparkles, Target, Upload } from 'lucide-react';
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

const copyTextToClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
};

const normalizeCopyableText = (text) => String(text || '').replace(/\s+/g, ' ').trim();

const CopyableTextBlock = ({ title, text, copyEnabled = true, isDarkMode }) => {
    const feedbackTimeoutRef = React.useRef(null);
    const [copied, setCopied] = React.useState(false);

    const cleanText = normalizeCopyableText(text);
    const isProfileBlock = title?.toLowerCase().includes('perfil');
    const copyButtonText = copied ? 'Copiado' : isProfileBlock ? 'Copiar perfil' : 'Copiar';
    const copyButtonLabel = isProfileBlock ? 'Copiar perfil profesional' : `Copiar recomendacion de ${title}`;

    React.useEffect(
        () => () => {
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
        },
        []
    );

    const handleCopy = async () => {
        if (!cleanText) {
            return;
        }

        try {
            await copyTextToClipboard(cleanText);
            setCopied(true);
            if (feedbackTimeoutRef.current) {
                clearTimeout(feedbackTimeoutRef.current);
            }
            feedbackTimeoutRef.current = setTimeout(() => setCopied(false), 1600);
        } catch {
            setCopied(false);
        }
    };

    return (
        <article
            className={`rounded-[18px] border px-3 py-3 ${isDarkMode ? 'border-white/8 bg-black/20' : 'border-stone-200 bg-stone-50'}`}
        >
            <div className="flex items-start justify-between gap-2">
                <p className={`min-w-0 pt-1 text-[11px] font-bold ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>{title}</p>
                {copyEnabled && cleanText && (
                    <div className="flex flex-shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
                        {copied && (
                            <span className={`text-right text-[9px] font-bold ${isDarkMode ? 'text-white/60' : 'text-stone-500'}`}>
                                Copiado correctamente
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`inline-flex h-7 items-center gap-1 rounded-lg border px-2 text-[9px] font-bold transition-all ${
                                isDarkMode
                                    ? 'border-white/10 bg-white/[0.03] text-white/70 hover:border-orange-accent/40 hover:text-orange-accent'
                                    : 'border-stone-200 bg-white text-stone-600 hover:border-orange-accent/40 hover:text-orange-accent'
                            }`}
                            aria-label={copyButtonLabel}
                        >
                            {copied ? <Check size={12} /> : <Clipboard size={12} />}
                            <span>{copyButtonText}</span>
                        </button>
                    </div>
                )}
            </div>

            {cleanText && (
                <div
                    className={`mt-2.5 rounded-xl px-3 py-3 ${
                        isDarkMode ? 'bg-white/[0.06] text-white/82' : 'bg-[#E4E5E2] text-stone-700'
                    }`}
                >
                    <p
                        className="whitespace-normal text-[11px] leading-relaxed"
                    >
                        {cleanText}
                    </p>
                </div>
            )}
        </article>
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
                    <CopyableTextBlock
                        key={`${item.title}-${item.suggestion}`}
                        title={item.title}
                        text={item.suggestion}
                        copyEnabled
                        isDarkMode={isDarkMode}
                    />
                ))}
            </div>
        </section>
    );
};

const SelectedMasterBar = ({ isDarkMode, onChangeMaster, selectedMaster }) => (
    <div
        data-tour="selected-master"
        className={`rounded-[20px] border px-4 py-3.5 ${isDarkMode ? 'border-white/10 bg-white/[0.02]' : 'border-stone-200 bg-stone-50/80'}`}
    >
        <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-4">
                <p className={`text-[9px] font-bold uppercase tracking-[0.18em] ${isDarkMode ? 'text-white/45' : 'text-stone-500'}`}>
                    MBA seleccionado
                </p>
                <button
                    onClick={onChangeMaster}
                    className="inline-flex h-8 flex-shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 text-[8px] font-bold uppercase tracking-[0.14em] transition-all"
                    style={{
                        borderColor: '#EE5522',
                        color: '#EE5522',
                        backgroundColor: 'transparent',
                    }}
                    onMouseEnter={(event) => {
                        event.currentTarget.style.backgroundColor = 'rgba(238, 85, 34, 0.08)';
                    }}
                    onMouseLeave={(event) => {
                        event.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <span>Cambiar MBA</span>
                    <RefreshCw size={11} className="ml-1.5" />
                </button>
            </div>
            <div className="flex min-w-0 pt-0.5">
                <span
                    className="inline-flex w-full max-w-full items-center justify-center rounded-[18px] px-3 py-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-white sm:w-fit sm:max-w-[20rem] sm:px-[14px] sm:text-[10px]"
                    style={{
                        backgroundColor: '#0C5258',
                        lineHeight: 1.2,
                        minHeight: '2.5rem',
                        wordBreak: 'break-word',
                    }}
                >
                    {getMasterDisplayName(selectedMaster)}
                </span>
            </div>
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
    showMasterSelectionModal,
    uploading,
}) => {
    const fileInputRef = React.useRef(null);
    const [isDragOver, setIsDragOver] = React.useState(false);

    const supportContent = cvImprovementContent || {
        strengths: [],
        growthAreas: [],
        recommendedChanges: [],
        narrativeTips: improvementTips,
    };

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    const applyFileSelection = (selectedFile) => {
        if (!selectedFile) {
            return;
        }

        const input = fileInputRef.current;
        if (!input) {
            return;
        }

        try {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(selectedFile);
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        } catch {
            onFileChange({ target: { files: [selectedFile] } });
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleDragEnter = (event) => {
        event.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragOver(false);

        const droppedFile = event.dataTransfer.files?.[0];
        applyFileSelection(droppedFile);
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
                        Abrir selección
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
                    Cargando análisis
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
                />

                <div
                    data-tour="upload-pdf"
                    className={`relative isolate cursor-pointer overflow-visible rounded-[24px] border px-4 py-4 transition-all ${
                        isDragOver
                            ? isDarkMode
                                ? 'border-orange-accent/50 bg-orange-accent/10'
                                : 'border-orange-accent/50 bg-orange-50/80'
                            : isDarkMode
                                ? 'border-white/10 bg-white/[0.02]'
                                : 'border-stone-200 bg-stone-50/80'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={triggerFilePicker}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            triggerFilePicker();
                        }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label="Subir archivo PDF"
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".pdf"
                        onChange={onFileChange}
                        onClick={(event) => event.stopPropagation()}
                    />
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -inset-[3px] -z-10 rounded-[28px] blur-md transition-all duration-300 ${
                            isDragOver ? 'bg-orange-accent/35 animate-pulse' : isDarkMode ? 'bg-orange-accent/14 animate-pulse' : 'bg-orange-accent/12 animate-pulse'
                        }`}
                    />
                    <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -inset-[8px] -z-20 rounded-[32px] blur-xl transition-all duration-300 ${
                            isDragOver ? 'bg-orange-accent/25 animate-pulse' : isDarkMode ? 'bg-orange-accent/10 animate-pulse' : 'bg-orange-accent/8 animate-pulse'
                        }`}
                        style={{ animationDelay: '250ms' }}
                    />
                    <div
                        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-accent/20 bg-orange-accent/10 transition-all hover:bg-orange-accent/15"
                        aria-hidden="true"
                    >
                        <Upload className="text-orange-accent" size={20} />
                    </div>
                    <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Vincular potencial</p>
                    <h3 className={`mt-2.5 text-[1.05rem] font-bold leading-snug tracking-tight ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                        Analiza tu perfil y recibe una ruta personalizada en Data Science.
                    </h3>
                    <p className={`mt-2.5 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-600'}`}>
                        Sube tu CV (PDF) haciendo clic sobre el icono.
                    </p>
                    {file && (
                        <p className={`mt-3 truncate text-[11px] font-bold ${isDarkMode ? 'text-white/75' : 'text-stone-700'}`}>
                            CV cargado: {file.name} ✅
                        </p>
                    )}
                </div>

                <div className="space-y-2.5">
                    <button
                        data-tour="analyze-cv"
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
            />

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
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-accent">Como mejorar tu CV para este Master</p>
                            <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/60' : 'text-stone-600'}`}>
                                Prioriza lo que ya destaca en tu perfil y enfoca tu hoja de vida en señales claras de impacto y proyección.
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
