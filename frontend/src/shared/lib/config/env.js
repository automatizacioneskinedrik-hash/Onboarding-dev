const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const trimLeadingSlash = (value = '') => value.replace(/^\/+/, '');
const normalizePathSlashes = (value = '') => value.replace(/\\/g, '/');

const readEnvString = (value = '') => String(value || '').trim().replace(/^['"]|['"]$/g, '');

const normalizeGoogleCloudUrl = (value = '') => {
    const normalizedValue = readEnvString(value);

    if (!normalizedValue) {
        return '';
    }

    if (normalizedValue.startsWith('gs://')) {
        return `https://storage.googleapis.com/${trimLeadingSlash(normalizedValue.replace('gs://', ''))}`;
    }

    if (normalizedValue.startsWith('https://storage.cloud.google.com/')) {
        return normalizedValue.replace('https://storage.cloud.google.com/', 'https://storage.googleapis.com/');
    }

    if (normalizedValue.startsWith('https://console.cloud.google.com/storage/browser/')) {
        return normalizedValue.replace('https://console.cloud.google.com/storage/browser/', 'https://storage.googleapis.com/');
    }

    return normalizedValue;
};

const safeEncodeUrl = (value = '') => {
    try {
        return encodeURI(value);
    } catch {
        return value;
    }
};

export const API_URL = readEnvString(import.meta.env.VITE_API_URL) || '/api';

export const GOOGLE_CLIENT_ID = readEnvString(import.meta.env.VITE_GOOGLE_CLIENT_ID) || '866351374703-der7a0b0k82sssh0u5hnogcsen065pid.apps.googleusercontent.com';

export const PUBLIC_ASSETS_BASE_URL = trimTrailingSlash(
    normalizeGoogleCloudUrl(import.meta.env.VITE_PUBLIC_ASSETS_BASE_URL)
);

export const buildAssetUrl = (path = '') => {
    const normalizedPath = normalizePathSlashes(readEnvString(path));

    if (!normalizedPath) {
        return '';
    }

    if (/^(https?:\/\/|gs:\/\/)/i.test(normalizedPath)) {
        return safeEncodeUrl(normalizeGoogleCloudUrl(normalizedPath));
    }

    if (!PUBLIC_ASSETS_BASE_URL) {
        return safeEncodeUrl(normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`);
    }

    return safeEncodeUrl(`${PUBLIC_ASSETS_BASE_URL}/${trimLeadingSlash(normalizedPath)}`);
};

export const AUTH_BACKGROUND_URL = buildAssetUrl(
    import.meta.env.VITE_AUTH_BACKGROUND_URL || import.meta.env.VITE_AUTH_BACKGROUND_PATH
);
