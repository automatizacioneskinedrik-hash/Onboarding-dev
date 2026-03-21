const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser } = require('./helpers/test-context');

test('POST /api/chat creates a chat', async () => {
    const { request } = createTestApp();
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
    assert.match(ssePayload, /LAR University/);
    assert.doesNotMatch(ssePayload, /"token":"Hola"/);
});
