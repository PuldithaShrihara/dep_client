import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            const res = await login(username, password);
            if (res.success) {
                navigate('/');
            } else {
                setError(res.message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-slate-100 dark:bg-slate-950">
            <div className="absolute top-4 right-4 z-20">
                <ThemeToggle />
            </div>
            {/* Creative Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/[0.18] dark:bg-indigo-500/20 rounded-full blur-[120px] animate-pulse-glow" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/[0.08] dark:bg-pink-500/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '-2s' }} />

            <div className="absolute top-1/4 right-1/4 w-12 h-12 bg-slate-300/50 border border-slate-400/30 dark:bg-white/5 dark:border-white/10 rounded-xl animate-float" />
            <div className="absolute bottom-1/3 left-1/3 w-8 h-8 bg-indigo-500/15 border border-indigo-300/40 dark:bg-indigo-500/10 dark:border-indigo-500/20 rounded-full animate-float" style={{ animationDelay: '-1.5s' }} />
            <div className="absolute top-1/2 left-10 w-4 h-4 bg-pink-400/25 dark:bg-pink-500/20 rounded-full blur-sm" />

            {/* Login Container */}
            <div className="relative w-full max-w-[440px] entrance-animation">
                <div className="glass-panel rounded-[32px] p-8 md:p-10 border border-slate-200/80 dark:border-white/10 shadow-[0_32px_64px_-16px_rgba(15,23,42,0.12)] dark:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 dark:bg-indigo-600/20 dark:border-indigo-500/30 mb-6 group transition-all duration-500 hover:scale-110">
                            <Lock className="text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors" size={28} />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
                            Portal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">Access</span>
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Department Plan Monitoring System</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-3 p-4 mb-8 text-sm text-red-100 bg-red-500/10 border border-red-500/20 rounded-2xl animate-shake">
                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Identity</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:bg-slate-900/30 dark:border-white/5 dark:placeholder:text-slate-600 dark:text-slate-200"
                                    placeholder="Username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Secure Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={20} />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:bg-slate-900/30 dark:border-white/5 dark:placeholder:text-slate-600 dark:text-slate-200"
                                    placeholder="Password"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="group relative w-full py-4 mt-4 overflow-hidden rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            <div className="relative z-10 flex items-center justify-center gap-2">
                                {isSubmitting ? 'Authenticating...' : 'Enter System'}
                                {!isSubmitting && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </form>

                    <p className="text-center mt-10 text-xs font-medium text-slate-600 dark:text-slate-500">
                        Restricted Access. Secured by <span className="text-indigo-600 dark:text-indigo-400">DPMS AI</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
