const serializeChatListResponse = ({ items, total, page, limit }) => ({
    chats: items,
    pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
    },
});

const serializeRetrievalPayload = (retrieval, messageEmbedding) => ({
    embeddingGenerated: Boolean(messageEmbedding),
    embeddingModel: messageEmbedding?.model || null,
    embeddingDimensions: messageEmbedding?.dimensions || null,
    vectorSearchUsed: Boolean(retrieval),
    matches:
        retrieval?.matches.slice(0, 3).map((match) => ({
            id: match.id,
            title: match.title,
            contentType: match.contentType,
            moduleTitle: match.moduleTitle,
            distance: match.distance,
        })) || [],
});

module.exports = {
    serializeChatListResponse,
    serializeRetrievalPayload,
};
