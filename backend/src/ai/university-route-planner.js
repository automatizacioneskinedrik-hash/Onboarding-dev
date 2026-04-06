const {
    getAllSpecializations,
    getSpecializationById,
    resolveCatalogBlock,
} = require('../utils/seed-learning-content');

const MAX_ROUTE_BLOCKS = 6;

const PRIORITY_BY_MASTER = {
    mtecmba: [
        'tecnologia',
        'analitica-datos',
        'talento',
        'comunicacion',
        'ia-automatizacion',
        'operaciones',
        'mercado-cliente',
        'finanzas',
        'emprendimiento',
    ],
    mintear: [
        'ia-automatizacion',
        'tecnologia',
        'analitica-datos',
        'operaciones',
        'mercado-cliente',
        'comunicacion',
        'talento',
        'emprendimiento',
        'finanzas',
    ],
    'datalar-mba': [
        'analitica-datos',
        'arquitectura-analitica-avanzada',
        'ia-automatizacion',
        'tecnologia',
        'finanzas',
        'operaciones',
        'mercado-cliente',
        'comunicacion',
        'talento',
        'emprendimiento',
    ],
};

const normalizeText = (value = '') =>
    String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

const tokenize = (value = '') =>
    normalizeText(value)
        .split(/[^a-z0-9]+/i)
        .filter(Boolean);

const buildProfileText = (profile = {}) =>
    [
        profile.currentRole,
        profile.industry,
        profile.summary,
        ...(profile.skills || []),
        ...(profile.languages || []),
        ...(profile.certifications || []),
        ...(profile.experience || []).flatMap((item) => [item.title, item.company, item.description]),
    ]
        .filter(Boolean)
        .join(' ');

const scoreSpecialization = ({ profileText, profileTokens, specialization }) => {
    let score = 0;

    for (const keyword of specialization.keywords || []) {
        if (profileText.includes(normalizeText(keyword))) {
            score += 6;
        }
    }

    for (const block of specialization.blocks || []) {
        const overlap = tokenize(block.title).filter((token) => profileTokens.has(token)).length;
        score += overlap * 2;
    }

    return score;
};

const scoreBlock = ({ profileText, profileTokens, specializationScore, block }) => {
    const titleTokens = tokenize(block.title);
    const overlap = titleTokens.filter((token) => profileTokens.has(token)).length;
    const phraseBoost = profileText.includes(normalizeText(block.title)) ? 8 : 0;

    return specializationScore * 10 + overlap * 5 + phraseBoost - (block.order || 0) * 0.05;
};

const buildBlockReason = ({ block, specialization, profile }) => {
    const topSkills = (profile.skills || []).slice(0, 2).join(', ');
    const role = profile.currentRole || 'tu perfil actual';

    if (topSkills) {
        return `Este sprint de ${specialization.name} refuerza ${role} y potencia habilidades como ${topSkills}.`;
    }

    return `Este sprint de ${specialization.name} complementa ${role} con una perspectiva aplicada a tu desarrollo ejecutivo.`;
};

const buildFallbackCandidates = ({ profile, masterId }) => {
    const specializations = getAllSpecializations(masterId);
    const profileText = normalizeText(buildProfileText(profile));
    const profileTokens = new Set(tokenize(profileText));
    const masterPriority = PRIORITY_BY_MASTER[masterId] || PRIORITY_BY_MASTER.mtecmba;

    return specializations
        .map((specialization) => {
            const specializationScore = scoreSpecialization({
                profileText,
                profileTokens,
                specialization,
            });
            const bestBlock = [...specialization.blocks]
                .map((block) => ({
                    ...block,
                    score: scoreBlock({
                        profileText,
                        profileTokens,
                        specializationScore,
                        block,
                    }),
                }))
                .sort((left, right) => right.score - left.score)[0];

            return {
                specialization,
                specializationScore,
                block: bestBlock,
                score: bestBlock?.score || specializationScore,
            };
        })
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            const leftPriority = masterPriority.indexOf(left.specialization.id);
            const rightPriority = masterPriority.indexOf(right.specialization.id);
            const leftWeight = leftPriority === -1 ? Number.MAX_SAFE_INTEGER : leftPriority;
            const rightWeight = rightPriority === -1 ? Number.MAX_SAFE_INTEGER : rightPriority;

            return leftWeight - rightWeight;
        });
};

const normalizePlanBlock = ({ rawBlock, masterId, profile }) => {
    const resolvedBlock = resolveCatalogBlock({
        masterId,
        specializationId: rawBlock?.specializationId || rawBlock?.specialization?.id || null,
        blockId: rawBlock?.blockId || rawBlock?.id || null,
        title: rawBlock?.blockTitle || rawBlock?.title || rawBlock?.courseTitle || rawBlock?.name || null,
    });

    if (!resolvedBlock) {
        return null;
    }

    const specialization = getSpecializationById(resolvedBlock.specializationId, masterId);
    if (!specialization) {
        return null;
    }

    return {
        id: resolvedBlock.id,
        blockId: resolvedBlock.id,
        title: resolvedBlock.title,
        blockTitle: resolvedBlock.title,
        specializationId: specialization.id,
        specializationName: specialization.name,
        order: rawBlock?.order || resolvedBlock.order || null,
        rationale: rawBlock?.rationale || rawBlock?.reason || buildBlockReason({ block: resolvedBlock, specialization, profile }),
        sprintUrl: specialization.sprintUrl,
    };
};

const mergePlanBlocks = ({ aiBlocks = [], fallbackCandidates = [], masterId, profile }) => {
    const bySpecialization = new Map();

    for (const rawBlock of aiBlocks) {
        const normalizedBlock = normalizePlanBlock({ rawBlock, masterId, profile });

        if (!normalizedBlock || bySpecialization.has(normalizedBlock.specializationId)) {
            continue;
        }

        bySpecialization.set(normalizedBlock.specializationId, normalizedBlock);
    }

    for (const candidate of fallbackCandidates) {
        if (bySpecialization.size >= MAX_ROUTE_BLOCKS) {
            break;
        }

        if (!candidate?.specialization || !candidate?.block) {
            continue;
        }

        if (bySpecialization.has(candidate.specialization.id)) {
            continue;
        }

        bySpecialization.set(candidate.specialization.id, {
            id: candidate.block.id,
            blockId: candidate.block.id,
            title: candidate.block.title,
            blockTitle: candidate.block.title,
            specializationId: candidate.specialization.id,
            specializationName: candidate.specialization.name,
            order: bySpecialization.size + 1,
            rationale: buildBlockReason({
                block: candidate.block,
                specialization: candidate.specialization,
                profile,
            }),
            sprintUrl: candidate.specialization.sprintUrl,
        });
    }

    return [...bySpecialization.values()].slice(0, MAX_ROUTE_BLOCKS).map((block, index) => ({
        ...block,
        order: index + 1,
    }));
};

const buildRecommendedCoursesFromPlan = (planBlocks = []) =>
    planBlocks.map((block) => ({
        id: block.blockId,
        title: block.blockTitle,
        contentType: 'academic_block',
        moduleId: block.specializationId,
        specializationId: block.specializationId,
        specializationName: block.specializationName,
        moduleTitle: block.specializationName,
        order: block.order,
        rationale: block.rationale,
    }));

const buildReasoning = ({ aiReasoning, primarySpecialization, planBlocks }) => {
    if (aiReasoning) {
        return aiReasoning;
    }

    const visibleBlocks = planBlocks.slice(0, 3).map((block) => block.blockTitle).join(', ');
    return `Se recomienda una ruta personalizada de 6 sprints con foco principal en ${primarySpecialization.name}. La seleccion combina especializaciones del MBA para fortalecer tu perfil con un plan equilibrado y accionable. Los primeros sprints destacados son ${visibleBlocks}.`;
};

const resolveUniversityRecommendation = ({ profile, masterId, aiRecommendation = {} }) => {
    const fallbackCandidates = buildFallbackCandidates({ profile, masterId });
    const aiBlocks = aiRecommendation.planBlocks || aiRecommendation.routeBlocks || aiRecommendation.blocks || [];
    const planBlocks = mergePlanBlocks({
        aiBlocks,
        fallbackCandidates,
        masterId,
        profile,
    });

    const primarySpecialization =
        getSpecializationById(planBlocks[0]?.specializationId, masterId) ||
        getSpecializationById(aiRecommendation.primarySpecializationId, masterId) ||
        fallbackCandidates[0]?.specialization ||
        getAllSpecializations(masterId)[0];
    const secondarySpecializations = planBlocks
        .slice(1)
        .map((block) => block.specializationId)
        .filter((specializationId, index, items) => specializationId && items.indexOf(specializationId) === index);

    const matchScore = Number(aiRecommendation.matchScore) || Math.max(75, 96 - planBlocks.length);
    const recommendedCourses = buildRecommendedCoursesFromPlan(planBlocks);

    return {
        primarySpecialization: primarySpecialization?.name || 'RUTA PERSONALIZADA',
        primarySpecializationId: primarySpecialization?.id || null,
        secondarySpecializations,
        matchScore,
        reasoning: buildReasoning({
            aiReasoning: aiRecommendation.reasoning,
            primarySpecialization,
            planBlocks,
        }),
        keyStrengths: (aiRecommendation.keyStrengths || profile.skills || []).slice(0, 4),
        growthAreas: (aiRecommendation.growthAreas || []).slice(0, 3),
        specialization: primarySpecialization || null,
        subjects: planBlocks.map((block) => block.blockTitle),
        sprintUrl: primarySpecialization?.sprintUrl || '#',
        recommendedCourses,
        planBlocks,
        sprint: {
            id: 'ruta-personalizada',
            title: 'Ruta personalizada de 6 sprints',
            url: primarySpecialization?.sprintUrl || '#',
            blocks: planBlocks,
            courses: planBlocks,
            totalBlocks: planBlocks.length,
            totalCourses: planBlocks.length,
        },
    };
};

module.exports = {
    MAX_ROUTE_BLOCKS,
    buildFallbackCandidates,
    resolveUniversityRecommendation,
};
