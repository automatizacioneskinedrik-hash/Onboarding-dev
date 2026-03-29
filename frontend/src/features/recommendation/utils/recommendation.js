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
