import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_ORIGIN } from '../config';

const AuthContext = createContext();

function clearStoredAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        clearStoredAuth();
        setUser(null);
    }, []);

    /** Do not trust localStorage alone — JWT may be expired or signed with a different server secret. */
    useEffect(() => {
        let cancelled = false;
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                if (!cancelled) {
                    setUser(null);
                    setLoading(false);
                }
                return;
            }
            console.log(`[Auth] Initializing with API_ORIGIN: "${API_ORIGIN}"`);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            try {
                const { data } = await axios.get(`${API_ORIGIN}/api/auth/me`, {
                    timeout: 8000 // Reduced timeout for faster fallback
                });
                if (!cancelled) {
                    setUser(data);
                    localStorage.setItem('user', JSON.stringify(data));
                }
            } catch (err) {
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                    clearStoredAuth();
                    if (!cancelled) setUser(null);
                } else {
                    const stored = localStorage.getItem('user');
                    if (stored && !cancelled) {
                        try {
                            setUser(JSON.parse(stored));
                        } catch {
                            clearStoredAuth();
                            setUser(null);
                        }
                    } else if (!cancelled) {
                        setUser(null);
                    }
                }
            } finally {
                if (!cancelled) {
                    console.log('[Auth] Initialization complete, setting loading to false');
                    setLoading(false);
                }
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
