import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, LogOut, Briefcase, DollarSign, Cpu,
    ShieldCheck, Factory, TrendingUp, Users, Calendar, ArrowUpRight,
    X, Plus, Clock, Target, CheckCircle2, Trash2
} from 'lucide-react';
import MarketingSheet from '../components/marketing/MarketingSheet.jsx';
import RnDSheet from '../components/rnd/RnDSheet.jsx';
import FinanceSheet from '../components/finance/FinanceSheet.jsx';
import { API_ORIGIN } from '../config';
import { migrateLegacyRdTasksToNested, isSubtaskComplete } from '../utils/rnd/rdTasks';
import { getAxiosErrorMessage } from '../utils/toastHelpers';
import { canEditPlans, isAdmin, isDepartmentHead, canEditDepartment } from '../utils/roles';
import ThemeToggle from '../components/ThemeToggle';

const EMPTY_TASKS = [];

const MONTH_NAMES_LOWER = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];

/** Plan.month may be a name ("March") or 1–12 */
function planMonthToNumber(monthVal) {
    if (monthVal == null || monthVal === '') return null;
    const n = parseInt(String(monthVal).trim(), 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
    const idx = MONTH_NAMES_LOWER.indexOf(String(monthVal).trim().toLowerCase());
    if (idx >= 0) return idx + 1;
    return null;
}

function getRdMainTasksForPlan(plan) {
    if (Array.isArray(plan.rdMainTasks) && plan.rdMainTasks.length > 0) {
        return plan.rdMainTasks;
    }
    return migrateLegacyRdTasksToNested(plan.tasks || []);
}

function planHasProgressData(plan, deptName) {
    if (deptName === 'R&D') {
        return getRdMainTasksForPlan(plan).length > 0 || (plan.tasks?.length > 0);
    }
    if (deptName === 'Admin') {
        return !!plan.hrStats;
    }
    return plan.tasks?.length > 0;
}

const Dashboard = () => {
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [activePlan, setActivePlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState(null);
    const [loadingPlans, setLoadingPlans] = useState(false);
    const [newPlan, setNewPlan] = useState({
        month: '',
        year: new Date().getFullYear(),
        title: '',
        description: '',
        target: ''
    });
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const visibleDepartments = useMemo(() => {
        if (!user) return [];
        return departments;
    }, [departments, user]);

    const canEdit = canEditPlans(user);

    // Calculate completion percentage for a plan
    const calculateCompletionPercentage = (plan, departmentName) => {
        if (departmentName === 'R&D') {
            const mts = getRdMainTasksForPlan(plan);
            if (!mts.length) {
                return { percentage: 0, completed: 0, total: 0, type: 'subtasks' };
            }

            let totalItems = 0;
            let completedItems = 0;

            for (const mt of mts) {
                const subs = (mt.subtasks || []).filter(s => (s.title || '').trim() !== '');
                if (subs.length > 0) {
                    totalItems += subs.length;
                    for (const s of subs) {
                        if (isSubtaskComplete(s)) {
                            completedItems += 1;
                        }
                    }
                } else if ((mt.title || '').trim() !== '') {
                    // Count main task itself if it has no subtasks
                    totalItems += 1;
                    if ((mt.status || '').toLowerCase() === 'completed') {
                        completedItems += 1;
                    }
                }
            }

            if (totalItems === 0) return { percentage: 0, completed: 0, total: 0, type: 'subtasks' };
            const percentage = Math.round((completedItems / totalItems) * 100);
            return {
                percentage,
                completed: completedItems,
                total: totalItems,
                type: 'subtasks'
            };
        }

        if (departmentName === 'Admin' && plan.hrStats) {
            return {
                percentage: plan.hrStats.percentage,
                completed: plan.hrStats.completed,
                total: plan.hrStats.total,
                type: 'tasks'
            };
        }

        if (!plan.tasks || plan.tasks.length === 0) {
            return { percentage: 0, completed: 0, total: 0, type: 'tasks' };
        }

        const validTasks = plan.tasks.filter(task =>
            task.product || task.mainGoal || task.description || task.marketingChannel
        );

        if (validTasks.length === 0) {
            return { percentage: 0, completed: 0, total: 0, type: 'tasks' };
        }

        const completedTasks = validTasks.filter(task => {
            const status = (task.status || '').toLowerCase();
            return status === 'completed' ||
                status === 'published' ||
                task.done === true;
        });

        const percentage = Math.round((completedTasks.length / validTasks.length) * 100);
        return { percentage, completed: completedTasks.length, total: validTasks.length, type: 'tasks' };
    };

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/departments', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setDepartments(res.data);
            } catch (err) {
                console.error('Error fetching departments:', err.response?.data || err.message);
            }
        };
        fetchDepartments();
    }, []);

    const fetchPlans = async (deptId) => {
        setLoadingPlans(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/plans/department/${deptId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlans(res.data);
        } catch (err) {
            console.error('Error fetching plans:', err.response?.data || err.message);
        } finally {
            setLoadingPlans(false);
        }
    };

    const handleDeptClick = (dept) => {
        setSelectedDept(dept);
        fetchPlans(dept._id);
        setShowPlanModal(true);
        setActivePlan(null);
        // Admin department: go straight to the new-plan form (same as "Create New Plan") when allowed to edit
        setShowCreateForm(dept.name === 'Admin' && canEditDepartment(user, dept.name));
    };

    const handleCreatePlan = async (e) => {
        e.preventDefault();
        if (!canEditDepartment(user, selectedDept?.name)) {
            toast.error('You do not have permission to create plans');
            return;
        }
        setCreatingPlan(true);
        const toastId = toast.loading('Saving...', { id: 'create-plan' });
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/plans', {
                ...newPlan,
                department: selectedDept._id
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlans([res.data, ...plans]);
            setNewPlan({
                month: '',
                year: new Date().getFullYear(),
                title: '',
                description: '',
                target: ''
            });
            setShowCreateForm(false);
            toast.success('Plan created successfully', { id: toastId });
        } catch (err) {
            console.error('Error creating plan:', err.response?.data || err.message);
            toast.error(getAxiosErrorMessage(err, 'Failed to create plan'), { id: toastId });
        } finally {
            setCreatingPlan(false);
        }
    };

    const handlePlanCardClick = (plan) => {
        if (selectedDept?.name === 'Admin') {
            const m = planMonthToNumber(plan.month);
            const y = parseInt(plan.year, 10);
            if (m && Number.isFinite(y) && y >= 2000 && y <= 2100) {
                navigate(`/admin/hr?month=${m}&year=${y}`);
            } else {
                navigate('/admin/hr');
            }
            return;
        }
        if (
            selectedDept?.name === 'Marketing' ||
            selectedDept?.name === 'R&D' ||
            selectedDept?.name === 'Finance'
        ) {
            setActivePlan(plan);
        }
    };

    const handleDeletePlan = async (planId, e) => {
        e.stopPropagation(); // Prevent opening the sheet if clicking delete
        if (!canEditDepartment(user, selectedDept?.name)) return;
        if (!window.confirm('Are you sure you want to delete this plan?')) return;

        setDeletingPlanId(planId);
        const toastId = toast.loading('Deleting...', { id: `delete-plan-${planId}` });
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/plans/${planId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setPlans(plans.filter(p => p._id !== planId));
            toast.success('Plan deleted successfully', { id: toastId });
        } catch (err) {
            console.error('Error deleting plan:', err.response?.data || err.message);
            toast.error(getAxiosErrorMessage(err, 'Failed to delete plan'), { id: toastId });
        } finally {
            setDeletingPlanId(null);
        }
    };

    const getIcon = (name) => {
        switch (name) {
            case 'Marketing': return <Briefcase className="text-indigo-600 dark:text-indigo-400" />;
            case 'Finance': return <DollarSign className="text-emerald-600 dark:text-emerald-400" />;
            case 'R&D': return <Cpu className="text-amber-600 dark:text-amber-400" />;
            case 'Admin': return <ShieldCheck className="text-blue-600 dark:text-blue-400" />;
            case 'Production': return <Factory className="text-rose-600 dark:text-rose-400" />;
            default: return <LayoutDashboard className="text-slate-500 dark:text-slate-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-indigo-500/30 dark:bg-[#020617] dark:text-slate-200">
            {/* Background Gradients */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/[0.12] rounded-full blur-[120px] dark:bg-indigo-500/10" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/[0.1] rounded-full blur-[120px] dark:bg-violet-600/10" />
            </div>

            {/* Navbar — same surface family as page (no “floating light bar on dark canvas”) */}
            <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/90 dark:bg-slate-950/90 dark:border-white/10 backdrop-blur-xl shadow-sm shadow-slate-200/30 dark:shadow-none">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/20">
                                <LayoutDashboard className="text-white" size={20} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-black tracking-tight leading-none text-slate-900 dark:text-white">
                                    CORE <span className="text-indigo-500">SYSTEM</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest">DPMS v4.0</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-6">
                            <ThemeToggle />
                            {isAdmin(user?.role) && (
                                <Link
                                    to="/admin"
                                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-violet-700 hover:text-violet-900 bg-violet-100 hover:bg-violet-200/80 rounded-xl border border-violet-200 dark:text-violet-300 dark:hover:text-white dark:bg-violet-500/10 dark:hover:bg-violet-500/20 dark:border-violet-500/20"
                                >
                                    <Users size={14} />
                                    Admin
                                </Link>
                            )}
                            <div className="hidden md:flex items-center gap-4 border-r border-slate-200 dark:border-white/10 pr-6">
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">{user?.username}</p>
                                    <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">{user?.role}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border border-slate-300 dark:from-slate-800 dark:to-slate-900 dark:border-white/10 flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                                    {user?.username?.[0]?.toUpperCase()}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={logout}
                                className="group flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-all bg-white/80 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 dark:text-slate-400 dark:hover:text-white dark:bg-white/5 dark:hover:bg-red-500/20 dark:border-white/5 dark:hover:border-red-500/30"
                            >
                                <LogOut size={16} className="group-hover:rotate-12 transition-transform" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative">
                <header className="mb-12 entrance-animation">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">
                        <TrendingUp size={14} />
                        <span>Real-time Analytics</span>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
                        Department <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 dark:from-indigo-400 dark:via-violet-400 dark:to-pink-400">Nexus</span>
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl text-lg font-medium leading-relaxed">
                        Organize and monitor performance metrics across the entire organizational structure.
                        {user && !isAdmin(user?.role) && (
                            <span className="block mt-2 text-amber-800 dark:text-amber-200/90 text-base flex gap-2 items-center">
                                {isDepartmentHead(user?.role) && user.department ? `You have editable access to the ${user.department} department.` : 'Read-only access: you can review all modules but cannot create, edit, or delete data.'}
                            </span>
                        )}
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {visibleDepartments.map((dept, idx) => (
                        <div
                            key={dept._id}
                            className="group relative flex flex-col p-8 rounded-[28px] bg-white text-slate-900 shadow-lg shadow-slate-200/40 ring-1 ring-slate-200/90 hover:ring-indigo-300/60 dark:bg-slate-900/95 dark:text-slate-50 dark:shadow-xl dark:shadow-black/25 dark:ring-white/10 dark:hover:ring-indigo-500/35 transition-all duration-500 hover:-translate-y-2 cursor-pointer entrance-animation overflow-hidden"
                            onClick={() => handleDeptClick(dept)}
                            style={{ animationDelay: `${idx * 0.1}s` }}
                        >
                            {/* Decorative Background Icon */}
                            <div className="absolute top-[-20%] right-[-10%] p-8 opacity-[0.06] dark:opacity-[0.04] group-hover:opacity-[0.12] dark:group-hover:opacity-[0.08] transition-all duration-700 group-hover:scale-110 group-hover:rotate-12 text-slate-900 dark:text-white">
                                {React.cloneElement(getIcon(dept.name), { size: 200 })}
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/90 group-hover:bg-indigo-50 group-hover:border-indigo-200/80 dark:bg-slate-800/90 dark:border-white/10 dark:group-hover:bg-indigo-950/50 dark:group-hover:border-indigo-500/30 group-hover:scale-110 transition-all duration-500 shadow-sm">
                                        {React.cloneElement(getIcon(dept.name), { size: 24 })}
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-slate-200 bg-white dark:bg-slate-800/80 dark:border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                        <ArrowUpRight size={20} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-50 mb-3 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                    {dept.name}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed mb-10 line-clamp-2">
                                    {dept.description || 'Optimizing workflows and ensuring strategic alignment for departmental growth.'}
                                </p>

                                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-200 bg-slate-200 dark:border-[#020617] dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-500">
                                                {String.fromCharCode(64 + i)}
                                            </div>
                                        ))}
                                        <div className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-[#020617] bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                                            +4
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Efficiency</div>
                                        <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">88.4%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Hover shine */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/[0.06] dark:via-white/[0.06] to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out pointer-events-none" />
                        </div>
                    ))}

                    {/* Admin Action Card */}
                    {user?.role === 'Admin' && (
                        <div className="group relative flex flex-col items-center justify-center p-8 rounded-[28px] border-2 border-dashed border-slate-300 hover:border-indigo-400/70 dark:border-slate-600/50 dark:hover:border-indigo-500/50 bg-slate-50 hover:bg-indigo-50/80 dark:bg-slate-900/40 dark:hover:bg-indigo-950/30 transition-all duration-500 cursor-pointer min-h-[340px] entrance-animation ring-1 ring-slate-200/80 dark:ring-white/5"
                            style={{ animationDelay: `${visibleDepartments.length * 0.1}s` }}>
                            <div className="w-16 h-16 rounded-full bg-slate-200 group-hover:bg-indigo-600 dark:bg-slate-800 dark:group-hover:bg-indigo-600 transition-all duration-500 flex items-center justify-center text-4xl text-slate-600 group-hover:text-white group-hover:scale-110 mb-4 shadow-inner">
                                +
                            </div>
                            <span className="font-black text-slate-600 group-hover:text-indigo-700 dark:text-slate-400 dark:group-hover:text-indigo-300 uppercase tracking-widest text-xs">Create Unit</span>
                        </div>
                    )}
                </div>
            </main>

            {/* Plan Modal */}
            {showPlanModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-[#020617]/80" onClick={() => setShowPlanModal(false)} />

                    <div className={`relative w-full transition-all duration-500 overflow-hidden glass-panel border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col entrance-animation ${((activePlan || showCreateForm) && (selectedDept?.name === 'Marketing' || selectedDept?.name === 'R&D' || selectedDept?.name === 'Finance'))
                        ? 'max-w-none h-screen rounded-none'
                        : 'max-w-4xl max-h-[90vh] rounded-[40px]'
                        }`}>
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/5 flex justify-between items-center bg-white/40 dark:bg-white/[0.02]">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                                        {selectedDept && React.cloneElement(getIcon(selectedDept.name), { size: 16 })}
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                        {selectedDept?.name} Plans
                                        {canEditDepartment(user, selectedDept?.name) ? (
                                            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] uppercase rounded-lg border border-indigo-500/20 tracking-widest mt-1">Editable</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] uppercase rounded-lg border border-amber-500/20 tracking-widest mt-1">View Only</span>
                                        )}
                                    </h3>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Monthly strategic objectives and performance targets</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPlanModal(false)}
                                className="p-2 hover:bg-slate-200/80 dark:hover:bg-white/5 rounded-xl text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden p-8 flex flex-col">
                            {((activePlan || showCreateForm) && (selectedDept?.name === 'Marketing' || selectedDept?.name === 'R&D' || selectedDept?.name === 'Finance')) ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActivePlan(null);
                                            setShowCreateForm(false);
                                        }}
                                        className="mb-4 text-xs font-black text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 w-max"
                                    >
                                        ← Back to Plans
                                    </button>
                                    {selectedDept?.name === 'Marketing' ? (
                                        <MarketingSheet
                                            key={activePlan?._id || 'new'}
                                            planId={activePlan?._id}
                                            initialTasks={activePlan?.tasks || []}
                                            initialTitle={activePlan?.title || ''}
                                            initialMonth={activePlan?.month || ''}
                                            initialYear={activePlan?.year || new Date().getFullYear()}
                                            initialTarget={activePlan?.target || ''}
                                            initialDescription={activePlan?.description || ''}
                                            isNew={showCreateForm}
                                            deptId={selectedDept?._id}
                                            readOnly={!canEditDepartment(user, selectedDept?.name)}
                                            onSuccess={(updatedPlan) => {
                                                fetchPlans(selectedDept._id);
                                                setPlans(prevPlans => {
                                                    const exists = prevPlans.find(p => p._id === updatedPlan._id);
                                                    if (exists) {
                                                        return prevPlans.map(p => p._id === updatedPlan._id ? updatedPlan : p);
                                                    }
                                                    return [updatedPlan, ...prevPlans];
                                                });
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                            }}
                                        />
                                    ) : selectedDept?.name === 'R&D' ? (
                                        <RnDSheet
                                            key={`rnd-${activePlan?._id || 'new'}-${activePlan?.updatedAt || (showCreateForm ? 'create' : '')}`}
                                            planId={activePlan?._id}
                                            initialRdMainTasks={activePlan?.rdMainTasks}
                                            initialTasks={activePlan?.tasks ?? EMPTY_TASKS}
                                            initialTitle={activePlan?.title || ''}
                                            initialMonth={activePlan?.month || ''}
                                            initialYear={activePlan?.year || new Date().getFullYear()}
                                            initialTarget={activePlan?.target || ''}
                                            initialDescription={activePlan?.description || ''}
                                            isNew={showCreateForm}
                                            deptId={selectedDept?._id}
                                            readOnly={!canEditDepartment(user, selectedDept?.name)}
                                            onSuccess={(updatedPlan) => {
                                                fetchPlans(selectedDept._id);
                                                setPlans(prevPlans => {
                                                    const exists = prevPlans.find(p => p._id === updatedPlan._id);
                                                    if (exists) {
                                                        return prevPlans.map(p => p._id === updatedPlan._id ? updatedPlan : p);
                                                    }
                                                    return [updatedPlan, ...prevPlans];
                                                });
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                            }}
                                        />
                                    ) : (
                                        <FinanceSheet
                                            key={activePlan?._id || 'new_finance'}
                                            planId={activePlan?._id}
                                            initialTasks={activePlan?.tasks || []}
                                            initialTitle={activePlan?.title || ''}
                                            initialMonth={activePlan?.month || ''}
                                            initialYear={activePlan?.year || new Date().getFullYear()}
                                            initialTarget={activePlan?.target || ''}
                                            initialDescription={activePlan?.description || ''}
                                            isNew={showCreateForm}
                                            deptId={selectedDept?._id}
                                            readOnly={!canEditDepartment(user, selectedDept?.name)}
                                            onSuccess={(updatedPlan) => {
                                                fetchPlans(selectedDept._id);
                                                setPlans(prevPlans => {
                                                    const exists = prevPlans.find(p => p._id === updatedPlan._id);
                                                    if (exists) {
                                                        return prevPlans.map(p => p._id === updatedPlan._id ? updatedPlan : p);
                                                    }
                                                    return [updatedPlan, ...prevPlans];
                                                });
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                            }}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
                                    {/* Left Column: Plan List */}
                                    <div className="flex flex-col min-h-0 max-h-[600px] lg:max-h-none">
                                        <div className="flex items-center justify-between mb-4 shrink-0">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Existing Plans</h4>
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-black rounded-full border border-indigo-200 dark:border-indigo-500/20">
                                                {plans.length} TOTAL
                                            </span>
                                        </div>

                                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-3 space-y-4">

                                            {loadingPlans ? (
                                                <div className="flex items-center justify-center py-20">
                                                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                                </div>
                                            ) : plans.length === 0 ? (
                                                <div className="bg-slate-100/80 border border-dashed border-slate-300 rounded-3xl p-12 text-center dark:bg-white/[0.02] dark:border-white/10">
                                                    <Calendar className="mx-auto text-slate-400 dark:text-slate-700 mb-4" size={48} />
                                                    <p className="text-slate-600 dark:text-slate-500 font-bold">No plans established for this department yet.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {plans.map((plan) => (
                                                        <div
                                                            key={plan._id}
                                                            role="button"
                                                            tabIndex={0}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    handlePlanCardClick(plan);
                                                                }
                                                            }}
                                                            onClick={() => handlePlanCardClick(plan)}
                                                            className={`group p-6 rounded-3xl bg-white/60 border border-slate-200/90 hover:border-indigo-400/50 dark:bg-white/[0.03] dark:border-white/5 dark:hover:border-indigo-500/30 transition-all duration-300 ${selectedDept?.name === 'Admin' && isAdmin(user?.role)
                                                                ? 'cursor-pointer'
                                                                : ''
                                                                } ${selectedDept?.name === 'Marketing' ||
                                                                    selectedDept?.name === 'R&D' ||
                                                                    selectedDept?.name === 'Finance'
                                                                    ? 'cursor-pointer'
                                                                    : ''
                                                                }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="text-[10px] font-black uppercase tracking-tighter text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                                                                            {plan.month} {plan.year}
                                                                        </span>
                                                                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${plan.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                            plan.status === 'In Progress' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-slate-400'
                                                                            }`}>
                                                                            {plan.status}
                                                                        </span>
                                                                    </div>
                                                                    <h5 className="text-lg font-bold text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{plan.title}</h5>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-2 rounded-xl bg-slate-200/80 text-slate-600 dark:bg-white/5 dark:text-slate-500">
                                                                        {plan.status === 'Completed' ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Clock size={18} />}
                                                                    </div>
                                                                    {canEditDepartment(user, selectedDept?.name) && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => handleDeletePlan(plan._id, e)}
                                                                            disabled={deletingPlanId === plan._id}
                                                                            className={`p-2 rounded-xl bg-slate-200/60 text-slate-600 dark:bg-white/5 dark:text-slate-500 transition-all border border-transparent hover:border-red-500/30 ${deletingPlanId === plan._id
                                                                                ? 'opacity-50 cursor-not-allowed hover:bg-slate-200/60 dark:hover:bg-white/5 hover:text-slate-500'
                                                                                : 'hover:bg-red-500/20 hover:text-red-400'
                                                                                }`}
                                                                            title="Delete Plan"
                                                                        >
                                                                            <Trash2 size={18} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar rounded-lg">
                                                                <p className={plan.description ? '' : 'text-slate-500 dark:text-slate-600 italic'}>
                                                                    {plan.description ||
                                                                        (selectedDept?.name === 'Admin'
                                                                            ? 'No description yet — click this card to open the HR task board for this month.'
                                                                            : 'No description yet — open the sheet to add operational details.')}
                                                                </p>
                                                            </div>

                                                            {/* Completion Percentage */}
                                                            {planHasProgressData(plan, selectedDept?.name) && (() => {
                                                                const completionData = calculateCompletionPercentage(plan, selectedDept?.name);

                                                                return (
                                                                    <div className="mb-4 p-3 bg-slate-100/90 rounded-2xl border border-slate-200/80 dark:bg-white/[0.02] dark:border-white/5">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progress</span>
                                                                            <span className="text-xs font-bold text-indigo-400">{completionData.percentage}%</span>
                                                                        </div>
                                                                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-3 auto-overflow-hidden relative">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all duration-700 ease-out relative ${completionData.percentage === 100 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' :
                                                                                    completionData.percentage >= 50 ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]' :
                                                                                        'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                                                                                    }`}
                                                                                style={{ width: `${completionData.percentage}%` }}
                                                                            >
                                                                                {/* Shine effect overlay */}
                                                                                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-pulse" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                                                                            <span>{completionData.completed} of {completionData.total}{' '}
                                                                                {completionData.type === 'mainTasks' ? 'main tasks' : completionData.type === 'subtasks' ? 'subtasks' : 'tasks'} completed</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 min-w-0">
                                                                    <Target size={14} className="shrink-0" />
                                                                    <span className="text-xs font-black uppercase tracking-widest truncate" title={plan.target || ''}>
                                                                        Target: {plan.target?.trim() ? plan.target : '—'}
                                                                    </span>
                                                                </div>
                                                                {selectedDept?.name === 'Admin' && isAdmin(user?.role) && (
                                                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-500 uppercase">
                                                                        HR tasks →
                                                                    </span>
                                                                )}
                                                                {(selectedDept?.name === 'Marketing' || selectedDept?.name === 'R&D' || selectedDept?.name === 'Finance') && (
                                                                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-500 uppercase">View Sheet →</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Create Plan Toggle */}
                                    <div className="space-y-6">
                                        {!showCreateForm ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-100/80 border border-dashed border-slate-300 rounded-[32px] min-h-[400px] dark:bg-white/[0.02] dark:border-white/10">
                                                {canEditDepartment(user, selectedDept?.name) ? (
                                                    <>
                                                        <div className="w-20 h-20 rounded-full bg-indigo-100 dark:bg-indigo-500/10 flex items-center justify-center mb-6">
                                                            <Plus size={40} className="text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Initialize Strategy</h4>
                                                        <p className="text-slate-600 dark:text-slate-500 text-center text-sm mb-8 max-w-[240px]">
                                                            Ready to deploy a new monthly plan for {selectedDept?.name}?
                                                        </p>
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCreateForm(true)}
                                                            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-[1.05] active:scale-[0.95] uppercase tracking-widest text-xs"
                                                        >
                                                            Create New Plan
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-20 h-20 rounded-full bg-slate-500/10 flex items-center justify-center mb-6">
                                                            <Target size={40} className="text-slate-500" />
                                                        </div>
                                                        <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">View only</h4>
                                                        <p className="text-slate-600 dark:text-slate-500 text-center text-sm max-w-[260px]">
                                                            You can open plans from the list but cannot create or edit them.
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                                                            <Plus size={14} className="text-emerald-400" />
                                                        </div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Initialize New Plan</h4>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCreateForm(false)}
                                                        className="text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>

                                                <form onSubmit={handleCreatePlan} className="space-y-4 bg-slate-50/90 p-8 rounded-[32px] border border-slate-200/80 dark:bg-white/[0.02] dark:border-white/5 entrance-animation">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Strategic Title</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            placeholder="e.g. Q1 Growth Initiative"
                                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 transition-all font-medium dark:bg-slate-900/50 dark:border-white/10 dark:text-white dark:placeholder:text-slate-600"
                                                            value={newPlan.title}
                                                            onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Month</label>
                                                            <select
                                                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:outline-none focus:border-indigo-500/50 transition-all font-medium dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                                                                value={newPlan.month}
                                                                onChange={(e) => setNewPlan({ ...newPlan, month: e.target.value })}
                                                                required
                                                            >
                                                                <option value="">Select</option>
                                                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                                                    <option key={m} value={m}>{m}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Year</label>
                                                            <input
                                                                type="number"
                                                                required
                                                                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 focus:outline-none focus:border-indigo-500/50 transition-all font-medium dark:bg-slate-900/50 dark:border-white/10 dark:text-white"
                                                                value={newPlan.year}
                                                                onChange={(e) => setNewPlan({ ...newPlan, year: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Details</label>
                                                        <textarea
                                                            rows="3"
                                                            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500/50 transition-all font-medium resize-none dark:bg-slate-900/50 dark:border-white/10 dark:text-white dark:placeholder:text-slate-600"
                                                            placeholder="Outline the core objectives..."
                                                            value={newPlan.description}
                                                            onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                                                        />
                                                    </div>

                                                    <button
                                                        type="submit"
                                                        disabled={creatingPlan}
                                                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs mt-4 disabled:hover:scale-[1] disabled:active:scale-[1]"
                                                    >
                                                        {creatingPlan ? 'Saving...' : 'Execute Deployment'}
                                                    </button>
                                                </form>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
