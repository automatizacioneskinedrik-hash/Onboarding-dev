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
});
