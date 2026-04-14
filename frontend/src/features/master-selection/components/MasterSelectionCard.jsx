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
        ? 'border-white/12 bg-[#121212] shadow-[0_26px_80px_rgba(0,0,0,0.48)] hover:border-white/28 hover:shadow-[0_40px_120px_rgba(0,0,0,0.62)]'
        : 'border-white/80 bg-white/95 shadow-[0_22px_70px_rgba(148,163,184,0.24)] hover:border-white hover:shadow-[0_32px_90px_rgba(148,163,184,0.32)]';
    const badgeClass = isDarkMode
        ? 'border-white/32 bg-black/30 text-white'
        : 'border-white/80 bg-white/72 text-slate-800';
    const watermarkClass = isDarkMode ? 'text-white/14' : 'text-slate-900/14';
    const codeClass = isDarkMode ? 'text-white/74' : 'text-white/82';
    const descriptionClass = isDarkMode ? 'text-white/88' : 'text-white/92';
    const footerClass = isDarkMode ? 'text-white/78' : 'text-white/84';
    const arrowClass = isDarkMode
        ? 'border-white/28 bg-black/24 text-white'
        : 'border-white/45 bg-white/30 text-white';
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
            className={`group relative isolate flex h-full flex-col overflow-hidden rounded-[2.2rem] border text-left transition-all duration-500 transform-gpu will-change-transform hover:-translate-y-2 ${shellClass}`}
        >
            <div
                className="pointer-events-none absolute -left-8 -top-8 z-0 h-28 w-28 rounded-full blur-2xl"
                style={{ backgroundColor: theme.panelColor, opacity: isDarkMode ? 0.26 : 0.2 }}
            />

            <div
                className="relative h-[234px] shrink-0 overflow-hidden rounded-[2.2rem]"
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
                            className="absolute inset-0 h-full w-full object-cover saturate-[1.06] transition-transform duration-700 group-hover:scale-[1.05]"
                            pendingClassName="opacity-0"
                            loadedClassName="opacity-100"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,12,22,0.03)_0%,rgba(8,12,22,0.22)_86%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.22),transparent_48%)] mix-blend-screen opacity-75" />
                    </>
                ) : (
                    posterFallback
                )}

                <div className="absolute inset-x-4 bottom-2 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />

                <div className="relative flex h-full flex-col justify-between p-6">
                    <div className="flex items-start justify-between gap-4">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-sm ${badgeClass}`}>
                            {theme.badge}
                        </span>
                                                <span className={`text-[3.2rem] font-black uppercase leading-none ${watermarkClass}`}>
                                                    L
                                                    <span className="inline-flex flex-col items-center align-middle leading-none font-serif mb-9">
                                                        <span className="leading-none mb-[-10px] text-[0.7em] font-bold tracking-[0.06em]">..</span>
                                                        <span className="leading-none">&#916;</span>
                                                    </span>
                                                    R
                                                </span>
                    </div>

                    
                </div>
            </div>

            <div
                className="relative -mt-10 flex min-h-[250px] flex-1 flex-col rounded-[2.1rem] px-6 pb-7 pt-16 text-white"
                style={{ backgroundColor: theme.panelColor }}
            >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_44%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.14))]" />
                <div
                    className="absolute right-6 top-0 h-20 w-24 -translate-y-8 rounded-[1.8rem] bg-inherit"
                    aria-hidden="true"
                />
                <div
                    className="absolute left-0 top-14 h-24 w-1 rounded-r-full"
                    style={{ backgroundColor: 'rgba(255,255,255,0.72)' }}
                    aria-hidden="true"
                />
                <div className="relative z-[1] flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${codeClass}`}>
                                {getMasterCardLabel(master)}
                            </p>
                            <h3 className="mt-2 max-w-[272px] text-[2.05rem] font-semibold leading-[0.96] tracking-[-0.045em] text-white text-balance">
                                {getMasterDisplayName(master)}
                            </h3>
                        </div>
                        <div className={`mt-1 rounded-full border p-2.5 transition-transform duration-300 group-hover:translate-x-1.5 ${arrowClass}`}>
                            <ArrowRight size={18} />
                        </div>
                    </div>

                    <p className={`mt-6 text-[0.98rem] leading-[1.58] ${descriptionClass}`}>
                        {getMasterDescription(master)}
                    </p>

                    <div className="mt-auto pt-7">
                        <div className={`flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] ${footerClass}`}>
                            <span className="h-[1px] w-8 bg-white/55 transition-all duration-300 group-hover:w-11" />
                            Seleccionar programa
                        </div>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default MasterSelectionCard;
