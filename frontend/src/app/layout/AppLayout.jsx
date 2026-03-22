import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useTheme } from '../../features/theme';
import ConstellationBackground from '../../shared/ui/ConstellationBackground';
import Navbar from '../../shared/ui/Navbar';

const AppLayout = () => {
    const { user, loading } = useAuth();
    const { isDarkMode } = useTheme();
    const location = useLocation();
    const isHomeRoute = location.pathname === '/';

    if (loading) {
        return (
            <div className={`flex h-screen items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-light-bg'}`}>
                <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-orange-accent" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div
            className={`flex min-h-screen flex-col transition-colors duration-300 ${
                isDarkMode ? 'bg-black text-white' : 'bg-light-bg text-light-text'
            }`}
        >
            <ConstellationBackground theme={isDarkMode ? 'dark' : 'light'} />

            {!isHomeRoute && <Navbar />}

            <main
                className={`relative z-10 flex w-full flex-1 flex-col overflow-x-hidden ${
                    isHomeRoute ? 'h-screen min-h-screen overflow-hidden' : 'min-h-screen'
                }`}
            >
                <div
                    className={`flex-1 overflow-x-hidden ${
                        isHomeRoute ? 'h-full overflow-hidden px-0 py-0' : 'overflow-y-auto px-4 py-8 sm:px-10'
                    }`}
                >
                    <div className="w-full">
                        <Outlet />
                    </div>
                </div>

                {!isHomeRoute && (
                    <footer
                        className={`border-t p-6 text-center text-sm backdrop-blur-sm ${
                            isDarkMode
                                ? 'border-dark-border bg-dark-card/30 text-dark-muted'
                                : 'border-light-border bg-white/30 text-light-muted'
                        }`}
                    >
                        <p>LAR UNIVERSITY 2026</p>
                    </footer>
                )}
            </main>
        </div>
    );
};

export default AppLayout;
