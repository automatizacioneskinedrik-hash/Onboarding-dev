const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser, seedCompletedAnalysis } = require('./helpers/test-context');

test('POST /api/chat creates a chat', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);

    const response = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Mi chat de prueba' });

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.ok(response.body.data.chat.id);
    assert.equal(response.body.data.chat.title, 'Mi chat de prueba');
    assert.deepEqual(response.body.data.chat.messages, []);

    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    assert.equal(user.journeyContext.latestChatId, response.body.data.chat.id);
    assert.equal(user.journeyContext.chatCount, 1);
    assert.equal(user.journeyContext.lastChatAt, response.body.data.chat.createdAt);
});

test('POST /api/chat creates a clean chat without inheriting user master or analysis', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);
    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    const analysis = seedCompletedAnalysis({ store, userId: user.id, masterId: 'mtecmba' });

    store.users.update(user.id, {
        selectedMasterId: 'mtecmba',
        cvAnalysisId: analysis.id,
        recommendedSpecialization: 'Tecnologia',
    });

    const response = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({});

    assert.equal(response.status, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.chat.masterId, null);
    assert.equal(response.body.data.chat.cvAnalysisId, null);
    assert.equal(response.body.data.chat.analysis, null);
});

test('GET /api/chat/:chatId returns the chat analysis and MBA context', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);
    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    const analysis = seedCompletedAnalysis({ store, userId: user.id, masterId: 'datalar-mba' });

    const createResponse = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({
            title: 'Chat con contexto',
            cvAnalysisId: analysis.id,
        });

    const response = await request
        .get(`/api/chat/${createResponse.body.data.chat.id}`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.chat.cvAnalysisId, analysis.id);
    assert.equal(response.body.data.chat.masterId, 'datalar-mba');
    assert.equal(response.body.data.chat.analysis.id, analysis.id);
    assert.equal(response.body.data.chat.analysis.masterId, 'datalar-mba');
});

test('DELETE /api/chat/:chatId updates user chat summary', async () => {
    const { request, store } = createTestApp();
    const token = await loginDefaultUser(request);

    const firstChat = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Primer chat' });

    const secondChat = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Segundo chat' });

    const response = await request
        .delete(`/api/chat/${secondChat.body.data.chat.id}`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const user = [...store.users._db.values()].find((item) => item.email === 'user123@gmail.com');
    assert.equal(user.journeyContext.chatCount, 1);
    assert.equal(user.journeyContext.latestChatId, firstChat.body.data.chat.id);
});

test('POST /api/chat/:chatId/message preserves SSE format', async () => {
    const { request } = createTestApp();
    const token = await loginDefaultUser(request);

    const createResponse = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'SSE chat' });

    const response = await request
        .post(`/api/chat/${createResponse.body.data.chat.id}/message`)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'text/event-stream')
        .buffer(true)
        .parse((res, callback) => {
            let payload = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                payload += chunk;
            });
            res.on('end', () => callback(null, payload));
        })
        .send({ content: 'Quiero recomendaciones para producto digital' });

    const ssePayload = response.body;

    assert.equal(response.status, 200);
    assert.match(ssePayload, /data: \{"type":"start"/);
    assert.match(ssePayload, /data: \{"type":"token","token":"Hola"\}/);
    assert.match(ssePayload, /data: \{"type":"done"/);
});

test('POST /api/chat/:chatId/message rejects out of scope prompts before reaching AI', async () => {
    const { request } = createTestApp();
    const token = await loginDefaultUser(request);

    const createResponse = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Scope chat' });

    const response = await request
        .post(`/api/chat/${createResponse.body.data.chat.id}/message`)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'text/event-stream')
        .buffer(true)
        .parse((res, callback) => {
            let payload = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                payload += chunk;
            });
            res.on('end', () => callback(null, payload));
        })
        .send({ content: 'Cual es la capital de Francia?' });

    const ssePayload = response.body;

    assert.equal(response.status, 200);
    assert.match(ssePayload, /data: \{"type":"start"/);
    assert.match(ssePayload, /LÄR University/);
    assert.doesNotMatch(ssePayload, /"token":"Hola"/);
});

test('POST /api/chat/:chatId/message uses the selected master for a clean chat after onboarding advances', async () => {
    const { request } = createTestApp();
    const token = await loginDefaultUser(request);

    const createResponse = await request
        .post('/api/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({});

    await request
        .put('/api/users/master')
        .set('Authorization', `Bearer ${token}`)
        .send({ masterId: 'mtecmba' });

    const messageResponse = await request
        .post(`/api/chat/${createResponse.body.data.chat.id}/message`)
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'text/event-stream')
        .buffer(true)
        .parse((res, callback) => {
            let payload = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                payload += chunk;
            });
            res.on('end', () => callback(null, payload));
        })
        .send({ content: 'Quiero conocer el enfoque del Master en tecnología.' });

    const updatedChatResponse = await request
        .get(`/api/chat/${createResponse.body.data.chat.id}`)
        .set('Authorization', `Bearer ${token}`);

    assert.equal(messageResponse.status, 200);
    assert.equal(updatedChatResponse.status, 200);
    assert.equal(updatedChatResponse.body.data.chat.masterId, 'mtecmba');
});
