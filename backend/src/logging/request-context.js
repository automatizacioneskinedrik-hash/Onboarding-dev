const { AsyncLocalStorage } = require('async_hooks');

const requestContextStorage = new AsyncLocalStorage();

const runWithRequestContext = (context, callback) => requestContextStorage.run({ ...context }, callback);

const getRequestContext = () => requestContextStorage.getStore() || null;

const setRequestContext = (updates = {}) => {
    const store = requestContextStorage.getStore();

    if (!store) {
        return null;
    }

    Object.assign(store, updates);
    return store;
};

module.exports = {
    runWithRequestContext,
    getRequestContext,
    setRequestContext,
};
