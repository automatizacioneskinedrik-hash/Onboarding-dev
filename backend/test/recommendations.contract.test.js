const test = require('node:test');
const assert = require('node:assert/strict');

const { createTestApp, loginDefaultUser, seedCompletedAnalysis } = require('./helpers/test-context');

test('GET /api/recommendations/specializations filters catalog by masterId', async () => {
    const { request } = createTestApp();

    const response = await request.get('/api/recommendations/specializations').query({ masterId: 'mintear' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    // Validamos un item concreto para asegurarnos de que el filtro devuelve el catalogo
    // correcto y no una lista generica mezclada entre masters.
    const iaSpecialization = response.body.data.specializations.find((item) => item.id === 'ia-automatizacion');
    assert.ok(iaSpecialization);
    assert.match(iaSpecialization.subjects[1], /RPA/);
});

test('GET /api/recommendations/specializations redirects mtecmba catalog to datalar', async () => {
    const { request } = createTestApp();

    const response = await request.get('/api/recommendations/specializations').query({ masterId: 'mtecmba' });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);

    const dataSpecialization = response.body.data.specializations.find((item) => item.id === 'analitica-datos');
    assert.ok(dataSpecialization);
    // El flujo comercial redirige MTECH MBA al catalogo de Datalar para recomendaciones.
    assert.match(dataSpecialization.subjects.join(' | '), /Arquitectura Anal[ií]tica Avanzada/i);
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
    // Este endpoint es el contrato de lectura del frontend: comprobamos ids, master y la
    // estructura completa del sprint ya serializado.
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
    // Mantenemos `springUrl` por compatibilidad retroactiva mientras el cliente termina de
    // migrar completamente a `sprintUrl`.
    assert.equal(response.body.data.recommendation.springUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.sprintUrl, 'https://lar.dev/sprints/tecnologia');
    assert.equal(response.body.data.recommendation.specialization.id, 'tecnologia');
    assert.equal(response.body.data.recommendation.sprint.courses.length, 6);
    assert.equal(response.body.data.recommendation.sprint.blocks.length, 6);
});
