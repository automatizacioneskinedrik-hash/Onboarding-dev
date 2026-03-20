const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeRecommendation,
    serializeRecommendationPayload,
    serializeStoredRecommendation,
} = require('../src/services/serialization/recommendation-serializer');
const { serializeAnalysisHistoryItem } = require('../src/services/serialization/analysis-serializer');
const { serializeChatList } = require('../src/http/serializers/chat.serializer');

test('recommendation serializer normalizes sprintUrl and springUrl', () => {
    const normalized = normalizeRecommendation({
        primarySpecialization: 'Tecnologia',
        springUrl: 'https://lar.dev/sprint',
        subjects: [
            'Curso 1',
            'Curso 2',
            'Curso 3',
            'Curso 4',
            'Curso 5',
            'Curso 6',
            'Curso 7',
        ],
    });

    assert.equal(normalized.sprintUrl, 'https://lar.dev/sprint');
    assert.equal(normalized.sprint.courses.length, 6);
    assert.equal(normalized.sprint.blocks.length, 6);
    assert.equal(serializeRecommendationPayload(normalized).springUrl, 'https://lar.dev/sprint');
    assert.equal(serializeRecommendationPayload(normalized).sprint.courses.length, 6);
    assert.equal(serializeRecommendationPayload(normalized).sprint.blocks.length, 6);
    assert.equal(serializeStoredRecommendation(normalized).sprintUrl, 'https://lar.dev/sprint');
    assert.equal(serializeStoredRecommendation(normalized).sprint.courses.length, 6);
    assert.equal(serializeStoredRecommendation(normalized).sprint.blocks.length, 6);
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
    const serialized = serializeChatList({
        items: [{ id: 'chat-1', title: 'Demo' }],
        total: 1,
        page: 1,
        limit: 20,
    });

    assert.equal(serialized.chats.length, 1);
    assert.equal(serialized.pagination.pages, 1);
});
