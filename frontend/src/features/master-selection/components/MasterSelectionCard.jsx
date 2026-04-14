import React from 'react';
import { ArrowRight } from 'lucide-react';
import LazyImage from '../../../shared/ui/LazyImage';
import {
    getMasterCardLabel,
    getMasterDescription,
    getMasterDisplayName,
    getMasterSelectionTheme,
} from '../../../shared/utils/masters';

const MasterSelectionCard = ({ master, onSelect, isDarkMode = true }) => {
    const theme = getMasterSelectionTheme(master?.id);
    const hasPosterImage = Boolean(theme.posterImageUrl);

    const shellClass = isDarkMode
        ? 'border-white/10 bg-[#161616] hover:border-white/25 hover:shadow-[0_35px_90px_rgba(0,0,0,0.38)]'
        : 'border-white/70 bg-white/90 hover:border-white hover:shadow-[0_28px_70px_rgba(148,163,184,0.32)]';
    const badgeClass = isDarkMode
        ? 'border-white/30 bg-white/12 text-white'
        : 'border-white/80 bg-white/68 text-slate-800';
    const watermarkClass = isDarkMode ? 'text-white/16' : 'text-slate-900/12';
    const codeClass = isDarkMode ? 'text-white/70' : 'text-white/82';
    const descriptionClass = isDarkMode ? 'text-white/88' : 'text-white/92';
    const footerClass = isDarkMode ? 'text-white/72' : 'text-white/82';
    const arrowClass = isDarkMode
        ? 'border-white/20 bg-white/10 text-white'
        : 'border-white/40 bg-white/26 text-white';
    const posterFallback = (
        <>
            <div
                className="absolute inset-0 opacity-70"
                style={{
                    backgroundImage: `linear-gradient(${theme.textureColor} 1px, transparent 1px), linear-gradient(90deg, ${theme.textureColor} 1px, transparent 1px)`,
                    backgroundSize: '54px 54px',
                }}
            />
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 to-transparent" />
            <div className="absolute -right-8 top-10 h-28 w-28 rounded-full bg-white/12 blur-2xl" />
            <div className="absolute -left-8 bottom-4 h-24 w-24 rounded-full bg-black/12 blur-2xl" />
        </>
    );

    return (
        <button
            type="button"
            onClick={() => onSelect(master.id)}
            className={`group relative overflow-hidden rounded-[2rem] border text-left transition-all duration-500 hover:-translate-y-1.5 ${shellClass}`}
        >
            <div
                className="relative h-[220px] overflow-hidden rounded-[2rem]"
                style={
                    hasPosterImage
                        ? { backgroundColor: theme.posterFallbackColor || theme.posterVia }
                        : {
                            background: `linear-gradient(135deg, ${theme.posterFrom} 0%, ${theme.posterVia} 48%, ${theme.posterTo} 100%)`,
                        }
                }
            >
                {hasPosterImage ? (
                    <>
                        <LazyImage
                            src={theme.posterImageUrl}
                            alt=""
                            rootMargin="220px"
                            keepFallbackUntilLoaded
                            fallback={posterFallback}
                            style={{ objectPosition: theme.posterObjectPosition || 'center 20%' }}
                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                            pendingClassName="opacity-0"
                            loadedClassName="opacity-100"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,14,24,0.12)_0%,rgba(9,14,24,0.18)_100%)]" />
                    </>
                ) : (
                    posterFallback
                )}

                <div className="relative flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between gap-4">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm ${badgeClass}`}>
                            {theme.badge}
                        </span>
                        <span className={`text-[3.2rem] font-black uppercase leading-none ${watermarkClass}`}>LÄR</span>
                    </div>

                    
                </div>
            </div>

            <div
                className="relative -mt-10 min-h-[240px] rounded-[2rem] px-6 pb-6 pt-16 text-white"
                style={{ backgroundColor: theme.panelColor }}
            >
                <div
                    className="absolute right-7 top-0 h-20 w-24 -translate-y-8 rounded-[1.8rem] bg-inherit"
                    aria-hidden="true"
                />
                <div className="relative z-[1] flex h-full flex-col">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${codeClass}`}>
                                {getMasterCardLabel(master)}
                            </p>
                            <h3 className="mt-2 max-w-[272px] text-[1.95rem] font-semibold leading-[0.98] tracking-[-0.04em] text-white text-balance">
                                {getMasterDisplayName(master)}
                            </h3>
                        </div>
                        <div className={`mt-1 rounded-full border p-2 transition-transform duration-300 group-hover:translate-x-1 ${arrowClass}`}>
                            <ArrowRight size={18} />
                        </div>
                    </div>

                    <p className={`mt-5 text-[0.98rem] leading-[1.55] ${descriptionClass}`}>
                        {getMasterDescription(master)}
                    </p>

                    <div className="mt-auto pt-6">
                        <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] ${footerClass}`}>
                            <span className="h-[1px] w-8 bg-white/45" />
                            Seleccionar programa
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MasterSelectionCard;
