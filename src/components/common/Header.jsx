import React from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { canViewAdminArea } from '../../utils/roles';
import ThemeToggle from '../ThemeToggle';

const Header = ({ 
    title = 'Admin Department', 
    subtitle = 'User & access control', 
    icon: Icon = LayoutDashboard,
    iconBg = 'bg-violet-600',
    showUsersLink = true,
    showNexusLink = true
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="sticky top-0 z-50 border-b backdrop-blur-xl shadow-sm border-slate-200/90 bg-white/90 dark:bg-slate-950/90 dark:border-white/10 shadow-slate-200/30 dark:shadow-none">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center py-3 sm:h-auto sm:py-0 sm:min-h-[4rem]">
                    <div className="flex items-center gap-4">
                        <div 
                            className={`p-2 ${iconBg} rounded-xl shadow-lg shadow-violet-600/20 shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95`}
                            onClick={() => window.location.href = '/dashboard'}
                            title="Go to Dashboard"
                        >
                            <Icon className="text-white" size={20} />
                        </div>
                        <div>
                            <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                {title}
                            </span>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-neutral-500 uppercase tracking-[0.2em]">
                                {subtitle}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <ThemeToggle />
                        {showUsersLink && canViewAdminArea(user) && (
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
                        {showNexusLink && (
                            <Link
                                to="/dashboard"
                                className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100/80 rounded-xl border border-indigo-200 dark:text-indigo-300 dark:hover:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10"
                            >
                                <ArrowLeft size={14} />
                                Department Nexus
                            </Link>
                        )}
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
    );
};

export default Header;
