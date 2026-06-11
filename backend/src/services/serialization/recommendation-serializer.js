const MAX_SPRINT_COURSES = 6;

const normalizeSubjects = (subjects = []) =>
    [...new Set((Array.isArray(subjects) ? subjects : []).map((item) => String(item || '').trim()).filter(Boolean))]
        .slice(0, MAX_SPRINT_COURSES);

const normalizePlanBlocks = (blocks = []) =>
    (Array.isArray(blocks) ? blocks : [])
        .map((block, index) => {
            if (typeof block === 'string') {
                const title = block.trim();

                if (!title) {
                    return null;
                }

                return {
                    id: `route-block-${index + 1}`,
                    blockId: `route-block-${index + 1}`,
                    title,
                    blockTitle: title,
                    specializationId: null,
                    specializationName: null,
                    order: index + 1,
                    rationale: null,
                };
            }

            const title = String(
                block?.blockTitle || block?.title || block?.courseTitle || block?.name || ''
            ).trim();

            if (!title) {
                return null;
            }

            return {
                id: block.id || block.blockId || `route-block-${index + 1}`,
                blockId: block.blockId || block.id || `route-block-${index + 1}`,
                title,
                blockTitle: title,
                specializationId: block.specializationId || null,
                specializationName: block.specializationName || block.moduleTitle || null,
                order: block.order || index + 1,
                rationale: block.rationale || block.reason || null,
            };
        })
        .filter(Boolean)
        .slice(0, MAX_SPRINT_COURSES);

const normalizeSprintCourses = ({ courses = [], sprintId = null } = {}) =>
    (Array.isArray(courses) ? courses : [])
        .map((course, index) => {
            if (typeof course === 'string') {
                const title = course.trim();
                if (!title) {
                    return null;
                }

                return {
                    id: `${sprintId || 'sprint'}-course-${index + 1}`,
                    title,
                    order: index + 1,
                };
            }

            const title = String(course?.title || course?.name || '').trim();
            if (!title) {
                return null;
            }

            return {
                ...course,
                id: course.id || `${sprintId || 'sprint'}-course-${index + 1}`,
                title,
                order: course.order || index + 1,
            };
        })
        .filter(Boolean)
        .slice(0, MAX_SPRINT_COURSES);

const buildSprint = ({
    recommendation = {},
    specialization = null,
    primarySpecialization = null,
    primarySpecializationId = null,
    subjects = [],
    planBlocks = [],
    sprintUrl = null,
}) => {
    const providedSprint = recommendation.sprint || null;
    const sprintId = providedSprint?.id || primarySpecializationId || specialization?.id || null;
    const rawBlocks =
        Array.isArray(providedSprint?.blocks) && providedSprint.blocks.length
            ? providedSprint.blocks
            : planBlocks.length
              ? planBlocks
              : subjects;
    const blocks = normalizePlanBlocks(rawBlocks);
    const rawCourses =
        Array.isArray(providedSprint?.courses) && providedSprint.courses.length ? providedSprint.courses : blocks.length ? blocks : subjects;
    const courses = normalizeSprintCourses({ courses: rawCourses, sprintId });

    return {
        id: providedSprint?.id || 'ruta-personalizada',
        title:
            providedSprint?.title ||
            recommendation.sprintTitle ||
            'Ruta personalizada de 6 sprints',
        url: providedSprint?.url || providedSprint?.sprintUrl || providedSprint?.springUrl || sprintUrl,
        blocks,
        courses,
        totalBlocks: blocks.length,
        totalCourses: courses.length,
    };
};

const normalizeRecommendation = (recommendation = {}) => {
    const primarySpecialization = recommendation.primarySpecialization || recommendation.specialization?.name || null;
    const primarySpecializationId =
        recommendation.primarySpecializationId || recommendation.specialization?.id || null;
    const planBlocks = normalizePlanBlocks(
        recommendation.planBlocks ||
            recommendation.routeBlocks ||
            recommendation.sprint?.blocks ||
            recommendation.sprint?.courses ||
            []
    );
    const subjects = normalizeSubjects(
        planBlocks.length
            ? planBlocks.map((block) => block.blockTitle)
            : recommendation.subjects || recommendation.specialization?.subjects || []
    );
    const sprintUrl =
        recommendation.sprintUrl || recommendation.springUrl || recommendation.specialization?.sprintUrl || '#';
    const specialization = recommendation.specialization
        ? {
              ...recommendation.specialization,
              id: recommendation.specialization.id || primarySpecializationId,
              name: recommendation.specialization.name || primarySpecialization,
              subjects: normalizeSubjects(recommendation.specialization.subjects || subjects),
              sprintUrl:
                  recommendation.specialization.sprintUrl ||
                  recommendation.specialization.springUrl ||
                  sprintUrl,
          }
        : null;

    return {
        primarySpecialization,
        primarySpecializationId,
        secondarySpecializations: recommendation.secondarySpecializations || [],
        matchScore: recommendation.matchScore || 0,
        reasoning: recommendation.reasoning || null,
        subjects,
        sprintUrl,
        recommendedCourses:
            recommendation.recommendedCourses && recommendation.recommendedCourses.length
                ? recommendation.recommendedCourses
                : planBlocks.map((block) => ({
                      id: block.blockId,
                      title: block.blockTitle,
                      contentType: 'academic_block',
                      moduleId: block.specializationId,
                      specializationId: block.specializationId,
                      specializationName: block.specializationName,
                      moduleTitle: block.specializationName,
                      order: block.order,
                      rationale: block.rationale,
                  })),
        specialization,
        planBlocks,
        sprint: buildSprint({
            recommendation,
            specialization,
            primarySpecialization,
            primarySpecializationId,
            subjects,
            planBlocks,
            sprintUrl,
        }),
    };
};

const serializeStoredRecommendation = (recommendation = {}) => {
    const normalized = normalizeRecommendation(recommendation);

    return {
        primarySpecialization: normalized.primarySpecialization,
        primarySpecializationId: normalized.primarySpecializationId,
        secondarySpecializations: normalized.secondarySpecializations,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning || 'No se pudo generar un razonamiento detallado.',
        subjects: normalized.subjects,
        planBlocks: normalized.planBlocks,
        sprintUrl: normalized.sprintUrl,
        springUrl: normalized.sprintUrl,
        sprint: normalized.sprint,
        recommendedCourses: normalized.recommendedCourses,
    };
};

const serializeRecommendationPayload = (recommendation = {}) => {
    const normalized = normalizeRecommendation(recommendation);

    return {
        specialization: normalized.specialization,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning,
        subjects: normalized.subjects,
        planBlocks: normalized.planBlocks,
        sprint: normalized.sprint,
        sprintUrl: normalized.sprintUrl,
        springUrl: normalized.sprintUrl,
        secondarySpecializations: normalized.secondarySpecializations,
        recommendedCourses: normalized.recommendedCourses,
    };
};

const serializeRecommendationSummary = (recommendation = {}, fallbackSpecialization = null) => {
    const normalized = normalizeRecommendation(recommendation);
    const specialization = normalized.specialization
        ? normalized.specialization
        : fallbackSpecialization
          ? {
                ...fallbackSpecialization,
                subjects: normalizeSubjects(fallbackSpecialization.subjects || normalized.subjects),
                sprintUrl: fallbackSpecialization.sprintUrl || fallbackSpecialization.springUrl || normalized.sprintUrl,
            }
          : null;
    const subjects = normalized.subjects.length ? normalized.subjects : specialization?.subjects || [];
    const sprintUrl = normalized.sprintUrl || specialization?.sprintUrl || specialization?.springUrl || '#';

    return {
        specialization,
        matchScore: normalized.matchScore,
        reasoning: normalized.reasoning,
        subjects,
        planBlocks: normalized.planBlocks,
        sprint: buildSprint({
            recommendation,
            specialization,
            primarySpecialization: normalized.primarySpecialization,
            primarySpecializationId: normalized.primarySpecializationId,
            subjects,
            planBlocks: normalized.planBlocks,
            sprintUrl,
        }),
        sprintUrl,
        springUrl: sprintUrl,
        secondarySpecializations: normalized.secondarySpecializations,
        recommendedCourses: normalized.recommendedCourses,
    };
};

module.exports = {
    normalizeRecommendation,
    serializeStoredRecommendation,
    serializeRecommendationPayload,
    serializeRecommendationSummary,
};
