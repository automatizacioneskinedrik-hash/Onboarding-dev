import React from 'react';
import {
    Award,
    Briefcase,
    CheckCircle2,
    FileCheck,
    GraduationCap,
    Languages,
    Loader2,
    Sparkles,
    TrendingUp,
} from 'lucide-react';
import { useAuth } from '../features/auth';
import { useCvAnalysis } from '../features/cv-analysis';
import { useMasterModules } from '../features/recommendation';
import { findMasterById, getMasterDisplayName } from '../shared/utils/masters';

const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const collectProfileHaystack = (profile = {}) =>
    [
        profile.currentRole,
        profile.summary,
        ...(profile.skills || []),
        ...(profile.experience || []).map((item) => item.description),
    ]
        .filter(Boolean)
        .join(' ');

const buildProfessionalHighlights = (profile = {}) => {
    const haystack = normalizeText(collectProfileHaystack(profile));
    const highlights = [];

    if (/(hardware|software|integr)/.test(haystack)) {
        highlights.push('Experiencia en integración hardware/software');
    }

    if (/(crm|automat|digital)/.test(haystack)) {
        highlights.push('Automatización con CRM y herramientas digitales');
    }

    if (/(python|javascript|program|soporte|support)/.test(haystack)) {
        highlights.push('Programación y soporte técnico');
    }

    if (!highlights.length && profile.currentRole) {
        highlights.push(`Experiencia en ${profile.currentRole}`);
    }

    if (highlights.length < 3 && profile.industry) {
        highlights.push(`Conocimiento aplicado en ${profile.industry}`);
    }

    if (highlights.length < 3 && profile.yearsOfExperience) {
        highlights.push(`${profile.yearsOfExperience} años de experiencia profesional`);
    }

    return [...new Set(highlights)].slice(0, 3);
};

const SKILL_MAPPINGS = [
    {
        match: /(hardware|software|integr)/,
        label: 'Integración HW/SW',
        level: 92,
        caption: 'Arquitectura e integración',
        barColor: '#0C5258',
        tone: { backgroundColor: '#DCEBED', color: '#0C5258' },
    },
    {
        match: /crm/,
        label: 'CRM',
        level: 84,
        caption: 'Operación comercial',
        barColor: '#EE5522',
        tone: { backgroundColor: '#FCE6DE', color: '#EE5522' },
    },
    {
        match: /automat/,
        label: 'Automatización',
        level: 88,
        caption: 'Optimización de procesos',
        barColor: '#50A584',
        tone: { backgroundColor: '#E6F3EE', color: '#50A584' },
    },
    {
        match: /javascript|java script|\bjs\b/,
        label: 'JavaScript',
        level: 78,
        caption: 'Stack técnico',
        barColor: '#8E6C00',
        tone: { backgroundColor: '#F3EED9', color: '#8E6C00' },
    },
    {
        match: /python/,
        label: 'Python',
        level: 80,
        caption: 'Análisis y automatización',
        barColor: '#2E5B9A',
        tone: { backgroundColor: '#E3EDF8', color: '#2E5B9A' },
    },
    {
        match: /soporte|support/,
        label: 'Soporte',
        level: 72,
        caption: 'Operación y continuidad',
        barColor: '#2D2926',
        tone: { backgroundColor: '#ECE8E4', color: '#2D2926' },
    },
];

const buildDisplaySkills = (profile = {}) => {
    const haystackItems = [
        ...(profile.skills || []),
        ...(profile.experience || []).flatMap((item) => [item.title, item.description]),
    ];

    const resolved = SKILL_MAPPINGS.filter(({ match }) =>
        haystackItems.some((item) => match.test(normalizeText(item)))
    ).map(({ label, tone, level, caption, barColor }) => ({
        label,
        tone,
        level,
        caption,
        barColor,
    }));

    return resolved.slice(0, 6);
};

const summarizeExperience = (experience = {}) => {
    const haystack = normalizeText([experience.title, experience.description].filter(Boolean).join(' '));
    const tags = [];

    if (/crm/.test(haystack)) tags.push('CRM');
    if (/(hardware|software|integr)/.test(haystack)) tags.push('Integraciones');
    if (/(dashboard|analit|data|datos)/.test(haystack)) tags.push('Dashboards');
    if (/(automat|process|proceso)/.test(haystack)) tags.push('Automatización');
    if (!tags.length && experience.description) tags.push(experience.description.split(/[,.]/)[0].trim());

    return tags.slice(0, 3).join(' + ');
};

const formatLanguage = (language = '') => String(language || '').trim();

const PerfilPage = () => {
    const { user, masters } = useAuth();
    const { analysis, analysisLoading: loading } = useCvAnalysis({
        enabled: true,
        masters,
        selectedMaster: null,
    });
    const resolvedMasterId = analysis?.masterId || user?.selectedMasterId || null;
    const selectedMaster = findMasterById(masters, resolvedMasterId);
    const { moduleItems: availableModules } = useMasterModules(selectedMaster?.id || resolvedMasterId);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-20">
                <Loader2 className="animate-spin text-orange-accent" size={40} />
                <p className="text-dark-muted">Cargando tu perfil profesional...</p>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="space-y-6 py-20 text-center">
                <div className="inline-flex rounded-full bg-dark-card p-6">
                    <FileCheck className="text-dark-muted" size={48} />
                </div>
                <div>
                    <h2 className="mb-2 text-2xl font-bold">Aún no hay perfil analizado</h2>
                    <p className="mx-auto max-w-md text-dark-muted">
                        Sube tu currículum en la página de inicio para generar tu perfil profesional con IA.
                    </p>
                </div>
            </div>
        );
    }

    const { extractedProfile = {}, recommendation = {} } = analysis;
    const routeBlocks = recommendation.sprint?.blocks || recommendation.planBlocks || [];
    const subjects = recommendation.subjects || [];
    const recommendedRoute = (routeBlocks.length
        ? routeBlocks
        : subjects.map((subject, index) => ({
              id: `subject-${index + 1}`,
              blockTitle: subject,
              specializationName: recommendation.primarySpecialization || '',
          }))
    ).slice(0, 6);
    const profileHighlights = buildProfessionalHighlights(extractedProfile);
    const displaySkills = buildDisplaySkills(extractedProfile);
    const visibleLanguages = (extractedProfile.languages || []).map(formatLanguage).filter(Boolean);
    const masterDisplayName = getMasterDisplayName(selectedMaster || resolvedMasterId) || 'Máster seleccionado';
    const scoreValue = Number(recommendation.matchScore || 0);
    const scoreLabel =
        scoreValue >= 85 ? 'Alta compatibilidad' : scoreValue >= 70 ? 'Buen encaje' : 'Potencial de crecimiento';
    const scoreStyle = { '--score': `${Math.max(0, Math.min(scoreValue, 100))}%` };
    const visibleProfileTags = [
        masterDisplayName,
        extractedProfile.industry,
        extractedProfile.yearsOfExperience ? `${extractedProfile.yearsOfExperience} años de experiencia` : null,
    ]
        .filter(Boolean)
        .slice(0, 3);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
            <header className="space-y-4">
                <div>
                    <p className="profile-section-kicker">PERFIL PROFESIONAL</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Mi perfil profesional</h1>
                    <p className="mt-2 max-w-3xl text-sm text-dark-muted">
                        Información extraída de tu último CV analizado y alineada con el máster seleccionado.
                    </p>
                </div>

                <section className="profile-hero-shell">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="profile-hero-avatar">{extractedProfile.name?.charAt(0) || 'L'}</div>

                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/60">
                                    Perfil analizado
                                </p>
                                <h2 className="mt-2 truncate text-2xl font-bold text-white md:text-3xl">
                                    {extractedProfile.name || 'Perfil analizado'}
                                </h2>
                                <p className="mt-1 truncate text-base font-medium text-white/80">
                                    {extractedProfile.currentRole || 'Rol no especificado'}
                                </p>

                                <div className="mt-4 flex flex-wrap gap-2">
                                    {visibleProfileTags.map((tag) => (
                                        <span key={tag} className="profile-hero-chip">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {scoreValue > 0 ? (
                                <div className="profile-score-card">
                                    <div className="profile-score-ring" style={scoreStyle}>
                                        <div className="profile-score-ring-inner">
                                            <strong>{scoreValue}%</strong>
                                            <span>Score</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                                            Compatibilidad
                                        </p>
                                        <p className="mt-1 text-lg font-bold text-white">{scoreLabel}</p>
                                        <p className="text-sm text-white/70">Encaje estimado con la ruta recomendada.</p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <div className="profile-premium-card p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="profile-section-kicker">FORTALEZAS CLAVE</p>
                                <h3 className="mt-2 text-xl font-bold text-[#16110F]">Tu perfil destaca en</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Puntos del CV que hoy generan mejor percepción de valor.
                                </p>
                            </div>

                            <div className="rounded-full bg-[#F45A22]/10 p-2 text-[#F45A22]">
                                <Sparkles size={18} />
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            {profileHighlights.map((highlight) => (
                                <div key={highlight} className="profile-highlight-item">
                                    <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-[#0C5258]" />
                                    <p className="text-sm leading-6 text-[#2F2A27]">{highlight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="profile-premium-card p-6">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="profile-section-kicker">SKILL SIGNALS</p>
                                <h3 className="mt-2 text-xl font-bold text-[#16110F]">Habilidades destacadas</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Lectura visual de las capacidades más visibles en tu perfil actual.
                                </p>
                            </div>

                            <div className="rounded-full bg-[#50A584]/10 p-2 text-[#50A584]">
                                <Award size={18} />
                            </div>
                        </div>

                        <div className="mt-5 space-y-4">
                            {displaySkills.map((skill) => (
                                <div key={skill.label} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-semibold text-[#16110F]">{skill.label}</p>
                                        <span className="text-sm font-semibold text-slate-500">{skill.level}%</span>
                                    </div>

                                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        {skill.caption}
                                    </p>

                                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${skill.level}%`, backgroundColor: skill.barColor }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {(extractedProfile.skills || []).length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                                {extractedProfile.skills.slice(0, 6).map((skill) => (
                                    <span key={skill} className="profile-neutral-chip">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {(extractedProfile.experience || []).length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-xl font-bold">
                                <Briefcase className="text-orange-accent" size={20} />
                                Experiencia laboral
                            </h3>
                            <div className="space-y-5">
                                {extractedProfile.experience.map((experience, index) => (
                                    <div
                                        key={`${experience.company}-${index}`}
                                        className="relative border-l-2 pb-5 pl-5 last:pb-0"
                                        style={{ borderLeftColor: '#EE5522' }}
                                    >
                                        <div
                                            className="absolute -left-[7px] top-1 h-3.5 w-3.5 rounded-full border-2"
                                            style={{ borderColor: '#EE5522', backgroundColor: '#2D2926' }}
                                        />
                                        <h4 className="text-base font-bold">{experience.title}</h4>
                                        <p className="text-sm text-dark-muted">{experience.company}</p>
                                        <p className="mt-1 text-sm font-medium text-dark-text">
                                            {summarizeExperience(experience)
                                                ? `→ ${summarizeExperience(experience)}`
                                                : '→ Experiencia aplicada'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.education || []).length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                                <GraduationCap className="text-orange-accent" size={18} />
                                Educación
                            </h3>
                            <div className="space-y-3">
                                {extractedProfile.education.map((education, index) => (
                                    <div key={`${education.institution}-${index}`} className="rounded-2xl border border-dark-border bg-dark-bg/50 px-4 py-4">
                                        <p className="font-bold">{education.degree}</p>
                                        <p className="text-sm text-dark-muted">{education.institution || education.field}</p>
                                        {education.year ? <p className="mt-1 text-sm text-orange-accent">{education.year}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {visibleLanguages.length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                                <Languages className="text-orange-accent" size={18} />
                                Idiomas
                            </h3>
                            <div className="rounded-2xl border border-dark-border bg-dark-bg/50 px-4 py-4">
                                <p className="text-sm font-medium text-dark-text">{visibleLanguages.join(' | ')}</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6 lg:col-span-2">
                    {recommendedRoute.length > 0 && (
                        <div className="profile-premium-card p-6">
                            <div className="flex flex-col gap-3">
                                <div>
                                    <p className="profile-section-kicker">ROADMAP SUGERIDO</p>
                                    <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-[#16110F]">
                                        <TrendingUp className="text-[#F45A22]" size={20} />
                                        Ruta recomendada
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Secuencia visual para recorrer tu recomendación de forma clara.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                {recommendedRoute.map((block, index) => (
                                    <div key={block.id || block.blockTitle} className="profile-roadmap-item">
                                        <div className="profile-roadmap-step">{index + 1}</div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="text-base font-semibold text-[#16110F]">
                                                    {block.blockTitle || block.title}
                                                </p>

                                                {block.specializationName ? (
                                                    <span className="profile-module-chip">{block.specializationName}</span>
                                                ) : null}
                                            </div>

                                            <p className="mt-1 text-sm text-slate-500">
                                                Sprint {index + 1} de tu hoja de ruta recomendada.
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableModules.length > 0 && (
                        <div className="profile-premium-card p-6">
                            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <p className="profile-section-kicker">CATÁLOGO BASE</p>
                                    <h3 className="mt-2 flex items-center gap-2 text-xl font-bold text-[#16110F]">
                                        <Briefcase className="text-[#F45A22]" size={20} />
                                        Módulos existentes del Máster
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Contenido actualmente disponible en {masterDisplayName}.
                                    </p>
                                </div>

                                <span className="profile-neutral-chip">{availableModules.length} módulos</span>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {availableModules.map((module, index) => (
                                    <article key={module.id} className="rounded-[22px] border border-slate-200 bg-[#FCFAF8] p-5 shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                                    Módulo {index + 1}
                                                </p>
                                                <h4 className="mt-2 text-base font-bold text-[#16110F]">{module.title}</h4>
                                            </div>

                                            <span className="profile-module-chip whitespace-nowrap shrink-0">
                                                {module.topicsCount ?? module.topics?.length ?? 0} temas
                                            </span>
                                        </div>

                                        {(module.topics || []).length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {module.topics.slice(0, 3).map((topic) => (
                                                    <span key={topic} className="profile-neutral-chip">
                                                        {topic}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </article>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerfilPage;
