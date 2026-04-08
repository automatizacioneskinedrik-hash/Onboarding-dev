import React from 'react';
import { AlertCircle } from 'lucide-react';

const ErrorToast = ({ error }) => {
    if (!error) {
        return null;
    }

    return (
        <div className="fixed bottom-10 right-10 z-[100] flex max-w-lg items-center gap-4 rounded-3xl border-l-[6px] border-orange-accent bg-[#0D0D0D] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border border-orange-accent/20 bg-orange-accent/10">
                <AlertCircle size={24} className="text-orange-accent" />
            </div>
            <div>
                <h4 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-orange-accent">Sistema LÄR</h4>
                <p className="text-[12px] font-medium uppercase tracking-wider leading-relaxed opacity-90">{error}</p>
            </div>
        </div>
    );
};

export default ErrorToast;
