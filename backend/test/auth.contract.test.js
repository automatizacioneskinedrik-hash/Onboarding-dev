const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp } = require('./helpers/test-context');

test('POST /api/auth/login returns token and user', async () => {
    const { request } = createTestApp();

    const response = await request.post('/api/auth/login').send({
        email: 'user123@gmail.com',
        password: '123456',
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.token);
    assert.equal(response.body.data.user.email, 'user123@gmail.com');
    assert.equal(response.body.data.user.journeyContext.onboardingStage, 'select_master');
    assert.equal(response.body.data.user.journeyContext.chatCount, 0);
    assert.equal(response.body.data.user.journeyContext.analysisCount, 0);
});

test('GET /api/auth/me returns authenticated user', async () => {
    const { request } = createTestApp();

    const login = await request.post('/api/auth/login').send({
        email: 'user123@gmail.com',
        password: '123456',
    });

    const response = await request
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${login.body.data.token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.email, 'user123@gmail.com');
    assert.equal(response.body.data.user.journeyContext.onboardingStage, 'select_master');
});
