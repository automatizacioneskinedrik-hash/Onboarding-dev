import React from 'react';
import ConstellationBackground from './ConstellationBackground';
import LazyImage from './LazyImage';

const HARDCODED_AUTH_BACKGROUND_URL =
    'https://storage.googleapis.com/assets_onboarding_us/Auth/Disen%CC%83o%20sin%20ti%CC%81tulo%20(58).png';

const BrandMark = ({ isDarkMode }) => (
    <div
        className={`mb-4 inline-flex items-center rounded-2xl border px-3 py-2 backdrop-blur-sm ${isDarkMode ? 'border-[#F45A22]/35 bg-[#F45A22]/8' : 'border-[#F45A22]/30 bg-white/75'
            }`}
    >
        <img
            src={isDarkMode ? '/lar-hub-white.png' : '/lar-hub.svg'}
            alt="LAR Hub"
            className="h-7 w-auto object-contain sm:h-8"
        />
    </div>
);

const AuthShellFallback = () => (
    <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff7f2_0%,#f7f4ef_42%,#eef2f6_100%)]" />
        <ConstellationBackground theme="light" />
    </>
);

const AuthShell = ({ isDarkMode, cardTitle, heroSubtitle, children, footer = null }) => {
    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#161311]' : 'bg-[#F3EFEB]'}`}>
<div className="mx-auto grid h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,500px)] overflow-hidden">
<section className="relative hidden h-screen overflow-hidden bg-[#D9C3B4] lg:flex lg:sticky lg:top-0">
                    <LazyImage
                        src={HARDCODED_AUTH_BACKGROUND_URL}
                        alt=""
                        rootMargin="240px"
                        keepFallbackUntilLoaded
                        fallback={<AuthShellFallback />}
                        className="absolute inset-0 h-full w-full transition-opacity duration-700"
                        pendingClassName="opacity-0"
                        loadedClassName="opacity-100"
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center top',
                            backgroundColor: '#D9C3B4',
                        }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#161311]/62 via-[#2D2926]/38 to-[#F45A22]/25" />
                </section>

                <section
                    className={`relative flex h-full overflow-y-auto items-center justify-center px-6 py-5 sm:px-8 sm:py-6  ${isDarkMode ? 'bg-[#161311]' : 'bg-[#F3EFEB]'
                        }`}
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,90,34,0.28),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(84,166,133,0.18),transparent_40%)]" />
                    <div className="w-full max-w-[410px]">
                        <div className="mb-6 text-left">
                            <BrandMark isDarkMode={isDarkMode} />
                            <p className={`mt-2 max-w-sm text-sm leading-relaxed ${isDarkMode ? 'text-slate-200/90' : 'text-slate-700'}`}>
                                {heroSubtitle}
                            </p>
                        </div>

                        <div
                            className={`rounded-[2rem] border p-6 shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7 ${isDarkMode
                                ? 'border-[#F45A22]/25 bg-[linear-gradient(160deg,rgba(24,20,18,0.9),rgba(33,29,27,0.74))]'
                                : 'border-[#F45A22]/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.93),rgba(251,242,236,0.9))]'
                                }`}
                        >
                            <h2
                                className={`mb-5 text-[1.6rem] font-black tracking-tight sm:text-[1.8rem] ${isDarkMode ? 'text-white' : 'text-[#111827]'
                                    }`}
                            >
                                {cardTitle}
                            </h2>

                            {children}

                            {footer ? (
                                <div className={`mt-5 border-t pt-4 ${isDarkMode ? 'border-[#F45A22]/20' : 'border-[#E9DDD4]'}`}>
                                    {footer}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AuthShell;
