export const getRecommendation = (analysis) => analysis?.recommendation || null;

export const getRouteBlocks = (recommendation) =>
    recommendation?.sprint?.blocks || recommendation?.planBlocks || [];

export const getSuggestedSubjects = (recommendation) => recommendation?.subjects || [];

export const buildImprovementTips = ({ recommendation, suggestedSubjects = [], routeBlocks = [] }) => {
    if (!recommendation) {
        return [];
    }

    const tips = [];

    if (recommendation.reasoning) {
        tips.push(recommendation.reasoning);
    }

    if (suggestedSubjects.length) {
        tips.push(`Materias clave: ${suggestedSubjects.slice(0, 3).join(', ')}.`);
    }

    if (routeBlocks.length) {
        tips.push(
            `Bloques principales de la ruta: ${routeBlocks
                .slice(0, 2)
                .map((block) => block.blockTitle || block.title)
                .join(', ')}.`
        );
    }

    return tips.slice(0, 3);
};
