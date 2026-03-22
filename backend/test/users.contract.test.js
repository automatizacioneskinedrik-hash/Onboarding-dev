const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser } = require('./helpers/test-context');

test('PUT /api/users/master updates selected master', async () => {
    const { request } = createTestApp();
    const token = await loginDefaultUser(request);

    const response = await request
        .put('/api/users/master')
        .set('Authorization', `Bearer ${token}`)
        .send({ masterId: 'mtecmba' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.selectedMaster.id, 'mtecmba');
    assert.equal(response.body.data.user.selectedMasterId, 'mtecmba');
    assert.equal(response.body.data.user.cvAnalysisId, null);
    assert.equal(response.body.data.user.journeyContext.onboardingStage, 'upload_cv');
});

test('GET /api/users/master-modules returns modules for selected MBA', async () => {
    const { request } = createTestApp();
    const token = await loginDefaultUser(request);

    const response = await request
        .get('/api/users/master-modules')
        .query({ masterId: 'mtecmba' })
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.modules.length > 0);
    assert.equal(response.body.data.master.id, 'mtecmba');
    assert.ok(response.body.data.modules[0].topicsCount > 0);
    assert.equal(response.body.data.modules[0].topics.length, response.body.data.modules[0].topicsCount);
});
