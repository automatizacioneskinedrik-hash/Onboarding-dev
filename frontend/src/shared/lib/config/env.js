const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const trimLeadingSlash = (value = '') => value.replace(/^\/+/, '');

export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const PUBLIC_ASSETS_BASE_URL = trimTrailingSlash(import.meta.env.VITE_PUBLIC_ASSETS_BASE_URL || '');

export const buildAssetUrl = (path = '') => {
    if (!path) {
        return '';
    }

    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    if (!PUBLIC_ASSETS_BASE_URL) {
        return path.startsWith('/') ? path : `/${path}`;
    }

    return `${PUBLIC_ASSETS_BASE_URL}/${trimLeadingSlash(path)}`;
};

export const AUTH_BACKGROUND_URL =
    import.meta.env.VITE_AUTH_BACKGROUND_URL ||
    buildAssetUrl(import.meta.env.VITE_AUTH_BACKGROUND_PATH || '');
