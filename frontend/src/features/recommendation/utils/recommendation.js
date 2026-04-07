export const getRecommendation = (analysis) => analysis?.recommendation || null;

// El frontend convive con contratos nuevos (`sprint.blocks`) y legacy (`planBlocks`).
export const getRouteBlocks = (recommendation) =>
    recommendation?.sprint?.blocks || recommendation?.planBlocks || [];

export const getSuggestedSubjects = (recommendation) => recommendation?.subjects || [];

export const buildImprovementTips = ({ recommendation, suggestedSubjects = [], routeBlocks = [] }) => {
    if (!recommendation) {
        return [];
    }

    // Genera mensajes cortos y reutilizables para paneles de apoyo sin duplicar la narracion
    // completa de la recomendacion.
    const tips = [];

    if (recommendation.reasoning) {
        tips.push(recommendation.reasoning);
    }

    if (suggestedSubjects.length) {
        tips.push(`Materias clave: ${suggestedSubjects.slice(0, 3).join(', ')}.`);
    }

    if (routeBlocks.length) {
        tips.push(
            `Sprints principales de la ruta: ${routeBlocks
                .slice(0, 2)
                .map((block) => block.blockTitle || block.title)
                .join(', ')}.`
        );
    }

    return tips.slice(0, 3);
};

const cleanList = (items = [], limit = 5) =>
    [...new Set((Array.isArray(items) ? items : []).map((item) => String(item || '').trim()).filter(Boolean))].slice(0, limit);

const buildFocusAreas = ({ recommendation, suggestedSubjects = [], routeBlocks = [] }) => {
    const routeTitles = routeBlocks
        .map((block) => block?.blockTitle || block?.title || '')
        .filter(Boolean);

    return cleanList([
        recommendation?.primarySpecialization,
        ...suggestedSubjects,
        ...routeTitles,
    ], 3);
};

const buildFallbackStrengths = ({ profile, focusAreas = [] }) =>
    cleanList([
        ...(profile.skills || []).slice(0, 2).map((skill) => `Base en ${skill}`),
        profile.currentRole ? `Experiencia en ${profile.currentRole}` : '',
        profile.industry && profile.industry !== 'No especificada' ? `Conocimiento del sector ${profile.industry}` : '',
        focusAreas[0] ? `Afinidad con ${focusAreas[0]}` : '',
    ]);

const buildFallbackGrowthAreas = ({ recommendation, focusAreas = [] }) =>
    cleanList([
        ...(recommendation?.growthAreas || []),
        'Liderazgo y toma de decisiones',
        'Logros medibles y resultados',
        focusAreas[0] ? `Mayor enfoque estrategico en ${focusAreas[0]}` : 'Enfoque estrategico del perfil',
        'Participacion en proyectos de impacto',
    ]);

const buildFallbackRecommendedChanges = ({ profile, focusAreas = [], currentSkills = [] }) => {
    const focusSummary = focusAreas.length ? focusAreas.join(', ') : 'liderazgo, analitica y gestion';
    const prioritizedSkills = cleanList([...currentSkills, ...focusAreas], 4);

    return [
        {
            title: 'Perfil profesional',
            suggestion: `Orienta la redaccion hacia ${focusSummary} y proyecta una evolucion clara hacia roles de mayor impacto.`,
        },
        {
            title: 'Experiencia laboral',
            suggestion: 'Incluye logros concretos, mejoras implementadas y resultados medibles en cada experiencia relevante.',
        },
        {
            title: 'Skills',
            suggestion: prioritizedSkills.length
                ? `Prioriza primero habilidades alineadas con ${prioritizedSkills.join(', ')}.`
                : 'Ordena primero las habilidades mas alineadas con tecnologia, datos, automatizacion y gestion.',
        },
        {
            title: 'Proyectos',
            suggestion: 'Agrega casos donde hayas resuelto problemas complejos, optimizado procesos o liderado iniciativas con impacto.',
        },
    ];
};

const normalizeRecommendedChanges = (items = []) =>
    (Array.isArray(items) ? items : [])
        .map((item) => {
            if (typeof item === 'string') {
                return { title: item.trim(), suggestion: '' };
            }

            const title = String(item?.title || item?.name || item?.label || '').trim();
            const suggestion = String(item?.suggestion || item?.description || item?.detail || item?.rationale || '').trim();

            if (!title) {
                return null;
            }

            return { title, suggestion };
        })
        .filter(Boolean)
        .slice(0, 5);

export const buildCvImprovementContent = ({
    analysis,
    improvementTips = [],
    recommendation = null,
    routeBlocks = [],
    suggestedSubjects = [],
}) => {
    const resolvedRecommendation = recommendation || analysis?.recommendation || {};
    const profile = analysis?.extractedProfile || {};
    const cvGuidance = resolvedRecommendation?.cvGuidance || resolvedRecommendation?.cvImprovements || {};
    const focusAreas = buildFocusAreas({
        recommendation: resolvedRecommendation,
        suggestedSubjects,
        routeBlocks,
    });

    const strengths = cleanList(
        cvGuidance?.strengths || resolvedRecommendation?.keyStrengths || buildFallbackStrengths({ profile, focusAreas })
    );
    const growthAreas = cleanList(
        cvGuidance?.growthAreas || resolvedRecommendation?.growthAreas || buildFallbackGrowthAreas({ recommendation: resolvedRecommendation, focusAreas })
    );
    const recommendedChanges = normalizeRecommendedChanges(
        cvGuidance?.recommendedChanges || resolvedRecommendation?.recommendedChanges || resolvedRecommendation?.cvChanges
    );

    return {
        strengths,
        growthAreas,
        recommendedChanges: recommendedChanges.length
            ? recommendedChanges
            : buildFallbackRecommendedChanges({
                  profile,
                  focusAreas,
                  currentSkills: profile.skills || [],
              }),
        narrativeTips: cleanList(improvementTips, 3),
    };
};
