const { getSpecializationById } = require('../utils/seed-learning-content');

const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

const extractSearchTerms = (profileQuery = '') =>
    [...new Set(normalizeText(profileQuery).split(/[^a-z0-9]+/).filter((term) => term.length >= 3))];

const scoreModuleAgainstProfile = (module, profileTerms = []) => {
    const specialization = getSpecializationById(module.specialization_id);
    const searchableText = normalizeText([
        module.title,
        module.description,
        ...(module.topics || []),
        ...(specialization?.keywords || []),
    ].join(' '));

    return profileTerms.reduce((score, term) => {
        if (!searchableText.includes(term)) {
            return score;
        }

        return score + (term.length >= 6 ? 2 : 1);
    }, 0);
};

const buildModuleRanking = (matches = []) => {
    const ranking = new Map();

    matches.forEach((match, index) => {
        const score = Math.max(1, matches.length - index) + (match.contentType === 'learning_module' ? 1.5 : 0.75);
        const current = ranking.get(match.moduleId) || {
            moduleId: match.moduleId,
            moduleTitle: match.moduleTitle,
            specializationId: match.specializationId || null,
            score: 0,
            hits: 0,
            topMatch: match,
        };

        current.score += score;
        current.hits += 1;
        if (!current.topMatch || index === 0) {
            current.topMatch = match;
        }

        ranking.set(match.moduleId, current);
    });

    return [...ranking.values()].sort((a, b) => b.score - a.score);
};

module.exports = {
    normalizeText,
    extractSearchTerms,
    scoreModuleAgainstProfile,
    buildModuleRanking,
};
