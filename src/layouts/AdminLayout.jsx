import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';

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

            <Header 
                title="Admin Department" 
                subtitle={isHr ? 'HR task board & function areas' : 'User & access control'} 
            />

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
