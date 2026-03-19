const USER_REPOSITORY_METHODS = ['findByEmail', 'findById', 'create', 'update', 'verifyPassword', 'safe'];
const CHAT_REPOSITORY_METHODS = ['findByUserId', 'findById', 'findByIdAndUser', 'create', 'addMessage', 'update', 'softDelete'];
const ANALYSIS_REPOSITORY_METHODS = ['findByUserId', 'findLatestCompleted', 'findById', 'create', 'update'];
const STATS_REPOSITORY_METHODS = ['chatCountByUser', 'analysisCountByUser'];

module.exports = {
    USER_REPOSITORY_METHODS,
    CHAT_REPOSITORY_METHODS,
    ANALYSIS_REPOSITORY_METHODS,
    STATS_REPOSITORY_METHODS,
};
