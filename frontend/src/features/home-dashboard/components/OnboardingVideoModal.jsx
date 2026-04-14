import React from 'react';

const isDirectVideoUrl = (videoUrl = '') => /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

const OnboardingVideoModal = ({ open, videoUrl, onClose, isDarkMode }) => {
    if (!open || !videoUrl) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-black/75 px-4 py-6">
            <div
                className={`w-full max-w-3xl overflow-hidden rounded-[8px] border shadow-2xl ${
                    isDarkMode ? 'border-white/10 bg-[#111111] text-white' : 'border-stone-200 bg-white text-stone-900'
                }`}
            >
                <div className="aspect-video w-full bg-black">
                    {isDirectVideoUrl(videoUrl) ? (
                        <video className="h-full w-full" src={videoUrl} controls autoPlay playsInline />
                    ) : (
                        <iframe
                            className="h-full w-full"
                            src={videoUrl}
                            title="Video de onboarding"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    )}
                </div>

                <div className="flex items-center justify-end border-t border-white/10 px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-[8px] bg-orange-accent px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:brightness-110"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingVideoModal;
