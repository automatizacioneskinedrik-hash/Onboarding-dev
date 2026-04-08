import React from 'react';
import ConstellationBackground from './ConstellationBackground';
import LazyImage from './LazyImage';

const HARDCODED_AUTH_BACKGROUND_URL =
    'https://storage.googleapis.com/assets_onboarding/Auth/Image_Login.png';

const BrandMark = ({ isDarkMode }) => (
    <div className="mb-4 inline-flex items-center rounded-2xl border border-orange-accent/15 bg-orange-accent/5 px-3 py-2">
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
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#161311]' : 'bg-[#F4F1EC]'}`}>
            <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,500px)]">
                <section className="relative hidden min-h-screen overflow-hidden bg-[#ECE7E1] lg:flex">
                    <LazyImage
                        src={HARDCODED_AUTH_BACKGROUND_URL}
                        alt=""
                        rootMargin="240px"
                        keepFallbackUntilLoaded
                        fallback={<AuthShellFallback />}
                        className="h-full w-full transition-opacity duration-700"
                        pendingClassName="opacity-0"
                        loadedClassName="opacity-100"
                        style={{
                            objectFit: 'cover',
                            objectPosition: 'center center',
                            backgroundColor: '#ECE7E1',
                        }}
                    />
                </section>

                <section
                    className={`relative flex min-h-screen items-center justify-center px-6 py-5 sm:px-8 sm:py-6 ${
                        isDarkMode ? 'bg-[#161311]' : 'bg-[#F9F7F4]'
                    }`}
                >
                    <div className="w-full max-w-[410px]">
                        <div className="mb-6 text-left">
                            <BrandMark isDarkMode={isDarkMode} />
                            <p className={`mt-2 max-w-sm text-sm leading-relaxed ${isDarkMode ? 'text-stone-300' : 'text-slate-600'}`}>
                                {heroSubtitle}
                            </p>
                        </div>

                        <div
                            className={`rounded-[2rem] border p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-7 ${
                                isDarkMode ? 'border-white/10 bg-[#211d1b]' : 'border-[#E7E1D9] bg-white'
                            }`}
                        >
                            <h2 className={`mb-5 text-[1.6rem] font-black tracking-tight sm:text-[1.8rem] ${isDarkMode ? 'text-white' : 'text-[#202020]'}`}>
                                {cardTitle}
                            </h2>

                            {children}

                            {footer ? (
                                <div className={`mt-5 border-t pt-4 ${isDarkMode ? 'border-white/10' : 'border-[#EAE4DC]'}`}>
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
