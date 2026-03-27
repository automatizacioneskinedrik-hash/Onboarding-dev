import React from 'react';
import { ArrowLeft } from 'lucide-react';
import MasterSelectionCard from './MasterSelectionCard';

const MasterSelectionModal = ({ isDarkMode, masters, onClose, onSelect }) => (
    <div
        className={`fixed inset-0 z-[120] flex items-center justify-center p-5 backdrop-blur-sm sm:p-6 ${
            isDarkMode
                ? 'bg-[radial-gradient(circle_at_top,#3b160a_0%,#140d0b_34%,#050505_100%)]'
                : 'bg-[radial-gradient(circle_at_top,#fff4ee_0%,#f8efe8_36%,#efe8df_100%)]'
        }`}
        onClick={onClose}
    >
        <div className="w-full max-w-[1360px]" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex justify-start sm:mb-5">
                <button
                    type="button"
                    onClick={onClose}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] transition-all ${
                        isDarkMode
                            ? 'border-white/12 bg-black/25 text-white/78 hover:border-white/25 hover:text-white'
                            : 'border-white/70 bg-white/72 text-slate-700 hover:border-slate-300 hover:text-slate-900'
                    }`}
                >
                    <ArrowLeft size={14} />
                    Salir
                </button>
            </div>

            <div
                className={`relative overflow-hidden rounded-[2.7rem] border p-4 backdrop-blur-2xl sm:p-6 lg:p-7 ${
                    isDarkMode
                        ? 'border-white/10 bg-[#111111]/82 shadow-[0_45px_140px_rgba(0,0,0,0.62)]'
                        : 'border-white/80 bg-white/64 shadow-[0_35px_110px_rgba(148,163,184,0.3)]'
                }`}
            >
                <div className={`pointer-events-none absolute inset-0 ${isDarkMode ? 'opacity-90' : 'opacity-100'}`}>
                    <div
                        className={`absolute inset-0 ${
                            isDarkMode
                                ? 'bg-[radial-gradient(circle_at_top_left,rgba(240,90,40,0.18),transparent_36%),radial-gradient(circle_at_top_right,rgba(132,193,193,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_38%)]'
                                : 'bg-[radial-gradient(circle_at_top_left,rgba(240,90,40,0.12),transparent_34%),radial-gradient(circle_at_top_right,rgba(132,193,193,0.14),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.5),transparent_38%)]'
                        }`}
                    />
                    <div className={`absolute inset-x-0 top-0 h-px ${isDarkMode ? 'bg-white/10' : 'bg-white/90'}`} />
                </div>

                <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {masters.map((master) => (
                        <MasterSelectionCard key={master.id} master={master} onSelect={onSelect} isDarkMode={isDarkMode} />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

export default MasterSelectionModal;
