require('dotenv').config();

const { syncCoursesToVectorIndex } = require('./src/services/course-vector-index.service');

const run = async () => {
    try {
        const result = await syncCoursesToVectorIndex();

        console.log('Vector index sync completed.');
        console.log(`Courses read: ${result.coursesRead}`);
        console.log(`Embedding model: ${result.embeddingModel}`);
        console.log(`Embedding dimensions: ${result.embeddingDimensions}`);
        console.log(`JSONL uploaded to: ${result.gcsFileUri}`);
        console.log(`Vertex import source: ${result.gcsFolderUri}`);
        console.log(`Operation: ${result.operation?.name || 'not returned'}`);

        if (result.completedOperation) {
            console.log(`Import completed: ${result.completedOperation.done === true}`);
        }

        if (result.diagnostic) {
            console.log('Diagnostic summary:');
            console.log(`- Status: ${result.diagnostic.summary.status}`);
            console.log(`- Message: ${result.diagnostic.summary.message}`);
            console.log(
                `- Default query neighbors: ${result.diagnostic.queries.defaultQuery?.neighborCount ?? 'n/a'}`
            );
            console.log(
                `- Module title query neighbors: ${result.diagnostic.queries.moduleTitleQuery?.neighborCount ?? 'n/a'}`
            );
            console.log(
                `- Deployed index sync time: ${result.diagnostic.endpoint.deployedIndexes?.[0]?.indexSyncTime || 'n/a'}`
            );
        }

        if (result.diagnosticError) {
            console.log('Diagnostic error:');
            console.log(result.diagnosticError);
        }
    } catch (error) {
        const apiError = error.response?.data?.error;
        console.error('Error syncing courses to Vertex AI Vector Search:');
        console.error(apiError?.message || error.message);

        if (apiError?.details) {
            console.error(JSON.stringify(apiError.details, null, 2));
        }

        process.exit(1);
    }
};

run();
