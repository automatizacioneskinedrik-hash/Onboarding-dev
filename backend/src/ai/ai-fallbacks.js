const {
    SPECIALIZATIONS,
    getSpecializationById,
    getSpecializationIdByModuleId,
} = require('../utils/specializations');

const FALLBACK_SKILL_KEYWORDS = {
    'analitica-datos': ['data', 'datos', 'sql', 'python', 'power bi', 'tableau', 'analytics', 'analitica'],
    tecnologia: ['software', 'developer', 'ingeniero', 'tecnologia', 'digital', 'arquitectura'],
    'ia-automatizacion': ['ia', 'inteligencia artificial', 'machine learning', 'automatizacion', 'automation', 'ml'],
    finanzas: ['finanzas', 'finance', 'contabilidad', 'tesoreria', 'inversion'],
    talento: ['rrhh', 'recursos humanos', 'people', 'talento', 'reclutamiento', 'liderazgo'],
    emprendimiento: ['startup', 'emprendimiento', 'negocio', 'ventas', 'founder'],
    'mercado-cliente': ['marketing', 'cliente', 'brand', 'growth', 'producto'],
    operaciones: ['operaciones', 'logistica', 'supply chain', 'procesos'],
    comunicacion: ['comunicacion', 'comms', 'relaciones publicas', 'presentaciones'],
};

const resolveSpecializationIdFromMatch = (item) =>
    item?.specializationId || getSpecializationIdByModuleId(item?.moduleId);

const pickFallbackSpecialization = (profile = {}) => {
    const haystack = [
        profile.currentRole,
        profile.industry,
        profile.summary,
        ...(profile.skills || []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

    let bestId = 'analitica-datos';
    let bestScore = -1;

    Object.entries(FALLBACK_SKILL_KEYWORDS).forEach(([id, words]) => {
        const score = words.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
        if (score > bestScore) {
            bestScore = score;
            bestId = id;
        }
    });

    return Object.values(SPECIALIZATIONS).find((item) => item.id === bestId) || Object.values(SPECIALIZATIONS)[0];
};

const buildFallbackProfile = (cvText = '') => {
    const lines = cvText
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
    const firstLine = lines[0] || '';
    const guessedName = firstLine.length > 2 && firstLine.length < 80 ? firstLine : 'Candidato';
    const yearsMatch = cvText.match(/(\d{1,2})\s*(anos|years|a\w+os)/i);

    const skills = ['Comunicacion', 'Trabajo en equipo', 'Resolucion de problemas'];
    const skillHints = ['sql', 'python', 'excel', 'power bi', 'marketing', 'finanzas', 'liderazgo'];
    const lower = cvText.toLowerCase();
    skillHints.forEach((hint) => {
        if (lower.includes(hint)) {
            skills.push(hint.toUpperCase());
        }
    });

    return {
        name: guessedName,
        currentRole: 'Profesional',
        yearsOfExperience: yearsMatch ? parseInt(yearsMatch[1], 10) : 3,
        industry: 'No especificada',
        skills: Array.from(new Set(skills)).slice(0, 8),
        education: [],
        experience: [],
        languages: [],
        certifications: [],
        summary: 'Perfil profesional generado en modo de respaldo por indisponibilidad temporal de IA.',
    };
};

const buildRetrievedCatalogContext = (retrieval) => {
    if (!retrieval?.matches?.length) {
        return 'No hubo resultados recuperados del catalogo.';
    }

    return retrieval.matches
        .slice(0, 5)
        .map((match, index) => {
            const lines = [
                `Resultado ${index + 1}`,
                `Tipo: ${match.contentType}`,
                `Titulo: ${match.title}`,
                `Modulo: ${match.moduleTitle}`,
                `Distancia: ${match.distance ?? 'n/a'}`,
            ];

            if (match.description) {
                lines.push(`Descripcion: ${match.description}`);
            }

            if (match.topics?.length) {
                lines.push(`Topics: ${match.topics.join(', ')}`);
            }

            return lines.join('\n');
        })
        .join('\n\n');
};

const buildRecommendationFromRetrievalFallback = (profile, retrieval) => {
    const preferredModule = retrieval?.moduleRanking?.[0];
    const preferredSpecializationId =
        resolveSpecializationIdFromMatch(preferredModule) || pickFallbackSpecialization(profile).id;
    const specialization = getSpecializationById(preferredSpecializationId) || pickFallbackSpecialization(profile);
    const secondarySpecializations = (retrieval?.moduleRanking || [])
        .slice(1, 3)
        .map((item) => resolveSpecializationIdFromMatch(item))
        .filter(Boolean)
        .filter((id, index, array) => id !== preferredSpecializationId && array.indexOf(id) === index);

    const recommendedCourses = (retrieval?.matches || []).slice(0, 3).map((match) => ({
        id: match.id,
        title: match.title,
        contentType: match.contentType,
        moduleId: match.moduleId,
        specializationId: match.specializationId || null,
        moduleTitle: match.moduleTitle,
        distance: match.distance,
    }));

    return {
        primarySpecialization: specialization.name,
        primarySpecializationId: specialization.id,
        secondarySpecializations,
        matchScore: preferredModule ? 88 : 78,
        reasoning: preferredModule
            ? `Se recomienda ${specialization.name} porque tu perfil se alinea con el modulo ${preferredModule.moduleTitle} y con los temas recuperados del catalogo que mejor potencian tu trayectoria actual.`
            : `Se recomienda ${specialization.name} con base en las senales detectadas en tu perfil.`,
        keyStrengths: (profile.skills || []).slice(0, 3),
        growthAreas: ['Profundizacion tecnica', 'Aplicacion estrategica'],
        specialization,
        subjects: specialization.subjects,
        sprintUrl: specialization.sprintUrl,
        recommendedCourses,
    };
};

const buildChatResponseFallback = (messages, recommendation = null, retrieval = null) => {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content || '';
    const topCourse = retrieval?.matches?.[0];

    if (topCourse) {
        return `Con base en tu pregunta, el resultado mas relevante es ${topCourse.title}, dentro del modulo ${topCourse.moduleTitle}. Si quieres, te explico por que encaja contigo y que aprenderias alli.`;
    }

    if (!recommendation) {
        return `Recibido. Ya tengo tu mensaje: "${lastUserMessage}". Para darte una ruta personalizada, adjunta tu hoja de vida en PDF y continuare con el analisis.`;
    }

    return `Gracias por tu mensaje. Con base en tu perfil, tu ruta academica actual combina bloques con foco principal en ${recommendation.primarySpecialization || recommendation.specialization?.name}. Si quieres, te explico por que se eligieron esos 6 bloques y como aplicarlos en tu trabajo.`;
};

module.exports = {
    resolveSpecializationIdFromMatch,
    pickFallbackSpecialization,
    buildFallbackProfile,
    buildRetrievedCatalogContext,
    buildRecommendationFromRetrievalFallback,
    buildChatResponseFallback,
};
