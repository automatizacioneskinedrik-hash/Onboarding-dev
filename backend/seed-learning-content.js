require('dotenv').config();

const { seedLearningContent } = require('./src/utils/seed-learning-content');

const run = async () => {
    try {
        const result = await seedLearningContent();
        console.log(
            `Seed completado: ${result.masters} masters, ${result.modules} modulos y ${result.topics} topics sincronizados.`
        );
        process.exit(0);
    } catch (error) {
        console.error('Error ejecutando el seed de learning content:', error.message);
        process.exit(1);
    }
};

run();
