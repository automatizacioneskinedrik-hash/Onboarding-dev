const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');

const VECTOR_SEARCH_SCOPE = 'https://www.googleapis.com/auth/cloud-platform';

const getProjectId = () =>
    process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
    process.env.GCLOUD_PROJECT?.trim() ||
    process.env.FIREBASE_PROJECT_ID?.trim();

const getBaseConfig = () => ({
    projectId: getProjectId(),
    location: process.env.VERTEX_AI_LOCATION?.trim() || process.env.GCP_REGION?.trim() || 'us-central1',
});

const getRequiredConfig = () => {
    const { projectId, location } = getBaseConfig();
    const indexEndpointId = process.env.VERTEX_AI_INDEX_ENDPOINT_ID?.trim();
    const deployedIndexId = process.env.VERTEX_AI_DEPLOYED_INDEX_ID?.trim();

    if (!projectId || !indexEndpointId || !deployedIndexId) {
        const error = new Error(
            'Vertex AI Vector Search is not fully configured. Set FIREBASE_PROJECT_ID/GOOGLE_CLOUD_PROJECT, VERTEX_AI_INDEX_ENDPOINT_ID, and VERTEX_AI_DEPLOYED_INDEX_ID.'
        );
        error.statusCode = 503;
        throw error;
    }

    return { projectId, location, indexEndpointId, deployedIndexId };
};

const getAccessToken = async () => {
    const auth = new GoogleAuth({ scopes: [VECTOR_SEARCH_SCOPE] });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const accessToken = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

    if (!accessToken) {
        throw new Error('Failed to acquire Google Cloud access token for Vertex AI.');
    }

    return accessToken;
};

const buildIndexEndpointName = ({ projectId, location, indexEndpointId }) =>
    `projects/${projectId}/locations/${location}/indexEndpoints/${indexEndpointId}`;

const getIndexEndpoint = async () => {
    const config = getRequiredConfig();
    const accessToken = await getAccessToken();
    const endpointName = buildIndexEndpointName(config);
    const response = await axios.get(`https://${config.location}-aiplatform.googleapis.com/v1/${endpointName}`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    return response.data;
};

const resolvePublicEndpointDomain = async () => {
    const configuredDomain = process.env.VERTEX_AI_INDEX_ENDPOINT_DOMAIN?.trim();
    if (configuredDomain) {
        return configuredDomain;
    }

    const endpoint = await getIndexEndpoint();
    const publicEndpointDomainName = endpoint.publicEndpointDomainName;

    if (!publicEndpointDomainName) {
        throw new Error(
            'The configured Vertex AI IndexEndpoint does not expose publicEndpointDomainName. Ensure the index is deployed on a public endpoint or set VERTEX_AI_INDEX_ENDPOINT_DOMAIN explicitly.'
        );
    }

    return publicEndpointDomainName;
};

const buildRestricts = (filters = {}) => {
    const restricts = [];

    if (filters.contentType) {
        restricts.push({
            namespace: 'content_type',
            allowList: [filters.contentType],
        });
    }

    if (filters.moduleId) {
        restricts.push({
            namespace: 'module_id',
            allowList: [filters.moduleId],
        });
    }

    const masterAllowList = filters.masterIds || (filters.masterId ? [filters.masterId] : null);
    if (masterAllowList?.length) {
        restricts.push({
            namespace: 'master_id',
            allowList: masterAllowList,
        });
    }

    const catalogAllowList = filters.catalogTypes || (filters.catalogType ? [filters.catalogType] : null);
    if (catalogAllowList?.length) {
        restricts.push({
            namespace: 'catalog_type',
            allowList: catalogAllowList,
        });
    }

    return restricts;
};

const normalizeNeighbor = (neighbor = {}) => ({
    datapointId: neighbor.datapoint?.datapointId || null,
    distance: typeof neighbor.distance === 'number' ? neighbor.distance : null,
    sparseDistance: typeof neighbor.sparseDistance === 'number' ? neighbor.sparseDistance : null,
});

const findNeighbors = async ({
    embedding,
    topK = 5,
    filters = {},
    queryId = `query-${Date.now()}`,
    returnFullDatapoint = false,
} = {}) => {
    if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Embedding vector is required to query Vertex AI Vector Search.');
    }

    const config = getRequiredConfig();
    const [accessToken, publicEndpointDomain] = await Promise.all([getAccessToken(), resolvePublicEndpointDomain()]);
    const endpointName = buildIndexEndpointName(config);

    const response = await axios.post(
        `https://${publicEndpointDomain}/v1/${endpointName}:findNeighbors`,
        {
            deployedIndexId: config.deployedIndexId,
            queries: [
                {
                    datapoint: {
                        datapointId: queryId,
                        featureVector: embedding,
                        restricts: buildRestricts(filters),
                    },
                    neighborCount: topK,
                },
            ],
            returnFullDatapoint,
        },
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        }
    );

    const neighbors = response.data?.nearestNeighbors?.[0]?.neighbors || [];

    return {
        endpointName,
        deployedIndexId: config.deployedIndexId,
        publicEndpointDomain,
        neighbors: neighbors.map(normalizeNeighbor).filter((item) => item.datapointId),
        rawResponse: response.data,
    };
};

module.exports = {
    getIndexEndpoint,
    findNeighbors,
};
