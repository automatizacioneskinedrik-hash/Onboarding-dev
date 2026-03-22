import React from 'react';
import { LogOut, Moon, Sun, User } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { useTheme } from '../../features/theme';
import { getMasterDisplayName } from '../utils/masters';

const Navbar = () => {
    const { logout, selectedMaster } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const navItems = [{ path: '/perfil', icon: <User className="h-5 w-5" />, label: 'Perfil' }];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav
            className={`sticky top-0 z-50 w-full border-b backdrop-blur-md transition-all duration-300 ${
                isDarkMode ? 'border-orange-accent/10 bg-black/60' : 'border-orange-accent/10 bg-white/60'
            }`}
        >
            <div className="w-full px-2 sm:px-4 lg:px-8">
                <div className="flex h-[4.1rem] items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div
                            className="group flex cursor-pointer items-center gap-3"
                            onClick={() => {
                                if (window.location.pathname === '/') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                } else {
                                    navigate('/');
                                }
                            }}
                        >
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-accent/10 transition-transform group-hover:scale-110">
                                <svg viewBox="0 0 100 100" className="h-7 w-7">
                                    <polygon points="50,20 15,80 85,80" fill="none" stroke="#F05A28" strokeWidth="12" />
                                    <rect x="42" y="4" width="8" height="8" fill="#F05A28" />
                                    <rect x="52" y="4" width="8" height="8" fill="#F05A28" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span
                                    className={`text-[1.2rem] font-black leading-none tracking-tighter ${
                                        isDarkMode ? 'text-white' : 'text-[#1A1A1A]'
                                    }`}
                                >
                                    LAR <span className="text-orange-accent">UNIVERSITY</span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-accent/50">
                                    ELITE TECH
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedMaster && (
                            <div
                                className={`hidden rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] sm:flex ${
                                    isDarkMode
                                        ? 'border-white/10 bg-white/5 text-white/80'
                                        : 'border-black/10 bg-black/5 text-slate-700'
                                }`}
                            >
                                {getMasterDisplayName(selectedMaster)}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    title={item.label}
                                    className={({ isActive }) =>
                                        `flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                                            isActive
                                                ? 'scale-110 bg-orange-accent text-white shadow-lg shadow-orange-accent/20'
                                                : isDarkMode
                                                    ? 'text-dark-muted hover:bg-white/5 hover:text-white'
                                                    : 'text-light-muted hover:bg-black/5 hover:text-black'
                                        }`
                                    }
                                >
                                    {item.icon}
                                </NavLink>
                            ))}
                        </div>

                        <div className="mx-2 hidden h-6 w-[1px] bg-orange-accent/10 sm:block" />

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className={`flex h-10 w-10 items-center justify-center rounded-xl border border-orange-accent/30 shadow-lg shadow-orange-accent/5 transition-all hover:scale-110 ${
                                    isDarkMode ? 'bg-card/50 text-orange-accent' : 'bg-white/50 text-orange-hover'
                                }`}
                                title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                            >
                                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                            </button>

                            <button
                                onClick={handleLogout}
                                title="Cerrar sesion"
                                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                                    isDarkMode
                                        ? 'bg-white/5 text-dark-muted hover:bg-red-500/10 hover:text-red-500'
                                        : 'bg-black/5 text-light-muted hover:bg-red-500/10 hover:text-red-500'
                                }`}
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
