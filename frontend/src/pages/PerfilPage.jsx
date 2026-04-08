import React from 'react';
import { Award, Briefcase, Check, FileCheck, GraduationCap, Languages, Loader2, User } from 'lucide-react';
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
        highlights.push('Experiencia en integracion hardware/software');
    }

    if (/(crm|automat|digital)/.test(haystack)) {
        highlights.push('Automatizacion con CRM y herramientas digitales');
    }

    if (/(python|javascript|program|soporte|support)/.test(haystack)) {
        highlights.push('Programacion y soporte tecnico');
    }

    if (!highlights.length && profile.currentRole) {
        highlights.push(`Experiencia en ${profile.currentRole}`);
    }

    if (highlights.length < 3 && profile.industry) {
        highlights.push(`Conocimiento aplicado en ${profile.industry}`);
    }

    if (highlights.length < 3 && profile.yearsOfExperience) {
        highlights.push(`${profile.yearsOfExperience} anos de experiencia profesional`);
    }

    return [...new Set(highlights)].slice(0, 3);
};

const SKILL_MAPPINGS = [
    { match: /(hardware|software|integr)/, label: 'Integracion HW/SW', tone: { backgroundColor: '#DCEBED', color: '#0C5258' } },
    { match: /crm/, label: 'CRM', tone: { backgroundColor: '#FCE6DE', color: '#EE5522' } },
    { match: /automat/, label: 'Automatizacion', tone: { backgroundColor: '#E6F3EE', color: '#50A584' } },
    { match: /javascript|java script|\bjs\b/, label: 'JavaScript', tone: { backgroundColor: '#F3EED9', color: '#8E6C00' } },
    { match: /python/, label: 'Python', tone: { backgroundColor: '#E3EDF8', color: '#2E5B9A' } },
    { match: /soporte|support/, label: 'Soporte', tone: { backgroundColor: '#ECE8E4', color: '#2D2926' } },
];

const buildDisplaySkills = (profile = {}) => {
    const haystackItems = [
        ...(profile.skills || []),
        ...(profile.experience || []).flatMap((item) => [item.title, item.description]),
    ];

    const resolved = SKILL_MAPPINGS.filter(({ match }) =>
        haystackItems.some((item) => match.test(normalizeText(item)))
    ).map(({ label, tone }) => ({ label, tone }));

    return resolved.slice(0, 6);
};

const summarizeExperience = (experience = {}) => {
    const haystack = normalizeText([experience.title, experience.description].filter(Boolean).join(' '));
    const tags = [];

    if (/crm/.test(haystack)) tags.push('CRM');
    if (/(hardware|software|integr)/.test(haystack)) tags.push('Integraciones');
    if (/(dashboard|analit|data|datos)/.test(haystack)) tags.push('Dashboards');
    if (/(automat|process|proceso)/.test(haystack)) tags.push('Automatizacion');
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
                    <h2 className="mb-2 text-2xl font-bold">Aun no hay perfil analizado</h2>
                    <p className="mx-auto max-w-md text-dark-muted">
                        Sube tu curriculum en la pagina de inicio para generar tu perfil profesional con IA.
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="mb-2 text-3xl font-bold">Mi Perfil Profesional</h1>
                    <p className="text-sm text-muted">
                        Informacion extraida de tu ultimo CV analizado y ajustada al Master seleccionado.
                    </p>
                </div>
            </header>

            <div className="rounded-[24px] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.18)]" style={{ backgroundColor: '#25211F' }}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-2xl font-bold text-white">
                            {extractedProfile.name?.charAt(0) || 'L'}
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-2xl font-bold text-white">{extractedProfile.name || 'Perfil analizado'}</h2>
                            <p className="truncate text-sm font-medium" style={{ color: 'rgba(255,255,255,0.88)' }}>
                                {extractedProfile.currentRole || 'Rol no especificado'}
                            </p>
                            <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                {extractedProfile.yearsOfExperience || 0} anos de experiencia
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {recommendation.matchScore ? (
                            <span
                                className="inline-flex rounded-full px-4 py-2 text-sm font-bold text-white"
                                style={{ backgroundColor: '#50A584' }}
                            >
                                Score {recommendation.matchScore}%
                            </span>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <div className="card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                            <User className="text-orange-accent" size={18} />
                            Perfil profesional
                        </h3>
                        <div
                            className="space-y-3 rounded-2xl border-l-4 px-4 py-4"
                            style={{ borderLeftColor: '#0C5258', backgroundColor: 'rgba(12, 82, 88, 0.08)' }}
                        >
                            {profileHighlights.map((highlight) => (
                                <div key={highlight} className="flex items-start gap-3">
                                    <Check size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#0C5258' }} />
                                    <p className="text-sm leading-snug text-dark-text">{highlight}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-5">
                        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                            <Award className="text-orange-accent" size={18} />
                            Habilidades
                        </h3>
                        <div className="flex flex-wrap gap-2.5">
                            {displaySkills.map((skill) => (
                                <span
                                    key={skill.label}
                                    className="rounded-full px-3 py-1.5 text-sm font-semibold"
                                    style={skill.tone}
                                >
                                    {skill.label}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 lg:col-span-2">
                    {recommendedRoute.length > 0 && (
                        <div className="card p-5">
                            <h3 className="mb-5 text-xl font-bold">🔥 Ruta recomendada</h3>
                            <div className="grid gap-3 md:grid-cols-3">
                                {recommendedRoute.map((block, index) => (
                                    <div
                                        key={block.id || block.blockTitle}
                                        className="flex min-h-[84px] items-center gap-3 rounded-2xl px-4 py-4 text-white transition-colors hover:bg-[#84C1C1]"
                                        style={{ backgroundColor: '#50A584' }}
                                    >
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/18 text-sm font-bold">
                                            {index + 1}
                                        </div>
                                        <p className="min-w-0 flex-1 truncate text-sm font-bold">
                                            {block.blockTitle || block.title}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {availableModules.length > 0 && (
                        <div className="card">
                            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold">
                                <Briefcase className="text-orange-accent" size={24} />
                                Modulos existentes del Master
                            </h3>
                            <div className="space-y-4">
                                {availableModules.map((module) => (
                                    <div key={module.id} className="rounded-2xl border border-dark-border bg-dark-bg/50 px-4 py-4">
                                        <h4 className="font-bold">{module.title}</h4>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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

                    <div className="grid gap-6 md:grid-cols-2">
                        {(extractedProfile.education || []).length > 0 && (
                            <div className="card p-5">
                                <h3 className="mb-5 flex items-center gap-2 text-lg font-bold">
                                    <GraduationCap className="text-orange-accent" size={18} />
                                    Educacion
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
                </div>
            </div>
        </div>
    );
};

export default PerfilPage;
