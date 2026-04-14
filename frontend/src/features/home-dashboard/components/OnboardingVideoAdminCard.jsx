import React from 'react';
import { Loader2, Save } from 'lucide-react';
import { updateOnboardingVideo } from '../services/onboardingService';

const transformYouTubeUrl = (url = '') => {
    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.replace(/^www\./, '');
        let videoId = null;

        if (hostname === 'youtube.com' && parsedUrl.pathname === '/watch') {
            videoId = parsedUrl.searchParams.get('v');
        }

        if (hostname === 'youtu.be') {
            videoId = parsedUrl.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch {
        return url;
    }

    return url;
};

const OnboardingVideoAdminCard = ({
    isDarkMode,
    initialVideoUrl = '',
    initialEnabled = false,
    onSaved,
}) => {
    const [videoUrl, setVideoUrl] = React.useState(initialVideoUrl || '');
    const [enabled, setEnabled] = React.useState(Boolean(initialEnabled));
    const [saving, setSaving] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);

    React.useEffect(() => {
        setVideoUrl(initialVideoUrl || '');
        setEnabled(Boolean(initialEnabled));
    }, [initialEnabled, initialVideoUrl]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setFeedback(null);

        try {
            const finalUrl = transformYouTubeUrl(videoUrl.trim());
            const payload = {
                introVideoUrl: finalUrl,
                introVideoEnabled: enabled,
            };

            const response = await updateOnboardingVideo(payload);

            if (!response.success) {
                setFeedback({
                    type: 'error',
                    message: response.message || 'No se pudo guardar la configuracion.',
                });
                return;
            }

            setFeedback({
                type: 'success',
                message: 'Configuracion guardada.',
            });
            onSaved?.({
                ...payload,
                updatedAt: new Date().toISOString(),
            });
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || 'No se pudo guardar la configuracion.',
            });
        } finally {
            setSaving(false);
        }
    };

    return (
        <section
            className={`mt-4 rounded-[8px] border p-4 ${
                isDarkMode ? 'border-white/10 bg-white/[0.025]' : 'border-stone-200 bg-stone-50/80'
            }`}
        >
            <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-accent">
                    Video de onboarding
                </p>
                <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/55' : 'text-stone-600'}`}>
                    Ajusta el video que veran los usuarios nuevos antes del recorrido inicial.
                </p>
            </div>

            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
                <label className="block">
                    <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${isDarkMode ? 'text-white/60' : 'text-stone-600'}`}>
                        URL del video
                    </span>
                    <input
                        type="url"
                        value={videoUrl}
                        onChange={(event) => setVideoUrl(event.target.value)}
                        placeholder="https://..."
                        className={`mt-2 h-10 w-full rounded-[8px] border px-3 text-[12px] font-semibold outline-none transition-all ${
                            isDarkMode
                                ? 'border-white/10 bg-black/20 text-white placeholder:text-white/35 focus:border-orange-accent/45'
                                : 'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-orange-accent/55'
                        }`}
                    />
                </label>

                <label className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2.5 ${isDarkMode ? 'border-white/10 bg-black/15' : 'border-stone-200 bg-white/80'}`}>
                    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-white/75' : 'text-stone-700'}`}>
                        Activar video
                    </span>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => setEnabled(event.target.checked)}
                        className="h-4 w-4 accent-orange-accent"
                    />
                </label>

                {feedback && (
                    <p className={`text-[11px] font-bold ${feedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {feedback.message}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-orange-accent px-4 text-[10px] font-black uppercase tracking-[0.18em] text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                    Guardar
                </button>
            </form>
        </section>
    );
};

export default OnboardingVideoAdminCard;
