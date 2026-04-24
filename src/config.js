/**
 * API base URL (no trailing slash).
 * - In Vite dev, default is '' so requests use relative `/api/...` and the dev proxy forwards to Express.
 * - Set VITE_API_URL if your API lives elsewhere (e.g. production).
 */
const fromEnv = import.meta.env.VITE_API_URL;
const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : '';

export const API_ORIGIN =
    trimmed !== ''
        ? trimmed.replace(/\/$/, '')
        : ''; // Use relative path by default
