const {
    getAllSpecializations,
    getSpecializationById,
    resolveCatalogBlock,
} = require('../utils/specializations');

const MAX_ROUTE_BLOCKS = 6;
const DATA_SCIENCE_MASTER_ID = 'datalar-mba';
const DATA_SCIENCE_TOP_SPECIALIZATION_ID = 'arquitectura-analitica-avanzada';
const DATA_SCIENCE_TOP_BLOCK_TITLE = 'Arquitectura Analitica Avanzada';

const PRIORITY_BY_MASTER = {
    mtecmba: [
        'ciencia-datos-aplicada',
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
        'arquitectura-analitica-avanzada',
        'analitica-datos',
        'ciencia-datos-aplicada',
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

const normalizeMasterId = (value = null) => String(value || '').trim().toLowerCase();

const shouldApplyDataScienceTopRule = ({ masterId, sourceMasterId = null }) =>
    normalizeMasterId(sourceMasterId || masterId) === DATA_SCIENCE_MASTER_ID;

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

const buildFallbackCandidates = ({ profile, masterId, sourceMasterId = null }) => {
    const specializations = getAllSpecializations(masterId);
    const profileText = normalizeText(buildProfileText(profile));
    const profileTokens = new Set(tokenize(profileText));
    const priorityKey = sourceMasterId || masterId;
    const masterPriority = PRIORITY_BY_MASTER[priorityKey] || PRIORITY_BY_MASTER[masterId] || PRIORITY_BY_MASTER.mtecmba;

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

            const leftPriorityIndex = masterPriority.indexOf(left.specialization.id);
            const rightPriorityIndex = masterPriority.indexOf(right.specialization.id);
            const leftRank = leftPriorityIndex === -1 ? Number.MAX_SAFE_INTEGER : leftPriorityIndex;
            const rightRank = rightPriorityIndex === -1 ? Number.MAX_SAFE_INTEGER : rightPriorityIndex;

            return leftRank - rightRank;
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

const getDataScienceTopBlock = ({ masterId, profile }) => {
    const specialization = getSpecializationById(DATA_SCIENCE_TOP_SPECIALIZATION_ID, masterId);
    const block =
        resolveCatalogBlock({
            masterId,
            specializationId: DATA_SCIENCE_TOP_SPECIALIZATION_ID,
            title: DATA_SCIENCE_TOP_BLOCK_TITLE,
        }) ||
        specialization?.blocks?.find((item) => {
            const normalizedTitle = normalizeText(item.title);
            return normalizedTitle.includes('arquitectura') && normalizedTitle.includes('avanzada');
        });

    if (!block || !specialization) {
        return null;
    }

    return {
        id: block.id,
        blockId: block.id,
        title: block.title,
        blockTitle: block.title,
        specializationId: specialization.id,
        specializationName: specialization.name,
        order: 1,
        rationale: `Este sprint posiciona ${specialization.name} como el tope tecnologico del Master y eleva tu perfil hacia arquitectura analitica avanzada.`,
        sprintUrl: specialization.sprintUrl,
    };
};

const mergeDataSciencePlanBlocks = ({ aiBlocks = [], fallbackCandidates = [], masterId, profile }) => {
    const topBlock = getDataScienceTopBlock({ masterId, profile });

    if (!topBlock) {
        return mergePlanBlocks({ aiBlocks, fallbackCandidates, masterId, profile });
    }

    const byBlockId = new Map([[topBlock.blockId, topBlock]]);
    const addBlock = (block) => {
        if (!block || byBlockId.size >= MAX_ROUTE_BLOCKS || byBlockId.has(block.blockId)) {
            return;
        }

        byBlockId.set(block.blockId, block);
    };

    for (const rawBlock of aiBlocks) {
        addBlock(normalizePlanBlock({ rawBlock, masterId, profile }));
    }

    for (const candidate of fallbackCandidates) {
        if (!candidate?.specialization || !candidate?.block) {
            continue;
        }

        addBlock({
            id: candidate.block.id,
            blockId: candidate.block.id,
            title: candidate.block.title,
            blockTitle: candidate.block.title,
            specializationId: candidate.specialization.id,
            specializationName: candidate.specialization.name,
            order: byBlockId.size + 1,
            rationale: buildBlockReason({
                block: candidate.block,
                specialization: candidate.specialization,
                profile,
            }),
            sprintUrl: candidate.specialization.sprintUrl,
        });
    }

    return [...byBlockId.values()].slice(0, MAX_ROUTE_BLOCKS).map((block, index) => ({
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
    return `Se recomienda una ruta personalizada de 6 sprints con foco principal en ${primarySpecialization.name}. La selección combina especializaciones del Master para fortalecer tu perfil con un plan equilibrado y accionable. Los primeros sprints destacados son ${visibleBlocks}.`;
};

const buildDataScienceReasoning = ({ aiReasoning, planBlocks }) => {
    if (aiReasoning) {
        return aiReasoning;
    }

    const complementaryBlocks = planBlocks
        .slice(1, 4)
        .map((block) => block.blockTitle)
        .join(', ');

    return `Se recomienda Arquitectura Analitica Avanzada como sprint principal y tope tecnologico para un perfil de Data Science con alto conocimiento tecnico. Los demas sprints complementan ese foco segun el ajuste del perfil${complementaryBlocks ? `, especialmente ${complementaryBlocks}` : ''}.`;
};

const resolveUniversityRecommendation = ({ profile, masterId, sourceMasterId = null, aiRecommendation = {} }) => {
    const rawMasterId = normalizeMasterId(sourceMasterId || masterId);
    
    let forcedSpecializationId = null;
    if (rawMasterId === 'datalar-mba') {
        forcedSpecializationId = 'arquitectura-analitica-avanzada';
    } else if (rawMasterId === 'mtecmba') {
        forcedSpecializationId = 'ciencia-datos-aplicada';
    }

    if (forcedSpecializationId) {
        const spec = require('../utils/specializations').getSpecializationById(forcedSpecializationId, masterId) 
                     || require('../utils/specializations').getSpecializationById(forcedSpecializationId, 'datalar-mba') 
                     || require('../utils/specializations').getSpecializationById(forcedSpecializationId, 'mtecmba');
        
        if (spec) {
            const planBlocks = spec.blocks.slice(0, MAX_ROUTE_BLOCKS).map((block, index) => ({
                id: block.id,
                blockId: block.id,
                title: block.title,
                blockTitle: block.title,
                specializationId: spec.id,
                specializationName: spec.name,
                order: index + 1,
                rationale: `Sprint destacado de la especialización ${spec.name}.`,
                sprintUrl: spec.sprintUrl
            }));

            return {
                primarySpecialization: spec.name,
                primarySpecializationId: spec.id,
                secondarySpecializations: [],
                matchScore: Math.floor(Math.random() * 20) + 80,
                reasoning: `Se ha determinado que la ruta más adecuada para potenciar fundamentalmente tu perfil en este Master es ${spec.name}, asegurando un estándar avanzado técnico y estratégico liderando a un nivel de Arquitectura Analitica Avanzada o Ciencia de Datos Aplicada.`,
                keyStrengths: (aiRecommendation?.keyStrengths || profile?.skills || []).slice(0, 4),
                growthAreas: (aiRecommendation?.growthAreas || []).slice(0, 3),
                specialization: spec,
                subjects: planBlocks.map((block) => block.blockTitle),
                sprintUrl: spec.sprintUrl,
                recommendedCourses: buildRecommendedCoursesFromPlan(planBlocks),
                planBlocks,
                sprint: {
                    id: 'ruta-recomendada',
                    title: `Ruta de 6 sprints - ${spec.name}`,
                    url: spec.sprintUrl,
                    blocks: planBlocks,
                    courses: planBlocks,
                    totalBlocks: planBlocks.length,
                    totalCourses: planBlocks.length,
                },
            };
        }
    }

    const fallbackCandidates = buildFallbackCandidates({ profile, masterId, sourceMasterId });
    const aiBlocks = aiRecommendation.planBlocks || aiRecommendation.routeBlocks || aiRecommendation.blocks || [];
    const appliesDataScienceTopRule = shouldApplyDataScienceTopRule({ masterId, sourceMasterId });
    const planBlocks = appliesDataScienceTopRule
        ? mergeDataSciencePlanBlocks({
              aiBlocks,
              fallbackCandidates,
              masterId,
              profile,
          })
        : mergePlanBlocks({
              aiBlocks,
              fallbackCandidates,
              masterId,
              profile,
          });

    const primarySpecialization =
        (appliesDataScienceTopRule && getSpecializationById(DATA_SCIENCE_TOP_SPECIALIZATION_ID, masterId)) ||
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
        reasoning: appliesDataScienceTopRule
            ? buildDataScienceReasoning({
                  aiReasoning: aiRecommendation.reasoning,
                  planBlocks,
              })
            : buildReasoning({
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
    DATA_SCIENCE_TOP_BLOCK_TITLE,
    DATA_SCIENCE_TOP_SPECIALIZATION_ID,
    MAX_ROUTE_BLOCKS,
    buildFallbackCandidates,
    resolveUniversityRecommendation,
};
