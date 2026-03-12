const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

const { admin, db, COLLECTIONS } = require('../config/firebase');
const { createTextEmbedding } = require('./embedding.service');

const VECTOR_SEARCH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';
const DEFAULT_GCS_PREFIX = 'vector-search/imports/courses';
const DEFAULT_EMBEDDING_CONCURRENCY = 3;

const getRequiredEnv = (name) => {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
};

const getProjectId = () =>
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();

const normalizePrefix = (prefix = '') => prefix.replace(/^\/+|\/+$/g, '');

const buildEmbeddingInput = (course) => {
    if (course.contentType === 'learning_module') {
        return [
            `Tipo: módulo de aprendizaje`,
            `Título: ${course.title}`,
            `Descripción: ${course.description}`,
            `Dificultad: ${course.difficulty}`,
            `Horas estimadas: ${course.estimatedHours}`,
        ].join('. ');
    }

    return [
        `Tipo: tema de aprendizaje`,
        `Título: ${course.title}`,
        `Módulo: ${course.moduleTitle}`,
        `Descripción del módulo: ${course.moduleDescription}`,
    ].join('. ');
};

const sortByOrder = (items) =>
    [...items].sort((a, b) => {
        if ((a.order || 0) !== (b.order || 0)) {
            return (a.order || 0) - (b.order || 0);
        }
        return String(a.id).localeCompare(String(b.id));
    });

const readCoursesFromFirestore = async () => {
    const [modulesSnapshot, topicsSnapshot] = await Promise.all([
        db.collection(COLLECTIONS.LEARNING_MODULES).get(),
        db.collection(COLLECTIONS.TOPICS).get(),
    ]);

    const modules = sortByOrder(
        modulesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }))
    );

    const topics = [...topicsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))].sort((a, b) => {
        if (String(a.module_id) !== String(b.module_id)) {
            return String(a.module_id).localeCompare(String(b.module_id));
        }
        if ((a.order || 0) !== (b.order || 0)) {
            return (a.order || 0) - (b.order || 0);
        }
        return String(a.id).localeCompare(String(b.id));
    });

    if (modules.length === 0 && topics.length === 0) {
        throw new Error('No courses found in Firestore collections learning_modules/topics.');
    }

    const modulesById = new Map(modules.map((module) => [module.id, module]));

    const courseDocuments = [
        ...modules.map((module) => ({
            id: module.id,
            firestoreId: module.id,
            sourceCollection: COLLECTIONS.LEARNING_MODULES,
            contentType: 'learning_module',
            moduleId: module.id,
            moduleTitle: module.title,
            moduleDescription: module.description || '',
            title: module.title,
            description: module.description || '',
            order: module.order || null,
            difficulty: module.difficulty || null,
            estimatedHours: module.estimated_hours || null,
        })),
        ...topics.map((topic) => {
            const parentModule = modulesById.get(topic.module_id);

            return {
                id: topic.id,
                firestoreId: topic.id,
                sourceCollection: COLLECTIONS.TOPICS,
                contentType: 'topic',
                moduleId: topic.module_id,
                moduleTitle: parentModule?.title || topic.module_id,
                moduleDescription: parentModule?.description || '',
                title: topic.title,
                description: '',
                order: topic.order || null,
                difficulty: parentModule?.difficulty || null,
                estimatedHours: parentModule?.estimated_hours || null,
            };
        }),
    ];

    return courseDocuments;
};

const runWithConcurrency = async (items, concurrency, worker) => {
    const results = new Array(items.length);
    let cursor = 0;

    const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
        while (cursor < items.length) {
            const current = cursor;
            cursor += 1;
            results[current] = await worker(items[current], current);
        }
    });

    await Promise.all(runners);
    return results;
};

const generateEmbeddingsForCourses = async (courses, { concurrency = DEFAULT_EMBEDDING_CONCURRENCY } = {}) => {
    const safeConcurrency = Math.max(1, Number(concurrency) || DEFAULT_EMBEDDING_CONCURRENCY);

    return runWithConcurrency(courses, safeConcurrency, async (course) => {
        const embeddingInput = buildEmbeddingInput(course);
        const embeddingResult = await createTextEmbedding(embeddingInput);

        return {
            ...course,
            embeddingInput,
            embedding: embeddingResult.embedding,
            embeddingModel: embeddingResult.model,
            embeddingDimensions: embeddingResult.dimensions,
        };
    });
};

const buildJsonlRecords = (coursesWithEmbeddings) =>
    coursesWithEmbeddings.map((course) => ({
        id: course.id,
        embedding: course.embedding,
        restricts: [
            { namespace: 'content_type', allow: [course.contentType] },
            { namespace: 'module_id', allow: [course.moduleId] },
        ],
        embedding_metadata: {
            firestore_id: course.firestoreId,
            firestore_collection: course.sourceCollection,
            title: course.title,
            module_id: course.moduleId,
            module_title: course.moduleTitle,
            content_type: course.contentType,
        },
    }));

const writeJsonlToTempFile = async (records, fileName = 'courses.json') => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lar-vector-index-'));
    const filePath = path.join(tempDir, fileName);
    const jsonl = `${records.map((record) => JSON.stringify(record)).join('\n')}\n`;

    await fs.writeFile(filePath, jsonl, 'utf8');

    return { tempDir, filePath };
};

const uploadJsonlToCloudStorage = async ({ localFilePath, bucketName, prefix, fileName }) => {
    const bucket = admin.storage().bucket(bucketName);
    const cleanPrefix = normalizePrefix(prefix);
    const destination = cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName;

    await bucket.upload(localFilePath, {
        destination,
        resumable: false,
        metadata: {
            contentType: 'application/json',
        },
    });

    const [fileMetadata] = await bucket.file(destination).getMetadata();

    return {
        bucketName,
        objectPath: destination,
        folderUri: `gs://${bucketName}/${cleanPrefix ? `${cleanPrefix}/` : ''}`,
        fileUri: `gs://${bucketName}/${destination}`,
        updated: fileMetadata.updated || null,
    };
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

const buildIndexName = ({ projectId, location, indexId }) =>
    `projects/${projectId}/locations/${location}/indexes/${indexId}`;

const triggerVectorIndexImport = async ({
    projectId,
    location,
    indexId,
    contentsDeltaUri,
    isCompleteOverwrite = false,
}) => {
    const accessToken = await getAccessToken();
    const indexName = buildIndexName({ projectId, location, indexId });
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/${indexName}`;

    const response = await axios.patch(
        endpoint,
        {
            name: indexName,
            metadata: {
                contentsDeltaUri,
                isCompleteOverwrite,
            },
        },
        {
            params: {
                updateMask: 'metadata.contentsDeltaUri,metadata.isCompleteOverwrite',
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }
    );

    return response.data;
};

const waitForOperation = async ({ operationName, location, intervalMs = 10000, timeoutMs = 15 * 60 * 1000 }) => {
    const accessToken = await getAccessToken();
    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/${operationName}`;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (response.data.done) {
            return response.data;
        }

        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Timed out waiting for Vertex AI operation ${operationName}.`);
};

const syncCoursesToVectorIndex = async ({
    bucketName = getRequiredEnv('VERTEX_AI_GCS_BUCKET'),
    gcsPrefix = process.env.VERTEX_AI_GCS_PREFIX || DEFAULT_GCS_PREFIX,
    indexId = getRequiredEnv('VERTEX_AI_INDEX_ID'),
    location = process.env.VERTEX_AI_LOCATION || process.env.GCP_REGION || 'us-central1',
    projectId = getProjectId(),
    overwrite = process.env.VERTEX_AI_OVERWRITE === 'true',
    waitForImport = process.env.VERTEX_AI_WAIT_FOR_IMPORT === 'true',
    embeddingConcurrency = process.env.VECTOR_EMBEDDING_CONCURRENCY || DEFAULT_EMBEDDING_CONCURRENCY,
    keepLocalFile = process.env.VERTEX_AI_KEEP_JSONL === 'true',
    runDiagnostic = process.env.VERTEX_AI_RUN_DIAGNOSTIC !== 'false',
} = {}) => {
    if (!projectId) {
        throw new Error('Missing Google Cloud project id. Set FIREBASE_PROJECT_ID or GOOGLE_CLOUD_PROJECT.');
    }

    const jobId = `courses-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const prefix = normalizePrefix(`${gcsPrefix}/${jobId}`);

    const courses = await readCoursesFromFirestore();
    const coursesWithEmbeddings = await generateEmbeddingsForCourses(courses, {
        concurrency: embeddingConcurrency,
    });
    const jsonlRecords = buildJsonlRecords(coursesWithEmbeddings);
    const { tempDir, filePath } = await writeJsonlToTempFile(jsonlRecords);

    try {
        const uploadResult = await uploadJsonlToCloudStorage({
            localFilePath: filePath,
            bucketName,
            prefix,
            fileName: 'courses.json',
        });

        const operation = await triggerVectorIndexImport({
            projectId,
            location,
            indexId,
            contentsDeltaUri: uploadResult.folderUri,
            isCompleteOverwrite: overwrite,
        });

        let completedOperation = null;
        if (waitForImport && operation.name) {
            completedOperation = await waitForOperation({
                operationName: operation.name,
                location,
            });
        }

        let diagnostic = null;
        let diagnosticError = null;
        if (runDiagnostic) {
            try {
                const { runVectorIndexDiagnostic } = require('./vector-index-diagnostic.service');
                diagnostic = await runVectorIndexDiagnostic({
                    expectedUpload: {
                        name: uploadResult.objectPath,
                        updated: uploadResult.updated,
                    },
                });
            } catch (error) {
                diagnosticError = error.response?.data?.error?.message || error.message;
            }
        }

        return {
            jobId,
            projectId,
            location,
            indexId,
            bucketName,
            coursesRead: courses.length,
            modulesRead: courses.filter((item) => item.contentType === 'learning_module').length,
            topicsRead: courses.filter((item) => item.contentType === 'topic').length,
            embeddingModel: coursesWithEmbeddings[0]?.embeddingModel || null,
            embeddingDimensions: coursesWithEmbeddings[0]?.embeddingDimensions || null,
            jsonFilePath: filePath,
            gcsFolderUri: uploadResult.folderUri,
            gcsFileUri: uploadResult.fileUri,
            operation,
            completedOperation,
            diagnostic,
            diagnosticError,
        };
    } finally {
        if (!keepLocalFile) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    }
};

module.exports = {
    readCoursesFromFirestore,
    generateEmbeddingsForCourses,
    buildJsonlRecords,
    writeJsonlToTempFile,
    uploadJsonlToCloudStorage,
    triggerVectorIndexImport,
    waitForOperation,
    syncCoursesToVectorIndex,
};
