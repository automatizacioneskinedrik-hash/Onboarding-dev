const serializeChatList = ({ items, total, page, limit }) => ({
    chats: items,
    pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
    },
});

const serializeRetrieval = (retrieval) => ({
    vectorSearchUsed: Boolean(retrieval),
    retrievalSource: retrieval?.vectorSearch?.source || null,
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
    serializeChatList,
    serializeRetrieval,
};
