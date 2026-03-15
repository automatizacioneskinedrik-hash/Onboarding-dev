import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { User, LogOut, Sun, Moon } from 'lucide-react';
import { getMasterDisplayName } from '../utils/masters';

const Navbar = ({ onToggleSidebar }) => {
    const { logout, selectedMaster } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/perfil', icon: <User className="w-5 h-5" />, label: 'Perfil' },
    ];

    return (
        <nav className={`sticky top-0 z-50 w-full backdrop-blur-md border-b transition-all duration-300 ${isDarkMode
            ? 'bg-black/60 border-orange-accent/10'
            : 'bg-white/60 border-orange-accent/10'
            }`}>
            <div className="w-full px-2 sm:px-4 lg:px-8">
                <div className="flex items-center justify-between h-[4.1rem]">
                    <div className="flex items-center gap-6">
                        {/* Logo - Elite Navigation */}
                        <div
                            className="flex items-center gap-3 group cursor-pointer"
                            onClick={() => {
                                if (window.location.pathname === '/') {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                } else {
                                    navigate('/');
                                }
                            }}
                        >
                            <div className="w-11 h-11 rounded-xl bg-orange-accent/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <svg viewBox="0 0 100 100" className="w-7 h-7">
                                    <polygon points="50,20 15,80 85,80" fill="none" stroke="#F05A28" strokeWidth="12" />
                                    <rect x="42" y="4" width="8" height="8" fill="#F05A28" />
                                    <rect x="52" y="4" width="8" height="8" fill="#F05A28" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[1.2rem] font-black tracking-tighter leading-none ${isDarkMode ? 'text-white' : 'text-[#1A1A1A]'}`}>
                                    LÄR <span className="text-orange-accent">UNIVERSITY</span>
                                </span>
                                <span className="text-[9px] uppercase tracking-[0.25em] text-orange-accent/50 font-black">
                                    ÉLITE TECH
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {selectedMaster && (
                            <div
                                className={`hidden sm:flex items-center px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.18em] border ${
                                    isDarkMode
                                        ? 'bg-white/5 border-white/10 text-white/80'
                                        : 'bg-black/5 border-black/10 text-slate-700'
                                }`}
                            >
                                {getMasterDisplayName(selectedMaster)}
                            </div>
                        )}

                        {/* Navigation Links - Icons Only */}
                        <div className="flex items-center gap-2">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    title={item.label}
                                    className={({ isActive }) => `
                                        flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300
                                        ${isActive
                                            ? 'bg-orange-accent text-white shadow-lg shadow-orange-accent/20 scale-110'
                                            : isDarkMode
                                                ? 'text-dark-muted hover:bg-white/5 hover:text-white'
                                                : 'text-light-muted hover:bg-black/5 hover:text-black'
                                        }
                                    `}
                                >
                                    {item.icon}
                                </NavLink>
                            ))}
                        </div>

                        <div className="w-[1px] h-6 bg-orange-accent/10 mx-2 hidden sm:block"></div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleTheme}
                                className={`w-10 h-10 rounded-xl border border-orange-accent/30 flex items-center justify-center hover:scale-110 transition-all shadow-lg shadow-orange-accent/5 ${isDarkMode ? 'bg-card/50 text-orange-accent' : 'bg-white/50 text-orange-hover'
                                    }`}
                                title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                            >
                                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>

                            <button
                                onClick={handleLogout}
                                title="Cerrar Sesión"
                                className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 ${isDarkMode
                                    ? 'bg-white/5 text-dark-muted hover:bg-red-500/10 hover:text-red-500'
                                    : 'bg-black/5 text-light-muted hover:bg-red-500/10 hover:text-red-500'
                                    }`}
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>

    );
};

export default Navbar;
