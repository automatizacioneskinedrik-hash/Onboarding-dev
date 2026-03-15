const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

const { admin } = require('../config/firebase');
const { readCoursesFromFirestore } = require('./course-vector-index.service');
const { createTextEmbedding } = require('./embedding.service');
const { findNeighbors, getIndexEndpoint } = require('./vertex-vector-search.service');

const VECTOR_SEARCH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DEFAULT_QUERY = 'Quiero mejorar mi liderazgo y mis habilidades de comunicacion';

const getProjectId = () =>
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();

const getLocation = () => process.env.VERTEX_AI_LOCATION?.trim() || process.env.GCP_REGION?.trim() || 'us-central1';

const getIndexName = () => {
    const projectId = getProjectId();
    const location = getLocation();
    const indexId = process.env.VERTEX_AI_INDEX_ID?.trim();

    if (!projectId || !indexId) {
        throw new Error('Missing FIREBASE_PROJECT_ID/GOOGLE_CLOUD_PROJECT or VERTEX_AI_INDEX_ID.');
    }

    return `projects/${projectId}/locations/${location}/indexes/${indexId}`;
};

const getAccessToken = async () => {
    const auth = new GoogleAuth({ scopes: [VECTOR_SEARCH_SCOPE] });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

    if (!accessToken) {
        throw new Error('Failed to acquire Google Cloud access token.');
    }

    return accessToken;
};

const fetchIndexResource = async () => {
    const location = getLocation();
    const accessToken = await getAccessToken();
    const indexName = getIndexName();

    const response = await axios.get(`https://${location}-aiplatform.googleapis.com/v1/${indexName}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

const checkEnv = () => {
    const keys = [
        'FIREBASE_PROJECT_ID',
        'GOOGLE_APPLICATION_CREDENTIALS',
        'VERTEX_AI_INDEX_ID',
        'VERTEX_AI_INDEX_ENDPOINT_ID',
        'VERTEX_AI_DEPLOYED_INDEX_ID',
        'VERTEX_AI_LOCATION',
        'VERTEX_AI_GCS_BUCKET',
        'OPENAI_API_KEY',
    ];

    return keys.map((key) => ({
        key,
        present: Boolean(process.env[key]?.trim()),
    }));
};

const inspectFirestoreCourses = async () => {
    const courses = await readCoursesFromFirestore();
    const modules = courses.filter((course) => course.contentType === 'learning_module');
    const topics = courses.filter((course) => course.contentType === 'topic');

    return {
        total: courses.length,
        modules: modules.length,
        topics: topics.length,
        sampleModule: modules[0]
            ? {
                id: modules[0].id,
                title: modules[0].title,
                moduleId: modules[0].moduleId,
            }
            : null,
        sampleTopic: topics[0]
            ? {
                id: topics[0].id,
                title: topics[0].title,
                moduleId: topics[0].moduleId,
            }
            : null,
    };
};

const inspectBucket = async () => {
    const bucketName = process.env.VERTEX_AI_GCS_BUCKET?.trim();
    const prefix = process.env.VERTEX_AI_GCS_PREFIX?.trim();

    if (!bucketName) {
        return {
            bucketConfigured: false,
        };
    }

    const bucket = admin.storage().bucket(bucketName);
    const [files] = await bucket.getFiles({
        prefix: prefix || undefined,
        maxResults: 10,
    });

    const sortedFiles = files
        .map((file) => ({
            name: file.name,
            updated: file.metadata.updated || null,
            size: file.metadata.size || null,
        }))
        .sort((a, b) => new Date(b.updated || 0) - new Date(a.updated || 0));

    return {
        bucketConfigured: true,
        bucketName,
        prefix: prefix || null,
        fileCount: sortedFiles.length,
        latestFiles: sortedFiles.slice(0, 10),
    };
};

const queryVectorSearch = async (question, filters = {}) => {
    const embedding = await createTextEmbedding(question);
    const result = await findNeighbors({
        embedding: embedding.embedding,
        topK: 5,
        filters,
    });

    return {
        question,
        filters,
        embeddingModel: embedding.model,
        embeddingDimensions: embedding.dimensions,
        neighborCount: result.neighbors.length,
        neighbors: result.neighbors.slice(0, 10),
        endpoint: result.publicEndpointDomain,
    };
};

const queryWithCourseSeed = async (firestoreSummary) => {
    const sampleText = firestoreSummary.sampleModule?.title || firestoreSummary.sampleTopic?.title;
    if (!sampleText) {
        return null;
    }

    return queryVectorSearch(sampleText);
};

const buildDiagnosticSummary = (report, expectedUpload = null) => {
    const allEnvPresent = report.configuration.env.every((item) => item.present);
    const hasSourceData = report.firestore.total > 0;
    const deployedIndex = report.endpoint.deployedIndexes?.[0] || null;
    const hasDeployedIndex = Boolean(deployedIndex);
    const hasMatches = Object.values(report.queries).some((query) => query && query.neighborCount > 0);
    const latestFile = expectedUpload || report.storage.latestFiles?.[0] || null;
    const indexSyncTime = deployedIndex?.indexSyncTime ? new Date(deployedIndex.indexSyncTime) : null;
    const uploadTime = latestFile?.updated ? new Date(latestFile.updated) : null;
    const latestUploadSynced = !indexSyncTime || !uploadTime ? null : indexSyncTime >= uploadTime;

    if (!allEnvPresent) {
        return {
            status: 'configuration_error',
            message: 'Faltan variables de entorno obligatorias para el flujo de Vector Search.',
        };
    }

    if (!hasSourceData) {
        return {
            status: 'source_data_empty',
            message: 'Firestore no tiene cursos para indexar.',
        };
    }

    if (!hasDeployedIndex) {
        return {
            status: 'index_not_deployed',
            message: 'El Index existe, pero no hay ningun deployedIndex en el IndexEndpoint.',
        };
    }

    if (latestUploadSynced === false) {
        return {
            status: 'deployment_not_synced_yet',
            message: 'El archivo mas reciente ya esta en GCS, pero el deployedIndex aun no refleja esa carga segun indexSyncTime.',
        };
    }

    if (hasMatches) {
        return {
            status: 'healthy',
            message: 'El endpoint ya devuelve vecinos. La carga parece correcta.',
        };
    }

    return {
        status: 'index_returns_zero_neighbors',
        message:
            'La configuracion, Firestore, GCS y el despliegue parecen correctos, pero Vertex no devuelve vecinos. El origen mas probable esta en el contenido/formato importado o en la carga efectiva del indice.',
    };
};

const runVectorIndexDiagnostic = async ({ question = DEFAULT_QUERY, expectedUpload = null } = {}) => {
    const env = checkEnv();
    const firestore = await inspectFirestoreCourses();
    const [indexResource, indexEndpoint, bucket, queryDefault, queryByModuleTitle, queryModulesOnly, queryTopicsOnly] =
        await Promise.all([
            fetchIndexResource(),
            getIndexEndpoint(),
            inspectBucket(),
            queryVectorSearch(question),
            queryWithCourseSeed(firestore),
            queryVectorSearch(question, { contentType: 'learning_module' }),
            queryVectorSearch(question, { contentType: 'topic' }),
        ]);

    const report = {
        generatedAt: new Date().toISOString(),
        configuration: {
            env,
            projectId: getProjectId(),
            location: getLocation(),
        },
        firestore,
        storage: bucket,
        index: {
            name: indexResource.name,
            displayName: indexResource.displayName || null,
            indexUpdateMethod: indexResource.indexUpdateMethod || null,
            metadata: indexResource.metadata || null,
        },
        endpoint: {
            name: indexEndpoint.name,
            displayName: indexEndpoint.displayName || null,
            publicEndpointDomainName: indexEndpoint.publicEndpointDomainName || null,
            deployedIndexes: indexEndpoint.deployedIndexes || [],
        },
        queries: {
            defaultQuery: queryDefault,
            moduleTitleQuery: queryByModuleTitle,
            learningModulesOnly: queryModulesOnly,
            topicsOnly: queryTopicsOnly,
        },
    };

    report.summary = buildDiagnosticSummary(report, expectedUpload);
    return report;
};

module.exports = {
    runVectorIndexDiagnostic,
    buildDiagnosticSummary,
};
