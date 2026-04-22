import React from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, LogOut, ArrowLeft, Users } from 'lucide-react';
import { isAdmin, canViewAdminArea } from '../utils/roles';
import ThemeToggle from '../components/ThemeToggle';

const AdminLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isHr = location.pathname.includes('/admin/hr') || location.pathname === '/hr';

    return (
        <div
            className={`min-h-screen flex flex-col text-slate-800 dark:text-slate-200 ${isHr
                    ? 'bg-[#faf7f2] dark:bg-[#0d0d0d]'
                    : 'bg-slate-100 dark:bg-[#020617]'
                }`}
        >
            <div
                className={`fixed inset-0 overflow-hidden pointer-events-none ${isHr ? 'opacity-40 dark:opacity-25' : ''}`}
            >
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-500/[0.12] rounded-full blur-[120px] dark:bg-violet-600/10" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/[0.1] rounded-full blur-[120px] dark:bg-indigo-600/10" />
            </div>

            <nav
                className={`sticky top-0 z-50 border-b backdrop-blur-xl shadow-sm relative ${isHr
                        ? 'border-slate-200/90 bg-white/92 dark:border-neutral-800 dark:bg-[#121212]/95 dark:shadow-none'
                        : 'border-slate-200/90 bg-white/90 dark:bg-slate-950/90 dark:border-white/10 shadow-slate-200/30 dark:shadow-none'
                    }`}
            >
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3 sm:h-auto sm:py-0 sm:min-h-[4rem]">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-violet-600 rounded-xl shadow-lg shadow-violet-600/20 shrink-0">
                                <LayoutDashboard className="text-white" size={20} />
                            </div>
                            <div>
                                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    Admin Department
                                </span>
                                <p className="text-[10px] font-bold text-slate-600 dark:text-neutral-500 uppercase tracking-[0.2em]">
                                    {isHr ? 'HR task board & function areas' : 'User & access control'}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <ThemeToggle />
                            {canViewAdminArea(user) && (
                                <NavLink
                                    to="/admin"
                                    end
                                    className={({ isActive }) =>
                                        `inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl border transition-colors ${isActive
                                            ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                                            : 'text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100/80 border-violet-200 dark:text-violet-300 dark:hover:text-white dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:border-violet-500/20'
                                        }`
                                    }
                                >
                                    <Users size={14} />
                                    Users
                                </NavLink>
                            )}
                            <Link
                                to="/"
                                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl border border-indigo-200 dark:text-indigo-300 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10"
                            >
                                <ArrowLeft size={14} />
                                Department Nexus
                            </Link>
                            <span className="text-sm font-bold text-slate-900 dark:text-white hidden md:inline">{user?.username}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    logout();
                                    navigate('/login');
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-white/90 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-red-500/20 dark:border-white/5"
                            >
                                <LogOut size={16} />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main
                className={`relative flex flex-col min-h-0 ${isHr
                        ? 'max-w-none w-full px-4 sm:px-6 py-6 flex-1'
                        : 'max-w-7xl mx-auto px-6 py-8'
                    } ${isHr ? 'bg-transparent' : ''}`}
            >
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
