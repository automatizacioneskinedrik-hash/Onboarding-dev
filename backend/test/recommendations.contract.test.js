const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser, seedCompletedAnalysis } = require('./helpers/test-context');

test('GET /api/recommendations/specializations filters catalog by masterId', async () => {
    const { request } = createTestApp();

    const response = await request.get('/api/recommendations/specializations').query({ masterId: 'mintear' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    const iaSpecialization = response.body.data.specializations.find((item) => item.id === 'ia-automatizacion');
    assert.ok(iaSpecialization);
    assert.match(iaSpecialization.subjects[1], /RPA/);
});

test('GET /api/recommendations/my-recommendation returns latest recommendation', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);
    const user = store.users.findByEmail('user123@gmail.com');

    seedCompletedAnalysis({ store, userId: user.id });

    const response = await request
        .get('/api/recommendations/my-recommendation')
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.recommendation.specialization.id, 'tecnologia');
    assert.equal(response.body.data.masterId, 'mtecmba');
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);
    assert.equal(response.body.data.recommendation.sprintUrl, 'https://lar.dev/sprints/tecnologia');
});

test('POST /api/recommendations/regenerate keeps response contract', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);
    const user = store.users.findByEmail('user123@gmail.com');
    const analysis = seedCompletedAnalysis({ store, userId: user.id });

    const response = await request
        .post('/api/recommendations/regenerate')
        .set('Authorization', `Bearer ${token}`)
        .send({ cvAnalysisId: analysis.id });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.recommendation.springUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.sprintUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.specialization.id, 'tecnologia');
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);
});
