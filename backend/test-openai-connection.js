/**
 * Test script for OpenAI API connection
 */
const { openai, OPENAI_MODEL } = require('./src/config/openai');

async function testConnection() {
    console.log('--- Probando conexión con OpenAI ---');
    console.log(`Modelo: ${OPENAI_MODEL}`);

    try {
        if (!openai) {
            throw new Error('OPENAI_API_KEY no está configurada. Agrega la variable en backend/.env antes de ejecutar este test.');
        }

        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: 'Eres un asistente útil.' },
                { role: 'user', content: 'Di "Hola, la conexión con LAR University está activa" en español.' }
            ],
            max_tokens: 50
        });

        console.log('\nRespuesta de la IA:');
        console.log('-------------------');
        console.log(response.choices[0].message.content);
        console.log('-------------------');
        console.log('\n¡Éxito! La API key está funcionando correctamente.');
    } catch (error) {
        console.error('\nError al conectar con OpenAI:');
        console.error(error.message);
        if (error.response) {
            console.error(error.response.data);
        }
    }
}

testConnection();
