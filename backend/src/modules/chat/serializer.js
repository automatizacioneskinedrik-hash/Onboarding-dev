const { serializeChatListResponse, serializeRetrievalPayload } = require('../../shared/serializers/chat.serializer');

const serializeChatList = ({ items, total, page, limit }) =>
    serializeChatListResponse({ items, total, page, limit });

const serializeRetrieval = (retrieval, embedding) => serializeRetrievalPayload(retrieval, embedding);

module.exports = {
    serializeChatList,
    serializeRetrieval,
};
