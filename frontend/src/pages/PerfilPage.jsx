import React from 'react';
import { Award, Briefcase, FileCheck, GraduationCap, Languages, Loader2, User } from 'lucide-react';
import { useAuth } from '../features/auth';
import { useCvAnalysis } from '../features/cv-analysis';
import { useMasterModules } from '../features/recommendation';
import { findMasterById, getMasterDisplayName } from '../shared/utils/masters';

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

    const { extractedProfile = {}, recommendation = {}, masterId } = analysis;
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

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8 duration-700">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="mb-2 text-3xl font-bold">Mi Perfil Profesional</h1>
                    <p className="text-sm text-muted">
                        Informacion extraida de tu ultimo CV analizado y ajustada al Master seleccionado.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {selectedMaster && (
                        <span className="rounded-full border border-orange-accent/20 bg-orange-accent/10 px-4 py-2 text-sm font-medium text-orange-accent">
                            {getMasterDisplayName(selectedMaster)}
                        </span>
                    )}
                    {recommendation.matchScore ? (
                        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-500">
                            Score: {recommendation.matchScore}%
                        </span>
                    ) : null}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-1">
                    <div className="card py-8 text-center">
                        <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-orange-accent text-3xl font-bold text-white shadow-lg shadow-orange-accent/20">
                            {extractedProfile.name?.charAt(0) || 'L'}
                        </div>
                        <h2 className="text-xl font-bold">{extractedProfile.name || 'Perfil analizado'}</h2>
                        <p className="mb-4 font-medium text-orange-accent">{extractedProfile.currentRole || 'Rol no especificado'}</p>
                        <div className="flex items-center justify-center gap-2 text-sm text-dark-muted">
                            <Briefcase size={14} />
                            <span>{extractedProfile.yearsOfExperience || 0} anos de experiencia</span>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="mb-4 flex items-center gap-2 font-bold">
                            <Award className="text-orange-accent" size={18} />
                            Habilidades ({(extractedProfile.skills || []).length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {(extractedProfile.skills || []).map((skill) => (
                                <span key={skill} className="rounded-lg border border-dark-border bg-dark-border/50 px-3 py-1 text-sm text-dark-text">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="space-y-6 lg:col-span-2">
                    <div className="card">
                        <h3 className="mb-6 flex items-center gap-3 text-xl font-bold">
                            <User className="text-orange-accent" size={24} />
                            Resumen Profesional
                        </h3>
                        <p className="italic leading-relaxed text-dark-text">
                            &quot;{extractedProfile.summary || 'Sin resumen disponible.'}&quot;
                        </p>
                    </div>

                    {recommendedRoute.length > 0 && (
                        <div className="card">
                            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold">
                                <GraduationCap className="text-orange-accent" size={24} />
                                Ruta recomendada
                            </h3>
                            {(recommendation.primarySpecialization || recommendation.reasoning) && (
                                <div className="mb-4 rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                                    {recommendation.primarySpecialization ? (
                                        <p className="mb-1 font-bold text-orange-accent">{recommendation.primarySpecialization}</p>
                                    ) : null}
                                    {recommendation.reasoning ? (
                                        <p className="text-sm leading-relaxed text-dark-text">{recommendation.reasoning}</p>
                                    ) : null}
                                </div>
                            )}
                            <div className="grid gap-3 md:grid-cols-2">
                                {recommendedRoute.map((block, index) => (
                                    <div key={block.id || block.blockTitle} className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                                        <p className="text-sm font-bold text-dark-text">{block.blockTitle || block.title}</p>
                                        <p className="mt-1 text-xs text-dark-muted">
                                            Sprint {index + 1}
                                            {block.specializationName ? ` - ${block.specializationName}` : ''}
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
                                    <div key={module.id} className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                                        <h4 className="font-bold">{module.title}</h4>
                                        <p className="text-sm text-dark-muted">{module.topicsCount ?? module.topics?.length ?? 0} temas</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.experience || []).length > 0 && (
                        <div className="card">
                            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold">
                                <Briefcase className="text-orange-accent" size={24} />
                                Experiencia Laboral
                            </h3>
                            <div className="space-y-6">
                                {extractedProfile.experience.map((experience, index) => (
                                    <div key={`${experience.company}-${index}`} className="relative border-l-2 border-dark-border pb-6 pl-6 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-orange-accent bg-dark-border" />
                                        <h4 className="text-lg font-bold">{experience.title}</h4>
                                        <div className="mb-2 flex justify-between text-sm text-dark-muted">
                                            <span>{experience.company}</span>
                                            <span>{experience.duration}</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-dark-text">{experience.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.education || []).length > 0 && (
                        <div className="card">
                            <h3 className="mb-6 flex items-center gap-3 text-xl font-bold">
                                <GraduationCap className="text-orange-accent" size={24} />
                                Educacion
                            </h3>
                            <div className="space-y-4">
                                {extractedProfile.education.map((education, index) => (
                                    <div key={`${education.institution}-${index}`} className="rounded-xl border border-dark-border bg-dark-bg/50 p-4">
                                        <h4 className="font-bold">{education.degree}</h4>
                                        <p className="text-sm text-dark-muted">
                                            {education.field}
                                            {education.institution ? ` - ${education.institution}` : ''}
                                        </p>
                                        {education.year ? <p className="mt-1 text-xs text-orange-accent/70">Graduado en {education.year}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.languages || []).length > 0 && (
                        <div className="card">
                            <h3 className="mb-4 flex items-center gap-2 font-bold">
                                <Languages className="text-orange-accent" size={18} />
                                Idiomas
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                {extractedProfile.languages.map((language) => (
                                    <div key={language} className="flex items-center gap-2 rounded-lg bg-dark-bg px-4 py-2">
                                        <span className="text-sm font-medium">{language}</span>
                                    </div>
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
