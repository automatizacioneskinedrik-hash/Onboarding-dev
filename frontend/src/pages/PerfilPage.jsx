import React, { useEffect, useState } from 'react';
import { Award, Briefcase, FileCheck, GraduationCap, Languages, Loader2, User } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { findMasterById, getMasterDisplayName } from '../utils/masters';

const PerfilPage = () => {
    const { user, masters } = useAuth();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/cv/my-analysis');
                if (response.data.success) {
                    setAnalysis(response.data.data.analysis);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <Loader2 className="animate-spin text-orange-accent" size={40} />
                <p className="text-dark-muted">Cargando tu perfil profesional...</p>
            </div>
        );
    }

    if (!analysis) {
        return (
            <div className="text-center py-20 space-y-6">
                <div className="inline-flex p-6 bg-dark-card rounded-full">
                    <FileCheck className="text-dark-muted" size={48} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold mb-2">Aun no hay perfil analizado</h2>
                    <p className="text-dark-muted max-w-md mx-auto">
                        Sube tu curriculum en la pagina de inicio para generar tu perfil profesional con IA.
                    </p>
                </div>
            </div>
        );
    }

    const { extractedProfile = {}, recommendation = {}, masterId } = analysis;
    const selectedMaster = findMasterById(masters, masterId || user?.selectedMasterId);
    const recommendedCourses = recommendation.recommendedCourses || [];
    const subjects = recommendation.subjects || [];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Mi Perfil Profesional</h1>
                    <p className="text-muted text-sm">
                        Informacion extraida de tu ultimo CV analizado y ajustada al master seleccionado.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {selectedMaster && (
                        <span className="px-4 py-2 bg-orange-accent/10 text-orange-accent border border-orange-accent/20 rounded-full text-sm font-medium">
                            {getMasterDisplayName(selectedMaster)}
                        </span>
                    )}
                    {recommendation.matchScore ? (
                        <span className="px-4 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-sm font-medium">
                            Score: {recommendation.matchScore}%
                        </span>
                    ) : null}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="card text-center py-8">
                        <div className="w-24 h-24 bg-orange-accent rounded-full mx-auto flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-orange-accent/20 shadow-lg">
                            {extractedProfile.name?.charAt(0) || 'L'}
                        </div>
                        <h2 className="text-xl font-bold">{extractedProfile.name || 'Perfil analizado'}</h2>
                        <p className="text-orange-accent font-medium mb-4">{extractedProfile.currentRole || 'Rol no especificado'}</p>
                        <div className="flex items-center justify-center gap-2 text-dark-muted text-sm">
                            <Briefcase size={14} />
                            <span>{extractedProfile.yearsOfExperience || 0} anos de experiencia</span>
                        </div>
                    </div>

                    <div className="card space-y-4">
                        <h3 className="font-bold flex items-center gap-2">
                            <Award className="text-orange-accent" size={18} />
                            Sprint recomendado
                        </h3>
                        <div className="p-4 bg-dark-bg rounded-lg border border-dark-border">
                            <p className="font-bold text-orange-accent mb-1">{recommendation.primarySpecialization || 'Sin recomendacion'}</p>
                            <p className="text-xs text-dark-text leading-relaxed">
                                {recommendation.reasoning || 'Todavia no hay un razonamiento disponible.'}
                            </p>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="font-bold flex items-center gap-2 mb-4">
                            <Award className="text-orange-accent" size={18} />
                            Habilidades ({(extractedProfile.skills || []).length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {(extractedProfile.skills || []).map((skill) => (
                                <span key={skill} className="px-3 py-1 bg-dark-border/50 text-dark-text border border-dark-border rounded-lg text-sm">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="card">
                        <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                            <User className="text-orange-accent" size={24} />
                            Resumen Profesional
                        </h3>
                        <p className="text-dark-text leading-relaxed italic">
                            "{extractedProfile.summary || 'Sin resumen disponible.'}"
                        </p>
                    </div>

                    {subjects.length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                                <GraduationCap className="text-orange-accent" size={24} />
                                Materias del sprint
                            </h3>
                            <div className="grid md:grid-cols-2 gap-3">
                                {subjects.map((subject) => (
                                    <div key={subject} className="p-4 bg-dark-bg/50 rounded-xl border border-dark-border">
                                        <p className="text-sm text-dark-text">{subject}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {recommendedCourses.length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                                <Briefcase className="text-orange-accent" size={24} />
                                Cursos recuperados desde el catalogo
                            </h3>
                            <div className="space-y-4">
                                {recommendedCourses.map((course) => (
                                    <div key={course.id} className="p-4 bg-dark-bg/50 rounded-xl border border-dark-border">
                                        <h4 className="font-bold">{course.title}</h4>
                                        <p className="text-sm text-dark-muted">{course.moduleTitle}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.experience || []).length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                                <Briefcase className="text-orange-accent" size={24} />
                                Experiencia Laboral
                            </h3>
                            <div className="space-y-6">
                                {extractedProfile.experience.map((exp, index) => (
                                    <div key={`${exp.company}-${index}`} className="relative pl-6 border-l-2 border-dark-border pb-6 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 bg-dark-border rounded-full border-2 border-orange-accent"></div>
                                        <h4 className="font-bold text-lg">{exp.title}</h4>
                                        <div className="flex justify-between text-sm text-dark-muted mb-2">
                                            <span>{exp.company}</span>
                                            <span>{exp.duration}</span>
                                        </div>
                                        <p className="text-sm text-dark-text leading-relaxed">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.education || []).length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold flex items-center gap-3 mb-6">
                                <GraduationCap className="text-orange-accent" size={24} />
                                Educacion
                            </h3>
                            <div className="space-y-4">
                                {extractedProfile.education.map((edu, index) => (
                                    <div key={`${edu.institution}-${index}`} className="p-4 bg-dark-bg/50 rounded-xl border border-dark-border">
                                        <h4 className="font-bold">{edu.degree}</h4>
                                        <p className="text-sm text-dark-muted">
                                            {edu.field} {edu.institution ? ` - ${edu.institution}` : ''}
                                        </p>
                                        {edu.year ? <p className="text-xs text-orange-accent/70 mt-1">Graduado en {edu.year}</p> : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {(extractedProfile.languages || []).length > 0 && (
                        <div className="card">
                            <h3 className="font-bold flex items-center gap-2 mb-4">
                                <Languages className="text-orange-accent" size={18} />
                                Idiomas
                            </h3>
                            <div className="flex flex-wrap gap-4">
                                {extractedProfile.languages.map((lang) => (
                                    <div key={lang} className="flex items-center gap-2 px-4 py-2 bg-dark-bg rounded-lg">
                                        <span className="text-sm font-medium">{lang}</span>
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
