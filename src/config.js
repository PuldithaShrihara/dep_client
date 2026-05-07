/**
 * API base URL (no trailing slash).
 * - In Vite dev, default is '' so requests use relative `/api/...` and the dev proxy forwards to Express.
 * - For production, set VITE_API_URL on your host (e.g. Render Static Site env at build time).
 * - If VITE_API_URL is missing in a static-site build, relative `/api/...` hits the *frontend* origin,
 *   so /api/auth/me fails and refresh logs you out. Fallback points at the deployed API.
 */
const fromEnv = import.meta.env.VITE_API_URL;
const trimmed = typeof fromEnv === 'string' ? fromEnv.trim() : '';

/** Same host as server default in this repo; override with VITE_API_URL for other deployments. */
const PRODUCTION_API_FALLBACK = 'https://dep-server-lwn2.onrender.com';

export const API_ORIGIN =
    trimmed !== ''
        ? trimmed.replace(/\/$/, '')
        : import.meta.env.DEV
          ? ''
          : PRODUCTION_API_FALLBACK;
