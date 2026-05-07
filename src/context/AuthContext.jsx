import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_ORIGIN } from '../config';

const AuthContext = createContext();

function clearStoredAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retries for Render cold start and transient 5xx; do not retry definitive auth failures. */
async function fetchMeWithRetries(token, maxAttempts = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await axios.get(`${API_ORIGIN}/api/auth/me`, {
                timeout: 12000,
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            lastErr = err;
            const status = err.response?.status;
            const noResponse = !err.response;
            const transient5xx =
                status === 500 ||
                (typeof status === 'number' && status >= 502 && status <= 504);
            if (status === 401 || status === 403) break;
            if (
                attempt < maxAttempts &&
                (noResponse || err.code === 'ECONNABORTED' || transient5xx)
            ) {
                await sleep(500 * attempt);
                continue;
            }
            break;
        }
    }
    throw lastErr;
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);
    const authBootstrapping = useRef(true);

    const logout = useCallback(() => {
        clearStoredAuth();
        setUser(null);
    }, []);

    /** Do not trust localStorage alone — JWT may be expired or signed with a different server secret. */
    useEffect(() => {
        let cancelled = false;
        const initAuth = async () => {
            authBootstrapping.current = true;
            const token = localStorage.getItem('token');
            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                authBootstrapping.current = false;
                return;
            }
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            const storedRaw = localStorage.getItem('user');
            let hydratedFromStorage = false;

            if (storedRaw && !cancelled) {
                try {
                    setUser(JSON.parse(storedRaw));
                    hydratedFromStorage = true;
                    setLoading(false);
                } catch {
                    hydratedFromStorage = false;
                }
            }

            try {
                const { data } = await fetchMeWithRetries(token);
                if (!cancelled) {
                    setUser(data);
                    localStorage.setItem('user', JSON.stringify(data));
                }
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    clearStoredAuth();
                    if (!cancelled) setUser(null);
                } else if (!hydratedFromStorage) {
                    // Transient failure: keep token; restore profile from storage if still present.
                    const stored = localStorage.getItem('user');
                    if (stored && !cancelled) {
                        try {
                            setUser(JSON.parse(stored));
                        } catch {
                            clearStoredAuth();
                            if (!cancelled) setUser(null);
                        }
                    } else if (!cancelled) {
                        setUser(null);
                    }
                }
                // If hydratedFromStorage, keep cached user on network/5xx during refresh.
            } finally {
                if (!cancelled) {
                    if (!hydratedFromStorage) {
                        setLoading(false);
                    }
                }
                authBootstrapping.current = false;
            }
        };
        initAuth();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        const id = axios.interceptors.response.use(
            (res) => res,
            (err) => {
                const status = err.response?.status;
                const url = String(err.config?.url || '');
                if (status === 401 && !url.includes('/api/auth/login')) {
                    // Avoid clearing session on the very first /me check while we are still bootstrapping —
                    // initAuth will decide using the response.
                    if (url.includes('/api/auth/me') && authBootstrapping.current) {
                        return Promise.reject(err);
                    }
                    logout();
                }
                return Promise.reject(err);
            }
        );
        return () => axios.interceptors.response.eject(id);
    }, [logout]);

    const login = async (username, password) => {
        try {
            const res = await axios.post(`${API_ORIGIN}/api/auth/login`, { username, password });
            const { token, user: userData } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            setUser(userData);
            return { success: true, user: userData };
        } catch (err) {
            return { success: false, message: err.response?.data?.message || 'Login failed' };
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
