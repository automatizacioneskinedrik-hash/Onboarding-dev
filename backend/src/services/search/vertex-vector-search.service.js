const { createVertexClient } = require('../../infra/vertex.client');

const client = createVertexClient();

module.exports = {
    getIndexEndpoint: (...args) => client.getIndexEndpoint(...args),
    findNeighbors: (...args) => client.findNeighbors(...args),
};
