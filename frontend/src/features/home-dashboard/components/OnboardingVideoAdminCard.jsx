import React from 'react';
import { CheckCircle2, Loader2, MessageSquareMore, PlayCircle, Save, Video } from 'lucide-react';
import { updateOnboardingVideo } from '../services/onboardingService';

const DEFAULT_MAX_CHAT_INTERACTIONS = 20;
const MIN_MAX_CHAT_INTERACTIONS = 1;
const MAX_MAX_CHAT_INTERACTIONS = 50;

const normalizeMaxChatInteractions = (value) => {
    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
        return DEFAULT_MAX_CHAT_INTERACTIONS;
    }

    return Math.min(MAX_MAX_CHAT_INTERACTIONS, Math.max(MIN_MAX_CHAT_INTERACTIONS, parsed));
};

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

const isDirectVideoUrl = (videoUrl = '') => /\.(mp4|webm|ogg)(\?.*)?$/i.test(videoUrl);

const resolvePreviewUrl = (videoUrl = '') => {
    const transformedUrl = transformYouTubeUrl(videoUrl.trim());

    if (!transformedUrl) {
        return null;
    }

    try {
        new URL(transformedUrl);
        return transformedUrl;
    } catch {
        return null;
    }
};

const OnboardingVideoAdminCard = ({
    isDarkMode,
    initialVideoUrl = '',
    initialEnabled = false,
    initialMaxChatInteractions = DEFAULT_MAX_CHAT_INTERACTIONS,
    onSaved,
}) => {
    const [videoUrl, setVideoUrl] = React.useState(initialVideoUrl || '');
    const [enabled, setEnabled] = React.useState(Boolean(initialEnabled));
    const [maxChatInteractions, setMaxChatInteractions] = React.useState(
        normalizeMaxChatInteractions(initialMaxChatInteractions)
    );
    const [saving, setSaving] = React.useState(false);
    const [feedback, setFeedback] = React.useState(null);
    const previewUrl = React.useMemo(() => resolvePreviewUrl(videoUrl), [videoUrl]);

    React.useEffect(() => {
        setVideoUrl(initialVideoUrl || '');
        setEnabled(Boolean(initialEnabled));
        setMaxChatInteractions(normalizeMaxChatInteractions(initialMaxChatInteractions));
    }, [initialEnabled, initialMaxChatInteractions, initialVideoUrl]);

    const saveVideoConfig = async ({
        nextEnabled = enabled,
        nextVideoUrl = videoUrl,
        nextMaxChatInteractions = maxChatInteractions,
    } = {}) => {
        setSaving(true);
        setFeedback(null);

        try {
            const finalUrl = transformYouTubeUrl(nextVideoUrl.trim());
            const normalizedMaxChatInteractions = normalizeMaxChatInteractions(nextMaxChatInteractions);
            const payload = {
                introVideoUrl: finalUrl,
                introVideoEnabled: nextEnabled,
                maxChatInteractions: normalizedMaxChatInteractions,
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

            return true;
        } catch (error) {
            setFeedback({
                type: 'error',
                message: error.response?.data?.message || 'No se pudo guardar la configuracion.',
            });

            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        await saveVideoConfig();
    };

    const handleEnabledChange = async (event) => {
        const nextEnabled = event.target.checked;
        const previousEnabled = enabled;

        setEnabled(nextEnabled);
        const saved = await saveVideoConfig({ nextEnabled });

        if (!saved) {
            setEnabled(previousEnabled);
        }
    };

    const handleMaxChatInteractionsBlur = async () => {
        const normalizedValue = normalizeMaxChatInteractions(maxChatInteractions);

        if (normalizedValue !== maxChatInteractions) {
            setMaxChatInteractions(normalizedValue);
        }

        await saveVideoConfig({ nextMaxChatInteractions: normalizedValue });
    };

    return (
        <section
            className={`mt-3 overflow-hidden rounded-[8px] border ${
                isDarkMode
                    ? 'border-white/10 bg-[#151515]/90 shadow-[0_18px_50px_rgba(0,0,0,0.24)]'
                    : 'border-stone-200 bg-white shadow-[0_16px_42px_rgba(15,23,42,0.08)]'
            }`}
        >
            <div className="border-b px-4 py-4" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E7E5E4' }}>
                <div className="flex items-start gap-3">
                    <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[8px] ${
                            isDarkMode ? 'bg-orange-accent/12 text-orange-accent' : 'bg-orange-50 text-orange-accent'
                        }`}
                    >
                        <Video size={18} />
                    </div>
                    <div className="min-w-0">
                        <h3 className={`text-sm font-black leading-tight ${isDarkMode ? 'text-white' : 'text-stone-950'}`}>
                            Video de onboarding
                        </h3>
                        <p className={`mt-1 text-[11px] leading-relaxed ${isDarkMode ? 'text-white/58' : 'text-stone-600'}`}>
                            Controla el video que veran los usuarios antes del recorrido inicial.
                        </p>
                    </div>
                </div>
            </div>

            <form className="space-y-4 px-4 py-4" onSubmit={handleSubmit}>
                <label
                    className={`flex min-h-[74px] cursor-pointer items-center justify-between gap-3 rounded-[8px] border px-3 py-3 transition-all ${
                        enabled
                            ? isDarkMode
                                ? 'border-orange-accent/35 bg-orange-accent/10'
                                : 'border-orange-accent/35 bg-orange-50'
                            : isDarkMode
                                ? 'border-white/10 bg-black/18'
                                : 'border-stone-200 bg-stone-50'
                    }`}
                >
                    <div>
                        <span className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                            Mostrar video antes del recorrido
                        </span>
                        <p className={`mt-1 text-[10px] font-semibold ${isDarkMode ? 'text-white/45' : 'text-stone-500'}`}>
                            Control principal para activar esta experiencia.
                        </p>
                    </div>
                    <span
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-all ${
                            enabled ? 'bg-orange-accent' : isDarkMode ? 'bg-white/14' : 'bg-stone-300'
                        }`}
                    >
                        <span
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                                enabled ? 'left-6' : 'left-1'
                            }`}
                        />
                    </span>
                    <input
                        type="checkbox"
                        checked={enabled}
                        onChange={handleEnabledChange}
                        disabled={saving}
                        className="sr-only"
                    />
                </label>

                <div
                    className={`flex min-h-[40px] items-center gap-2 rounded-[8px] px-3 py-2.5 ${
                        enabled
                            ? isDarkMode
                                ? 'bg-emerald-500/10 text-emerald-300'
                                : 'bg-emerald-50 text-emerald-700'
                            : isDarkMode
                                ? 'bg-white/[0.035] text-white/55'
                                : 'bg-stone-100 text-stone-600'
                    }`}
                >
                    <span className={`h-2 w-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                    <p className="text-[10px] font-black uppercase leading-snug tracking-[0.12em]">
                        {enabled ? 'Video activo en onboarding' : 'El onboarding se mostrara sin video'}
                    </p>
                </div>

                {enabled && (
                    <>
                        <div
                            className={`overflow-hidden rounded-[8px] border ${
                                isDarkMode ? 'border-white/10 bg-black/24' : 'border-stone-200 bg-stone-50'
                            }`}
                        >
                            <div className="aspect-video min-h-[150px] w-full bg-black">
                                {previewUrl ? (
                                    isDirectVideoUrl(previewUrl) ? (
                                        <video className="h-full w-full" src={previewUrl} controls muted playsInline />
                                    ) : (
                                        <iframe
                                            className="h-full w-full"
                                            src={previewUrl}
                                            title="Vista previa del video de onboarding"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowFullScreen
                                        />
                                    )
                                ) : (
                                    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                                        <PlayCircle className="text-orange-accent/75" size={34} />
                                        <p className="px-5 text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
                                            Agrega un enlace para ver la vista previa
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <label className="block">
                            <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDarkMode ? 'text-white/70' : 'text-stone-700'}`}>
                                Pega un enlace de YouTube
                            </span>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(event) => setVideoUrl(event.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-[12px] font-semibold outline-none transition-all ${
                                    isDarkMode
                                        ? 'border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-orange-accent/55'
                                        : 'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-orange-accent/65'
                                }`}
                            />
                            <p className={`mt-2 text-[10px] font-semibold ${isDarkMode ? 'text-white/42' : 'text-stone-500'}`}>
                                Se convertira automaticamente al formato correcto.
                            </p>
                        </label>
                    </>
                )}

                <div
                    className={`overflow-hidden rounded-[8px] border ${
                        isDarkMode ? 'border-white/10 bg-black/24' : 'border-stone-200 bg-stone-50'
                    }`}
                >
                    <div className="flex items-start gap-3 border-b px-3 py-3" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E7E5E4' }}>
                        <div
                            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] ${
                                isDarkMode ? 'bg-orange-accent/12 text-orange-accent' : 'bg-orange-50 text-orange-accent'
                            }`}
                        >
                            <MessageSquareMore size={15} />
                        </div>
                        <div className="min-w-0">
                            <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDarkMode ? 'text-white' : 'text-stone-900'}`}>
                                Límite de interacciones por chat
                            </p>
                            <p className={`mt-1 text-[10px] leading-relaxed ${isDarkMode ? 'text-white/50' : 'text-stone-600'}`}>
                                Define cuántos mensajes de usuario se permiten antes de bloquear nuevas interacciones.
                            </p>
                        </div>
                    </div>
                    <div className="px-3 py-3">
                        <label className="block">
                            <span className={`text-[10px] font-black uppercase tracking-[0.14em] ${isDarkMode ? 'text-white/70' : 'text-stone-700'}`}>
                                Máximo permitido ({MIN_MAX_CHAT_INTERACTIONS} a {MAX_MAX_CHAT_INTERACTIONS})
                            </span>
                            <input
                                type="number"
                                min={MIN_MAX_CHAT_INTERACTIONS}
                                max={MAX_MAX_CHAT_INTERACTIONS}
                                step="1"
                                value={maxChatInteractions}
                                onChange={(event) => setMaxChatInteractions(event.target.value)}
                                onBlur={handleMaxChatInteractionsBlur}
                                className={`mt-2 h-11 w-full rounded-[8px] border px-3 text-[12px] font-semibold outline-none transition-all ${
                                    isDarkMode
                                        ? 'border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-orange-accent/55'
                                        : 'border-stone-200 bg-white text-stone-900 placeholder:text-stone-400 focus:border-orange-accent/65'
                                }`}
                            />
                        </label>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className={`inline-flex items-center justify-center gap-2 rounded-[8px] px-4 text-[10px] font-black uppercase tracking-[0.18em] transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                        enabled
                            ? 'h-11 w-full bg-orange-accent text-white hover:brightness-110'
                            : isDarkMode
                                ? 'h-9 w-full border border-white/10 bg-white/[0.04] text-white/72 hover:border-orange-accent/35 hover:text-orange-accent'
                                : 'h-9 w-full border border-stone-200 bg-white text-stone-600 hover:border-orange-accent/45 hover:text-orange-accent'
                    }`}
                >
                    {saving ? <Loader2 className="animate-spin" size={15} /> : <Save size={15} />}
                    {enabled ? 'Guardar configuracion' : 'Guardar estado'}
                </button>

                {feedback && (
                    <p className={`text-[11px] font-bold leading-[18px] ${feedback.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {feedback.type === 'success' ? <CheckCircle2 className="mr-1 inline" size={13} /> : null}
                        {feedback.message}
                    </p>
                )}
            </form>
        </section>
    );
};

export default OnboardingVideoAdminCard;
