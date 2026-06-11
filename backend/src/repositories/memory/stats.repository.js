const chats = require('./chats.repository');
const analyses = require('./analyses.repository');

const stats = {
    chatCountByUser: (userId) =>
        [...chats._db.values()].filter((chat) => chat.userId === userId && chat.isActive).length,

    analysisCountByUser: (userId) =>
        [...analyses._db.values()].filter((analysis) => analysis.userId === userId && analysis.status === 'completed').length,
};

module.exports = stats;
