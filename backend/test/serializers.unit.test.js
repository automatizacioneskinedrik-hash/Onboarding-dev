const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeRecommendation,
    serializeRecommendationPayload,
    serializeStoredRecommendation,
} = require('../src/shared/serializers/recommendation.serializer');
const { serializeAnalysisHistoryItem } = require('../src/shared/serializers/analysis.serializer');
const { serializeChatListResponse } = require('../src/shared/serializers/chat.serializer');

test('recommendation serializer normalizes sprintUrl and springUrl', () => {
    const normalized = normalizeRecommendation({
        primarySpecialization: 'Tecnologia',
        springUrl: 'https://lar.dev/sprint',
        subjects: ['Arquitectura'],
    });

    assert.equal(normalized.sprintUrl, 'https://lar.dev/sprint');
    assert.equal(serializeRecommendationPayload(normalized).springUrl, 'https://lar.dev/sprint');
    assert.equal(serializeStoredRecommendation(normalized).sprintUrl, 'https://lar.dev/sprint');
});

test('analysis history serializer hides rawText', () => {
    const serialized = serializeAnalysisHistoryItem({
        id: 'analysis-1',
        rawText: 'contenido completo',
        status: 'completed',
    });

    assert.equal(serialized.rawText, undefined);
    assert.equal(serialized.status, 'completed');
});

test('chat serializer keeps pagination contract', () => {
    const serialized = serializeChatListResponse({
        items: [{ id: 'chat-1', title: 'Demo' }],
        total: 1,
        page: 1,
        limit: 20,
    });

    assert.equal(serialized.chats.length, 1);
    assert.equal(serialized.pagination.pages, 1);
});
