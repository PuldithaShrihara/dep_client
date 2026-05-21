import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <div className="max-w-xl w-full rounded-[32px] border border-slate-200/70 dark:border-white/10 bg-white/90 dark:bg-slate-900/95 p-10 shadow-2xl">
            <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white">
                Unauthorized Access
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
                You do not have permission to view this page.
            </p>
            <Link
                to="/dashboard"
                className="inline-flex mt-8 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
                Go to Dashboard
            </Link>
        </div>
    </div>
);

export default Unauthorized;
