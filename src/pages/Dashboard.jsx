// Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    Briefcase, DollarSign, Cpu,
    ShieldCheck, Factory, TrendingUp, Users, Calendar, ArrowUpRight,
    X, Plus, Clock, Target, CheckCircle2, Trash2, ChevronLeft, Package, ArrowLeft, LayoutDashboard
} from 'lucide-react';
import Header from '../components/common/Header';

import MarketingSheet from '../components/marketing/MarketingSheet.jsx';
import RnDSheet from '../components/rnd/RnDSheet.jsx';
import FinanceSheet from '../components/finance/FinanceSheet.jsx';
import { API_ORIGIN } from '../config';
import { migrateLegacyRdTasksToNested, isSubtaskComplete } from '../utils/rnd/rdTasks';
import { getAxiosErrorMessage } from '../utils/toastHelpers';
import { canEditPlans, isAdmin, isDepartmentHead, canEditDepartment, canViewDepartment } from '../utils/roles';
import PlanDashboard from '../components/common/PlanDashboard';

const EMPTY_TASKS = [];

const MONTH_NAMES_LOWER = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
];

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
        return getRdMainTasksForPlan(plan).length > 0 || plan.tasks?.length > 0;
    }

    if (deptName === 'Admin') {
        return !!plan.hrStats;
    }

    if (deptName === 'Marketing') {
        return plan.tasks?.length > 0 || plan.products?.length > 0;
    }

    return plan.tasks?.length > 0;
}



const Dashboard = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialDeptId = urlParams.get('deptId');

    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState(null);
    const [activePlan, setActivePlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [plansPage, setPlansPage] = useState(1);
    const [hasMorePlans, setHasMorePlans] = useState(false);
    const [loadingMorePlans, setLoadingMorePlans] = useState(false);
    const [showPlanModal, setShowPlanModal] = useState(!!initialDeptId);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [creatingPlan, setCreatingPlan] = useState(false);
    const [deletingPlanId, setDeletingPlanId] = useState(null);
    const [loadingPlans, setLoadingPlans] = useState(!!initialDeptId);
    const [isEditingSheet, setIsEditingSheet] = useState(false);
    const [activeProductFilter, setActiveProductFilter] = useState(null);

    const [newPlan, setNewPlan] = useState({
        month: '',
        year: new Date().getFullYear(),
        title: '',
        description: '',
        target: ''
    });

    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const isFullScreen = (activePlan || (showCreateForm && ['Marketing', 'R&D', 'Finance'].includes(selectedDept?.name))) || searchParams.get('planId');

    const visibleDepartments = useMemo(() => {
        if (!user) return [];
        return departments.filter(dept => canViewDepartment(user, dept.name));
    }, [departments, user]);

    const sortedPlans = useMemo(() => {
        return [...plans].sort((a, b) => {
            const yearA = parseInt(a.year, 10) || 0;
            const yearB = parseInt(b.year, 10) || 0;
            if (yearA !== yearB) {
                return yearB - yearA; // Latest year first
            }
            const monthA = planMonthToNumber(a.month) || 0;
            const monthB = planMonthToNumber(b.month) || 0;
            return monthB - monthA; // Latest month first
        });
    }, [plans]);

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
                        if (isSubtaskComplete(s)) completedItems += 1;
                    }
                } else if ((mt.title || '').trim() !== '') {
                    totalItems += 1;

                    if ((mt.status || '').toLowerCase() === 'completed') {
                        completedItems += 1;
                    }
                }
            }

            if (totalItems === 0) {
                return { percentage: 0, completed: 0, total: 0, type: 'subtasks' };
            }

            return {
                percentage: Math.round((completedItems / totalItems) * 100),
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

        if (departmentName === 'Marketing') {
            const productMap = {};
            
            if (plan.products && plan.products.length > 0) {
                plan.products.forEach(p => {
                    const pName = typeof p === 'string' ? p : p.name;
                    if (pName && String(pName).trim()) {
                        productMap[String(pName).trim().toLowerCase()] = { sumPct: 0, count: 0, originalName: pName };
                    }
                });
            }

            if (plan.tasks && plan.tasks.length > 0) {
                // Find main tasks and their indices first
                const mainTasks = [];
                const mainTaskIndices = [];
                plan.tasks.forEach((task, idx) => {
                    const isSubtask = !!task._isSubtask || (task.product === '' && (task.mediaType !== '' || task.mainGoal !== ''));
                    if (isSubtask) return;
                    
                    const productName = task.assets || task.product;
                    if (!productName || !String(productName).trim()) return;
                    
                    mainTasks.push(task);
                    mainTaskIndices.push(idx);
                });

                mainTasks.forEach((task, i) => {
                    const mainTaskIdx = mainTaskIndices[i];
                    const productName = task.assets || task.product;
                    const key = String(productName).trim().toLowerCase();

                    if (!productMap[key]) {
                        productMap[key] = { sumPct: 0, count: 0, originalName: productName };
                    }

                    // Calculate main task completion percentage
                    const isRowCompleted = task.done || (task.status || '').toLowerCase() === 'completed' || (task.status || '').toLowerCase() === 'published';
                    let pct = 0;
                    if (isRowCompleted) {
                        pct = 100;
                    } else {
                        let totalSub = 0;
                        let doneSub = 0;
                        for (let sidx = mainTaskIdx + 1; sidx < plan.tasks.length; sidx++) {
                            const st = plan.tasks[sidx];
                            const isSt = !!st._isSubtask || (st.product === '' && (st.mediaType !== '' || st.mainGoal !== ''));
                            if (!isSt) break;
                            totalSub++;
                            if (st.done || (st.status || '').toLowerCase() === 'completed' || (st.status || '').toLowerCase() === 'published') {
                                doneSub++;
                            }
                        }
                        if (totalSub > 0) {
                            pct = Math.round((doneSub / totalSub) * 100);
                        }
                    }

                    productMap[key].sumPct += pct;
                    productMap[key].count += 1;
                });
            }

            const productsArr = Object.values(productMap);
            if (productsArr.length === 0) {
                return { percentage: 0, completed: 0, total: 0, type: 'tasks' };
            }

            let totalPercentage = 0;
            let fullyCompletedProducts = 0;
            productsArr.forEach(p => {
                const prodPct = p.count === 0 ? 0 : Math.round(p.sumPct / p.count);
                totalPercentage += prodPct;
                if (prodPct === 100) {
                    fullyCompletedProducts += 1;
                }
            });

            const finalPct = Math.round(totalPercentage / productsArr.length);

            return {
                percentage: finalPct,
                completed: fullyCompletedProducts,
                total: productsArr.length,
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
            return status === 'completed' || status === 'published' || task.done === true;
        });

        return {
            percentage: Math.round((completedTasks.length / validTasks.length) * 100),
            completed: completedTasks.length,
            total: validTasks.length,
            type: 'tasks'
        };
    };

    const calculateOverdueTasks = (plan, departmentName) => {
        let tasksToCheck = [];
        if (departmentName === 'R&D') {
            const mts = getRdMainTasksForPlan(plan);
            for (const mt of mts) {
                tasksToCheck.push(mt);
                if (mt.subtasks) {
                    tasksToCheck.push(...mt.subtasks);
                }
            }
        } else if (departmentName === 'Marketing' || departmentName === 'Finance') {
            tasksToCheck = plan.tasks || [];
        } else {
            return 0;
        }

        let overdueCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const task of tasksToCheck) {
            if (!task.endDate) continue;
            
            if (departmentName === 'Marketing') {
                const productName = task.assets || task.product;
                if (!productName || !String(productName).trim()) continue;
            }

            const endDate = new Date(task.endDate);
            if (isNaN(endDate.getTime())) continue;
            endDate.setHours(23, 59, 59, 999);

            let isComp = false;
            if (departmentName === 'R&D') {
                isComp = isSubtaskComplete(task) || (task.status || '').toLowerCase() === 'completed';
            } else {
                isComp = task.done || (task.status || '').toLowerCase() === 'completed' || (task.status || '').toLowerCase() === 'published';
            }

            if (!isComp && today.getTime() > endDate.getTime()) overdueCount++;
        }

        return overdueCount;
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');

            const res = await axios.get(`${API_ORIGIN}/api/departments`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setDepartments(res.data);
        } catch (err) {
            console.error('Error fetching departments:', err.response?.data || err.message);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchPlans = async (deptId, pageNum = 1, append = false, showSpinner = true) => {
        if (pageNum === 1) {
            if (showSpinner) {
                setLoadingPlans(true);
            }
        } else {
            setLoadingMorePlans(true);
        }

        try {
            const token = localStorage.getItem('token');

            const res = await axios.get(`${API_ORIGIN}/api/plans/department/${deptId}`, {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    page: pageNum,
                    limit: 10
                }
            });

            if (res.data && res.data.data !== undefined) {
                if (append) {
                    setPlans(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        const filtered = res.data.data.filter(p => !existingIds.has(p._id));
                        return [...prev, ...filtered];
                    });
                } else {
                    setPlans(res.data.data);
                }
                setHasMorePlans(res.data.hasNextPage);
                setPlansPage(pageNum);
            } else {
                setPlans(Array.isArray(res.data) ? res.data : []);
                setHasMorePlans(false);
                setPlansPage(1);
            }
        } catch (err) {
            console.error('Error fetching plans:', err.response?.data || err.message);
        } finally {
            setLoadingPlans(false);
            setLoadingMorePlans(false);
        }
    };

    const handleDeptClick = (dept) => {
        setSearchParams({ deptId: dept._id });
    };

    useEffect(() => {
        const deptId = searchParams.get('deptId');
        
        if (deptId && departments.length > 0) {
            const dept = departments.find(d => d._id === deptId);
            if (dept) {
                if (!selectedDept || selectedDept._id !== deptId) {
                    setSelectedDept(dept);
                    setShowPlanModal(true);
                    setActivePlan(null);
                    setShowCreateForm(dept.name === 'Admin' && canEditDepartment(user, dept.name));
                    fetchPlans(deptId);
                }
            } else {
                setSearchParams({});
            }
        } else if (!deptId && showPlanModal) {
            setShowPlanModal(false);
            setSelectedDept(null);
            setActivePlan(null);
            setShowCreateForm(false);
        }
    }, [searchParams, departments, user]);

    useEffect(() => {
        const planId = searchParams.get('planId');
        const product = searchParams.get('product');
        
        if (planId && plans.length > 0) {
            // Check if activePlan is already set to the current planId and fully loaded.
            // If so, do not fetch or reset activePlan to prevent unneeded resets!
            if (activePlan && activePlan._id === planId && activePlan.tasks !== undefined) {
                if (selectedDept?.name === 'Marketing') {
                    if (product) {
                        if (activeProductFilter !== product) {
                            setActiveProductFilter(product);
                            setIsEditingSheet(true);
                        }
                    } else {
                        if (activeProductFilter !== null || isEditingSheet !== false) {
                            setIsEditingSheet(false);
                            setActiveProductFilter(null);
                        }
                    }
                } else {
                    if (!isEditingSheet) {
                        setIsEditingSheet(true);
                    }
                }
                return;
            }

            const plan = plans.find(p => p._id === planId);
            if (plan && plan.tasks !== undefined && plan.rdMainTasks !== undefined) {
                if (!activePlan || activePlan._id !== planId) {
                    setActivePlan(plan);
                }
                
                if (selectedDept?.name === 'Marketing') {
                    if (product) {
                        setActiveProductFilter(product);
                        setIsEditingSheet(true);
                    } else {
                        setIsEditingSheet(false);
                        setActiveProductFilter(null);
                    }
                } else {
                    setIsEditingSheet(true);
                }
            } else {
                const fetchSinglePlan = async () => {
                    try {
                        const token = localStorage.getItem('token');
                        const res = await axios.get(`${API_ORIGIN}/api/plans/${planId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setPlans(prev => {
                            const exists = prev.some(p => p._id === res.data._id);
                            if (exists) return prev.map(p => p._id === res.data._id ? res.data : p);
                            return [res.data, ...prev];
                        });
                        setActivePlan(res.data);
                    } catch (err) {
                        const deptId = searchParams.get('deptId');
                        setSearchParams(deptId ? { deptId } : {});
                    }
                };
                fetchSinglePlan();
            }
        } else if (!planId && activePlan) {
            setActivePlan(null);
            setIsEditingSheet(false);
            setActiveProductFilter(null);
        }
    }, [searchParams, plans, selectedDept]);

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

            const res = await axios.post(`${API_ORIGIN}/api/plans`, {
                ...newPlan,
                department: selectedDept._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPlans(prev => {
                const exists = prev.some(plan => plan._id === res.data._id);
                if (exists) {
                    return prev.map(plan => plan._id === res.data._id ? res.data : plan);
                }
                return [res.data, ...prev];
            });
            fetchDepartments();

            setNewPlan({
                month: '',
                year: new Date().getFullYear(),
                title: '',
                description: '',
                target: ''
            });

            setShowCreateForm(false);
            
            // For Marketing, ensure we go to the product view after creation
            if (selectedDept?.name === 'Marketing') {
                setActivePlan(res.data);
                setIsEditingSheet(false);
                setActiveProductFilter(null);
                setSearchParams({ deptId: selectedDept._id, planId: res.data._id });
            } else {
                setActivePlan(res.data);
                setIsEditingSheet(true);
                setSearchParams({ deptId: selectedDept._id, planId: res.data._id });
            }
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
            setSearchParams({ deptId: selectedDept._id, planId: plan._id });
        }
    };

    const handleDeletePlan = async (planId, e) => {
        e.stopPropagation();

        if (!canEditDepartment(user, selectedDept?.name)) return;
        if (!window.confirm('Are you sure you want to delete this plan?')) return;

        setDeletingPlanId(planId);
        const toastId = toast.loading('Deleting...', { id: `delete-plan-${planId}` });

        try {
            const token = localStorage.getItem('token');

            await axios.delete(`${API_ORIGIN}/api/plans/${planId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setPlans(plans.filter(p => p._id !== planId));
            fetchDepartments();
            toast.success('Plan deleted successfully', { id: toastId });
        } catch (err) {
            console.error('Error deleting plan:', err.response?.data || err.message);
            toast.error(getAxiosErrorMessage(err, 'Failed to delete plan'), { id: toastId });
        } finally {
            setDeletingPlanId(null);
        }
    };

    const handleAddProduct = async (productName, productImageFile, description = '', category = '') => {
        if (!activePlan?._id) {
            toast.error('Please create or select a plan before adding products.');
            return;
        }
        if (!productImageFile) {
            toast.error('Please upload a product image.');
            return;
        }

        const toastId = toast.loading('Adding product...', { id: 'add-product' });
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', productName);
            formData.append('description', description);
            formData.append('category', category);
            formData.append('planId', activePlan._id);
            const deptId = selectedDept?._id || activePlan?.department?._id || activePlan?.department;
            formData.append('departmentId', deptId || '');
            if (productImageFile) {
                formData.append('image', productImageFile);
            }

            const productRes = await axios.post(`${API_ORIGIN}/api/products`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const createdProduct = productRes.data;
            
            const updatedPlan = {
                ...activePlan,
                products: [...(activePlan.products || []), createdProduct]
            };

            setActivePlan(updatedPlan);
            setPlans(plans.map(p => p._id === updatedPlan._id ? updatedPlan : p));

            toast.success('Product added successfully', { id: toastId });
        } catch (err) {
            console.error('Error adding product:', err.response?.data || err.message);
            toast.error(getAxiosErrorMessage(err, 'Failed to add product'), { id: toastId });
        }
    };

    const handleDeleteProduct = async (productName) => {
        if (!activePlan) return;

        const toastId = toast.loading(`Deleting ${productName}...`, { id: 'delete-product' });
        try {
            const token = localStorage.getItem('token');
            const res = await axios.delete(`${API_ORIGIN}/api/plans/${activePlan._id}/products/${productName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setActivePlan(res.data);
            setPlans(plans.map(p => p._id === res.data._id ? res.data : p));
            toast.success('Product deleted successfully', { id: toastId });
        } catch (err) {
            console.error('Error deleting product:', err.response?.data || err.message);
            toast.error(getAxiosErrorMessage(err, 'Failed to delete product'), { id: toastId });
        }
    };

    const getIcon = (name) => {
        switch (name) {
            case 'Marketing':
                return <Briefcase className="text-indigo-600 dark:text-indigo-400" />;
            case 'Finance':
                return <DollarSign className="text-emerald-600 dark:text-emerald-400" />;
            case 'R&D':
                return <Cpu className="text-amber-600 dark:text-amber-400" />;
            case 'Admin':
                return <ShieldCheck className="text-blue-600 dark:text-blue-400" />;
            case 'Production':
                return <Factory className="text-rose-600 dark:text-rose-400" />;
            default:
                return <LayoutDashboard className="text-slate-500 dark:text-slate-400" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-800 selection:bg-indigo-500/30 dark:bg-[#020617] dark:text-slate-200">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/[0.12] rounded-full blur-[120px] dark:bg-indigo-500/10" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/[0.1] rounded-full blur-[120px] dark:bg-violet-600/10" />
            </div>

            <Header 
                title="Department Nexus" 
                subtitle="CORE SYSTEM DPMS v4.0" 
                iconBg="bg-indigo-600"
                showNexusLink={false}
            />

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

                                <div className="mt-auto">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                            Current Progress
                                        </span>
                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                                            {dept.completionPercent || 0}%
                                        </span>
                                    </div>

                                    <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden border border-slate-200 dark:border-white/5">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000 ease-out"
                                            style={{ width: `${dept.completionPercent || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                    ))}
                </div>
            </main>

            {showPlanModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm dark:bg-[#020617]/80"
                        onClick={() => setSearchParams({})}
                    />

                    <div className={`relative w-full transition-all duration-500 overflow-hidden glass-panel border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col entrance-animation ${isFullScreen
                            ? 'max-w-none h-screen rounded-none'
                            : 'max-w-6xl max-h-[90vh] rounded-[40px]'
                        }`}>
                        {(!activePlan && !showCreateForm) && (
                            <div className="p-8 pb-4 bg-white/40 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/5">
                                <button
                                    type="button"
                                    aria-label="Close plans window"
                                    onClick={() => setSearchParams({})}
                                    className="absolute top-6 right-6 z-50 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <button 
                                    onClick={() => setSearchParams({})}
                                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition-all">
                                        <ArrowLeft size={16} className="group-hover:text-white transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Departments</span>
                                </button>
                            </div>
                        )}

                        <div className={`flex-1 overflow-auto ${(activePlan || showCreateForm) ? 'p-0' : 'p-8'}`}>
                            {(!selectedDept || loadingPlans || (searchParams.get('planId') && !activePlan)) ? (
                                <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
                                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
                                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-widest uppercase">
                                        {!selectedDept ? 'Initializing Secure Environment...' : 'Loading Plan Data...'}
                                    </p>
                                </div>
                            ) : (activePlan && !isEditingSheet && !showCreateForm) ? (
                                <div className="relative h-full">
                                    <button
                                        type="button"
                                        onClick={() => setSearchParams({})}
                                        className="absolute top-8 right-8 z-50 p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <PlanDashboard 
                                        plan={activePlan}
                                        onEdit={() => setIsEditingSheet(true)}
                                        onUpdatePlan={async (title, month) => {
                                            try {
                                                const res = await axios.put(`${API_ORIGIN}/api/plans/${activePlan._id}`, {
                                                    title, month
                                                }, {
                                                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                                                });
                                                setActivePlan(res.data);
                                                setPlans(prev => prev.map(p => p._id === res.data._id ? res.data : p));
                                                alert('Plan updated successfully');
                                            } catch (err) {
                                                console.error('Error updating plan:', err);
                                                alert('Error updating plan details');
                                            }
                                        }}
                                        onDelete={(e) => handleDeletePlan(activePlan._id, e)}
                                        onAddProduct={handleAddProduct}
                                        onDeleteProduct={handleDeleteProduct}
                                        onProductClick={(productName) => {
                                            setSearchParams({ deptId: selectedDept._id, planId: activePlan._id, product: productName });
                                            setActiveProductFilter(productName);
                                            setIsEditingSheet(true);
                                        }}
                                        readOnly={!canEditDepartment(user, selectedDept?.name)}
                                        onBack={() => {
                                            setSearchParams({ deptId: selectedDept._id });
                                        }}
                                    />
                                </div>
                            ) : ((activePlan || showCreateForm) && ['Marketing', 'R&D', 'Finance'].includes(selectedDept?.name)) ? (
                                <div className="flex-1 flex flex-col">
                                    <div className="px-8 pt-8 pb-4 bg-[#0a0f1d]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (showCreateForm) {
                                                    setSearchParams({});
                                                    setShowCreateForm(false);
                                                    setActiveProductFilter(null);
                                                } else if (selectedDept?.name !== 'Marketing') {
                                                    // For non-marketing, go back to plans list
                                                    setSearchParams({ deptId: selectedDept._id });
                                                } else {
                                                    // For Marketing, go back to product drill-down
                                                    setSearchParams({ deptId: selectedDept._id, planId: activePlan._id });
                                                    setIsEditingSheet(false);
                                                    setActiveProductFilter(null);
                                                }
                                            }}
                                            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition-all">
                                                <ArrowLeft size={16} className="group-hover:text-white transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                                                {showCreateForm ? 'Back to Departments' : (selectedDept?.name !== 'Marketing' ? 'Back to Plans' : 'Back to Products')}
                                            </span>
                                        </button>
                                    </div>

                                    {selectedDept?.name === 'Marketing' ? (
                                        <MarketingSheet
                                            planId={activePlan?._id}
                                            initialTasks={activePlan?.tasks || []}
                                            initialProducts={activePlan?.products || []}
                                            initialProductMetrics={activePlan?.productMetrics || []}
                                            initialTitle={activePlan?.title || ''}
                                            initialMonth={activePlan?.month || ''}
                                            initialYear={activePlan?.year || new Date().getFullYear()}
                                            initialTarget={activePlan?.target || ''}
                                            initialDescription={activePlan?.description || ''}
                                            isNew={showCreateForm}
                                            deptId={selectedDept?._id}
                                            readOnly={!canEditDepartment(user, selectedDept?.name)}
                                            onSuccess={(updatedPlan) => {
                                                fetchPlans(selectedDept._id, 1, false, false);
                                                fetchDepartments();
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                                if (activeProductFilter) {
                                                    setSearchParams({ deptId: selectedDept._id, planId: updatedPlan._id, product: activeProductFilter });
                                                } else {
                                                    setSearchParams({ deptId: selectedDept._id, planId: updatedPlan._id });
                                                }
                                            }}
                                            filterProduct={activeProductFilter}
                                        />
                                    ) : selectedDept?.name === 'R&D' ? (
                                        <RnDSheet
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
                                                fetchPlans(selectedDept._id, 1, false, false);
                                                fetchDepartments();
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                                setSearchParams({ deptId: selectedDept._id, planId: updatedPlan._id });
                                            }}
                                            filterProduct={activeProductFilter}
                                        />
                                    ) : (
                                        <FinanceSheet
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
                                                fetchPlans(selectedDept._id, 1, false, false);
                                                fetchDepartments();
                                                setShowCreateForm(false);
                                                setActivePlan(updatedPlan);
                                                setSearchParams({ deptId: selectedDept._id, planId: updatedPlan._id });
                                            }}
                                            filterProduct={activeProductFilter}
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                                Existing Plans
                                            </h4>
                                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 text-[10px] font-black rounded-full border border-indigo-200 dark:border-indigo-500/20">
                                                {plans.length} TOTAL
                                            </span>
                                        </div>

                                        {loadingPlans ? (
                                            <div className="flex items-center justify-center py-20">
                                                <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                            </div>
                                        ) : plans.length === 0 ? (
                                            <p className="text-slate-600 dark:text-slate-400 font-bold">
                                                No plans established for this department yet.
                                            </p>
                                        ) : (
                                            <div className="space-y-3">
                                                {sortedPlans.map(plan => {
                                                    const completionData = calculateCompletionPercentage(plan, selectedDept?.name);

                                                    return (
                                                        <div
                                                            key={plan._id}
                                                            onClick={() => handlePlanCardClick(plan)}
                                                            className="group p-4 rounded-2xl bg-white/60 border border-slate-200/90 hover:border-indigo-400/50 dark:bg-white/[0.03] dark:border-white/5 dark:hover:border-indigo-500/30 transition-all duration-300 cursor-pointer"
                                                        >
                                                            <div className="flex justify-between items-start mb-2.5">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md">
                                                                            {plan.month} {plan.year}
                                                                        </span>
                                                                        {(() => {
                                                                            const overdueCount = calculateOverdueTasks(plan, selectedDept?.name);
                                                                            if (overdueCount > 0) {
                                                                                return (
                                                                                    <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black tracking-widest flex items-center gap-1 border border-red-500/20">
                                                                                        <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse"></span>
                                                                                        {overdueCount} OVERDUE
                                                                                    </span>
                                                                                );
                                                                            }
                                                                            return null;
                                                                        })()}
                                                                    </div>

                                                                    <h5 className="text-base font-black text-slate-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-300 transition-colors uppercase tracking-tight mt-2.5">
                                                                        {plan.title}
                                                                    </h5>
                                                                </div>

                                                                {canEditDepartment(user, selectedDept?.name) && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleDeletePlan(plan._id, e)}
                                                                        disabled={deletingPlanId === plan._id}
                                                                        className="p-1.5 rounded-lg bg-slate-200/60 text-slate-600 dark:bg-white/5 dark:text-slate-500 hover:bg-red-500/20 hover:text-red-400"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <p className="text-slate-600 dark:text-slate-400 text-xs leading-normal mb-2.5">
                                                                {plan.description || 'No description yet.'}
                                                            </p>

                                                            {planHasProgressData(plan, selectedDept?.name) && (
                                                                <div className="p-2 bg-slate-100/90 rounded-xl border border-slate-200/80 dark:bg-white/[0.02] dark:border-white/5">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                            Progress
                                                                        </span>
                                                                        <span className="text-[10px] font-black text-indigo-400">
                                                                            {completionData.percentage}%
                                                                        </span>
                                                                    </div>

                                                                    <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden relative">
                                                                        <div
                                                                            className="h-full rounded-full transition-all duration-700 ease-out bg-indigo-500"
                                                                            style={{ width: `${completionData.percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {hasMorePlans && (
                                                    <div className="pt-4 flex justify-center">
                                                        <button
                                                            type="button"
                                                            disabled={loadingMorePlans}
                                                            onClick={() => fetchPlans(selectedDept._id, plansPage + 1, true)}
                                                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            {loadingMorePlans ? (
                                                                <>
                                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                    <span>Loading...</span>
                                                                </>
                                                            ) : (
                                                                <span>Load More Plans</span>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        {((!showCreateForm && selectedDept?.name !== 'Marketing') ? (
                                            <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-100/80 border border-dashed border-slate-300 rounded-[32px] min-h-[400px] dark:bg-white/[0.02] dark:border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCreateForm(true)}
                                                    className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest text-xs"
                                                >
                                                    Create New Plan
                                                </button>
                                            </div>
                                        ) : (
                                            <form
                                                onSubmit={handleCreatePlan}
                                                className="space-y-5 bg-slate-50/90 p-8 rounded-[32px] border border-slate-200/80 dark:bg-white/[0.02] dark:border-white/5"
                                            >
                                                <div className="mb-2">
                                                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Deploy New Plan</h3>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Initialize Marketing Cycle</p>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Plan Title</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. Summer Promo 2026"
                                                        className="w-full bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                                        value={newPlan.title}
                                                        onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Target Month</label>
                                                    <select
                                                        required
                                                        className="w-full bg-white border border-slate-200 dark:bg-slate-900/50 dark:border-white/10 rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer"
                                                        value={newPlan.month}
                                                        onChange={(e) => setNewPlan({ ...newPlan, month: e.target.value })}
                                                    >
                                                        <option value="">Select Month...</option>
                                                        {[
                                                            'January', 'February', 'March', 'April', 'May', 'June',
                                                            'July', 'August', 'September', 'October', 'November', 'December'
                                                        ].map(m => (
                                                            <option key={m} value={m}>{m}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={creatingPlan}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-widest text-xs mt-4"
                                                >
                                                    {creatingPlan ? 'Initializing...' : 'Execute Deployment'}
                                                </button>
                                                
                                                {selectedDept?.name !== 'Marketing' && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => setShowCreateForm(false)}
                                                        className="w-full py-2 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </form>
                                        ))}
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
