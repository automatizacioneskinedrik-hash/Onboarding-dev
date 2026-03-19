require('dotenv').config();

const { runVectorIndexDiagnostic } = require('./src/tooling/vector-index/vector-index-diagnostic.service');

const run = async () => {
    const question = process.argv.slice(2).join(' ').trim();

    try {
        const report = await runVectorIndexDiagnostic({ question: question || undefined });
        console.log(JSON.stringify(report, null, 2));
    } catch (error) {
        const apiError = error.response?.data?.error;
        console.error('Vector index diagnostic failed:');
        console.error(apiError?.message || error.message);

        if (apiError?.details) {
            console.error(JSON.stringify(apiError.details, null, 2));
        }

        process.exit(1);
    }
};

run();
