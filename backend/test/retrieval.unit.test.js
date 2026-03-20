const test = require('node:test');
const assert = require('node:assert/strict');

const { buildProfileRetrievalQuery } = require('../src/ai/profile-query-builder');
const {
    extractSearchTerms,
    scoreModuleAgainstProfile,
    buildModuleRanking,
} = require('../src/ai/retrieval-ranking');
const { formatRetrievedCoursesContext } = require('../src/ai/retrieval-context-builder');

test('profile query builder composes a searchable query', () => {
    const query = buildProfileRetrievalQuery({
        currentRole: 'Product Manager',
        industry: 'Tecnologia',
        yearsOfExperience: 5,
        skills: ['Producto', 'Analitica'],
        summary: 'Perfil enfocado en crecimiento',
    });

    assert.match(query, /Product Manager/);
    assert.match(query, /Analitica/);
});

test('retrieval ranking scores relevant modules higher', () => {
    const terms = extractSearchTerms('producto analitica liderazgo');
    const score = scoreModuleAgainstProfile(
        {
            title: 'Producto Digital',
            description: 'Analitica y liderazgo',
            topics: ['growth'],
            specialization_id: 'tecnologia',
        },
        terms
    );

    assert.ok(score > 0);
});

test('module ranking groups matches by module', () => {
    const ranking = buildModuleRanking([
        { moduleId: 'module-1', moduleTitle: 'Producto', specializationId: 'tecnologia', contentType: 'learning_module' },
        { moduleId: 'module-1', moduleTitle: 'Producto', specializationId: 'tecnologia', contentType: 'topic' },
    ]);

    assert.equal(ranking.length, 1);
    assert.equal(ranking[0].hits, 2);
});

test('context builder formats course metadata', () => {
    const context = formatRetrievedCoursesContext([
        {
            contentType: 'learning_module',
            catalogType: 'sprint',
            title: 'Producto Digital',
            moduleTitle: 'Producto',
            distance: 0.12,
            description: 'Descripcion',
            difficulty: 3,
            estimatedHours: 12,
            topics: ['Discovery'],
        },
    ]);

    assert.match(context, /Producto Digital/);
    assert.match(context, /Discovery/);
});
