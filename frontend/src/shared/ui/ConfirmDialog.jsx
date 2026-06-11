import React, { useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

const ConfirmDialog = ({
    open = false,
    isDarkMode = false,
    title = 'Confirmar accion',
    description = 'Esta accion no se puede deshacer.',
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    loading = false,
    onCancel,
    onConfirm,
}) => {
    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === 'Escape' && !loading) {
                onCancel?.();
            }
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [loading, onCancel, open]);

    if (!open) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/55 p-4 backdrop-blur-md"
            onClick={() => {
                if (!loading) {
                    onCancel?.();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                className={`relative w-full max-w-md overflow-hidden rounded-[2rem] border shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${
                    isDarkMode ? 'border-white/10 bg-[#111111]' : 'border-stone-200 bg-[#FCFAF7]'
                }`}
                onClick={(event) => event.stopPropagation()}
            >
                <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(240,90,40,0.22),transparent_72%)]" />

                <div className="relative p-6 sm:p-7">
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[1.35rem] border border-orange-accent/20 bg-orange-accent/10 text-orange-accent shadow-[0_12px_32px_rgba(240,90,40,0.18)]">
                            {loading ? <Loader2 size={24} className="animate-spin" /> : <AlertTriangle size={24} />}
                        </div>

                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-accent">
                                Confirmación
                            </p>
                            <h3
                                id="confirm-dialog-title"
                                className={`mt-2 text-[1.45rem] font-black leading-tight ${
                                    isDarkMode ? 'text-white' : 'text-stone-900'
                                }`}
                            >
                                {title}
                            </h3>
                            <p className={`mt-3 text-sm leading-relaxed ${isDarkMode ? 'text-white/68' : 'text-stone-600'}`}>
                                {description}
                            </p>
                        </div>
                    </div>

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={loading}
                            className={`rounded-2xl border px-5 py-3 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                                isDarkMode
                                    ? 'border-white/10 bg-white/[0.03] text-white/85 hover:bg-white/[0.07]'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                            }`}
                        >
                            {cancelLabel}
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={loading}
                            className="rounded-2xl bg-orange-accent px-5 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(240,90,40,0.28)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading ? 'Eliminando...' : confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
