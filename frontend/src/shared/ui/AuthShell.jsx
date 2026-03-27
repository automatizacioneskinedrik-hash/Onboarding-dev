import React, { useEffect, useState } from 'react';
import ConstellationBackground from './ConstellationBackground';

const HARDCODED_AUTH_BACKGROUND_URL =
    'https://storage.cloud.google.com/assets_onboarding/Auth/Image_Login.png';

const BrandMark = () => (
    <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-accent/10">
        <svg viewBox="0 0 100 100" className="h-8 w-8" aria-hidden="true">
            <polygon points="50,20 15,80 85,80" fill="none" stroke="#FF6B35" strokeWidth="10" />
            <rect x="42" y="4" width="7" height="7" fill="#FF6B35" />
            <rect x="52" y="4" width="7" height="7" fill="#FF6B35" />
        </svg>
    </div>
);

const AuthShell = ({ isDarkMode, cardTitle, heroSubtitle, children, footer = null }) => {
    const [backgroundState, setBackgroundState] = useState(HARDCODED_AUTH_BACKGROUND_URL ? 'loading' : 'idle');

    useEffect(() => {
        if (!HARDCODED_AUTH_BACKGROUND_URL) {
            return undefined;
        }

        let isActive = true;
        const image = new Image();
        image.decoding = 'async';
        image.src = HARDCODED_AUTH_BACKGROUND_URL;

        image.onload = () => {
            if (isActive) {
                setBackgroundState('loaded');
            }
        };

        image.onerror = () => {
            if (isActive) {
                console.warn('No se pudo cargar la imagen de autenticacion:', HARDCODED_AUTH_BACKGROUND_URL);
                setBackgroundState('error');
            }
        };

        return () => {
            isActive = false;
        };
    }, []);

    const showRemoteBackground = HARDCODED_AUTH_BACKGROUND_URL && backgroundState !== 'error';
    const showFallbackBackground = !showRemoteBackground;

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-[#161311]' : 'bg-[#F4F1EC]'}`}>
            <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(440px,500px)]">
                <section className="relative hidden min-h-screen overflow-hidden bg-[#ECE7E1] lg:flex">
                    {showRemoteBackground ? (
                        <img
                            src={HARDCODED_AUTH_BACKGROUND_URL}
                            alt=""
                            className={`h-full w-full transition-opacity duration-700 ${
                                backgroundState === 'loaded' ? 'opacity-100' : 'opacity-0'
                            }`}
                            style={{
                                objectFit: 'cover',
                                objectPosition: 'center center',
                                backgroundColor: '#ECE7E1',
                            }}
                        />
                    ) : null}

                    {showFallbackBackground ? (
                        <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#fff7f2_0%,#f7f4ef_42%,#eef2f6_100%)]" />
                            <ConstellationBackground theme="light" />
                        </>
                    ) : null}
                </section>

                <section
                    className={`relative flex min-h-screen items-center justify-center px-6 py-5 sm:px-8 sm:py-6 ${
                        isDarkMode ? 'bg-[#161311]' : 'bg-[#F9F7F4]'
                    }`}
                >
                    <div className="w-full max-w-[410px]">
                        <div className="mb-6 text-left">
                            <BrandMark />
                            <h1 className={`text-[1.8rem] font-black tracking-tighter sm:text-[2rem] ${isDarkMode ? 'text-white' : 'text-[#181818]'}`}>
                                LAR <span className="text-orange-accent">UNIVERSITY</span>
                            </h1>
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
