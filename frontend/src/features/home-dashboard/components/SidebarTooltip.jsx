import React from 'react';

const SidebarTooltip = ({ hoverTooltip, isDarkMode }) => {
    if (!hoverTooltip) {
        return null;
    }

    return (
        <div
            className={`pointer-events-none fixed z-[220] whitespace-nowrap rounded-lg border px-2 py-1 text-[10px] font-medium shadow-lg ${
                isDarkMode ? 'border-white/10 bg-[#161616] text-white' : 'border-stone-700 bg-stone-900 text-white'
            }`}
            style={{
                left: hoverTooltip.left,
                top: hoverTooltip.top,
                transform: 'translateY(-50%)',
            }}
        >
            {hoverTooltip.text}
        </div>
    );
};

export default SidebarTooltip;
