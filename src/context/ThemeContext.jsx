import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'dpms-theme';

const ThemeContext = createContext(null);

function readInitialTheme() {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s === 'light' || s === 'dark') return s;
    } catch {
        /* ignore */
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
        return 'light';
    }
    return 'dark';
}

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(readInitialTheme);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        try {
            localStorage.setItem(STORAGE_KEY, theme);
        } catch {
            /* ignore */
        }
    }, [theme]);

    const setTheme = (t) => {
        if (t === 'light' || t === 'dark') setThemeState(t);
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return ctx;
}
