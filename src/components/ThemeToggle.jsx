import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div
            className="inline-flex rounded-full p-1 bg-slate-200/95 dark:bg-slate-800/95 border border-slate-300/90 dark:border-slate-600/60 shadow-sm"
            role="group"
            aria-label="Color theme"
        >
            <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-2 sm:px-3.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 sm:min-h-[2.25rem] ${
                    !isDark
                        ? 'bg-white text-slate-900 shadow-md ring-1 ring-amber-500/35 dark:ring-slate-600'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                aria-pressed={!isDark}
                aria-label="Use light theme"
            >
                <Sun size={16} className={!isDark ? 'text-amber-500' : 'opacity-70'} strokeWidth={2.25} />
                <span className="hidden sm:inline uppercase">Light</span>
            </button>
            <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-1.5 rounded-full px-2.5 py-2 sm:px-3.5 text-[10px] font-black uppercase tracking-widest transition-all duration-200 sm:min-h-[2.25rem] ${
                    isDark
                        ? 'bg-amber-950/80 text-amber-50 shadow-md ring-1 ring-amber-500/35'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                aria-pressed={isDark}
                aria-label="Use dark theme"
            >
                <Moon size={16} className={isDark ? 'text-indigo-200' : 'opacity-70'} strokeWidth={2.25} />
                <span className="hidden sm:inline uppercase">Dark</span>
            </button>
        </div>
    );
};

export default ThemeToggle;
