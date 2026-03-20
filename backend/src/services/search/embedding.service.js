const { getAppContainer } = require('../../composition-root');

const getContextManager = () => getAppContainer().ai.contextManager;

const normalizeTextForEmbedding = (text = '') => getContextManager().normalizeTextForEmbedding(text);

const createTextEmbedding = async (text) => getContextManager().createTextEmbedding(text);

module.exports = {
    createTextEmbedding,
    normalizeTextForEmbedding,
};
