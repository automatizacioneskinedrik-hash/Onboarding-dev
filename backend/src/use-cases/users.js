const { AppError } = require('../services/errors/app-error');
const { buildUserJourneyUpdate } = require('../services/users/user-journey.service');
const { learningModules, topics } = require('../utils/seed-learning-content');

const createUserUseCases = ({ userRepo, statsRepo, masterRepo, catalogRepo }) => {
    const getUserProfile = async ({ userId }) => {
        const user = await userRepo.findById(userId);
        const chatCount = await statsRepo.chatCountByUser(userId);
        const analysisCount = await statsRepo.analysisCountByUser(userId);

        return { user, chatCount, analysisCount };
    };

    const deactivateUserAccount = async ({ userId }) => userRepo.update(userId, { isActive: false });

    const listMasters = async () => masterRepo.getAll();

    const listMasterModules = async ({ masterId }) => {
        const master = masterRepo.getById(masterId);

        if (!master) {
            throw new AppError('Master no valido.', 400);
        }

        let modules = [];

        if (catalogRepo?.readMasterModulesByMasterId) {
            modules = await catalogRepo.readMasterModulesByMasterId(masterId);
        }

        if (!modules.length) {
            modules = learningModules
                .filter((module) => module.master_id === masterId && module.catalog_type === 'master')
                .sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        const normalizedModules = await Promise.all(
            modules.map(async (module) => {
                let moduleTopics = [];

                if (catalogRepo?.readTopicsByModuleId) {
                    moduleTopics = await catalogRepo.readTopicsByModuleId(module.id);
                }

                if (!moduleTopics.length) {
                    moduleTopics = topics.filter((topic) => topic.module_id === module.id);
                }

                const normalizedTopics = moduleTopics
                    .map((topic) => topic.title)
                    .filter(Boolean);

                return {
                    id: module.id,
                    masterId: module.master_id || masterId,
                    title: module.title,
                    description: module.description || '',
                    order: module.order || null,
                    difficulty: module.difficulty || null,
                    estimatedHours: module.estimated_hours || null,
                    topics: normalizedTopics,
                    topicsCount: normalizedTopics.length,
                };
            })
        );

        return {
            master,
            modules: normalizedModules,
        };
    };

    const selectUserMaster = async ({ userId, masterId }) => {
        const master = masterRepo.getById(masterId);

        if (!master) {
            throw new AppError('Master no valido.', 400);
        }

        const currentUser = await userRepo.findById(userId);
        const now = new Date().toISOString();
        const user = await userRepo.update(
            userId,
            buildUserJourneyUpdate({
                user: currentUser,
                userFields: {
                    selectedMasterId: master.id,
                    cvAnalysisId: null,
                    recommendedSpecialization: null,
                },
                journeyFields: {
                    lastActivityAt: now,
                },
            })
        );
        return { user, master };
    };

    return {
        getUserProfile,
        deactivateUserAccount,
        listMasters,
        listMasterModules,
        selectUserMaster,
    };
};

module.exports = {
    createUserUseCases,
};
