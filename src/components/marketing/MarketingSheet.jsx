import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
    Save, Plus, Trash2, CheckCircle, Circle, User, Calendar,
    FileText, Clock, ChevronDown, ChevronRight, CheckSquare, Cloud, Flag, File,
    MoreHorizontal, Download, Layout, Search, CornerDownRight, Target, AlertTriangle
} from 'lucide-react';
import { API_ORIGIN } from '../../config';
import Header from '../common/Header';
import { TrendingUp } from 'lucide-react';

const PRODUCT_IMAGE_API_ORIGIN = API_ORIGIN || 'http://localhost:5000';

const getProductImageUrl = (imagePath) => {
    if (!imagePath) return '';
    if (imagePath.startsWith('http')) return imagePath;
    return `${PRODUCT_IMAGE_API_ORIGIN}${imagePath}`;
};

const AutoResizeTextarea = ({ value, onChange, placeholder, className, disabled }) => {
    const textareaRef = React.useRef(null);

    useEffect(() => {
        if (textareaRef.current && value) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [value]);

    return (
        <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            rows="1"
            className={`w-full bg-transparent border-none focus:ring-0 resize-none overflow-hidden min-h-[16px] text-[14px] leading-tight outline-none ${disabled ? 'cursor-not-allowed opacity-80' : ''} ${className}`}
            onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }}
        />
    );
};

const normalizeProductName = (value) => String(value || '').trim().toLowerCase();

const normalizeDate = (value) => {
    if (!value) return '';
    return String(value).trim().split(' ')[0].replace(/\//g, '-');
};

const getTodayDateStr = () => {
    const today = new Date();
    const pad = (num) => String(num).padStart(2, '0');
    return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
};

const formatDateTimeValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const formatDateValue = (value) => normalizeDate(value) || '';

const getCompletionDateValue = (task) => task.dateCompleted || task.completedTime || '';

const isTaskCompleted = (task) => {
    const status = (task.status || '').toLowerCase();
    return status === 'completed' || (task.done === true && !status);
};

const getEndOfExpectedDay = (value) => {
    if (!value) return null;
    const date = new Date(normalizeDate(value));
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(23, 59, 59, 999);
    return date;
};

const isOverdueNotCompleted = (task) => {
    const endDate = getEndOfExpectedDay(task.endDate);
    if (!endDate || isTaskCompleted(task)) return false;

    const today = new Date();
    return today.getTime() > endDate.getTime();
};

const isCompletedLate = (task) => {
    if (!isTaskCompleted(task)) return false;

    const endDate = getEndOfExpectedDay(task.endDate);
    const completedValue = getCompletionDateValue(task);
    if (!endDate || !completedValue) return false;

    const completedDate = new Date(completedValue);
    if (Number.isNaN(completedDate.getTime())) return false;

    return completedDate.getTime() > endDate.getTime();
};

const getTaskDisplayName = (task, fallback = 'Task') => (
    task.product ||
    task.mediaType ||
    task.mainGoal ||
    task.description ||
    task.assets ||
    fallback
);

const isMarketingSubtask = (task) => (
    !!task._isSubtask ||
    (task.product === '' && (task.mediaType !== '' || task.mainGoal !== ''))
);

const completeMarketingTask = (task, completedAt, preserveExistingDate = false) => {
    const existingCompletion = getCompletionDateValue(task);
    const completionValue = preserveExistingDate && existingCompletion
        ? existingCompletion
        : completedAt.toISOString();

    return {
        ...task,
        done: true,
        status: 'completed',
        dateCompleted: completionValue,
        completedTime: formatDateTimeValue(completionValue)
    };
};

const MarketingSheet = ({ 
    planId, 
    initialTasks = [], 
    initialProducts = [],
    isNew = false, 
    onSuccess, 
    deptId, 
    initialTitle = '', 
    initialMonth = '', 
    initialYear = new Date().getFullYear(), 
    initialTarget = '', 
    initialDescription = '',
    filterProduct = null, // New prop for filtering
    readOnly = false
}) => {
    const [planData, setPlanData] = useState({
        title: initialTitle,
        month: initialMonth,
        year: initialYear,
        target: initialTarget,
        description: initialDescription
    });
    const [activeTab, setActiveTab] = useState('table');
    const [filterChannel, setFilterChannel] = useState('All Channels');
    const [filterStatus, setFilterStatus] = useState('All Status');

    useEffect(() => {
        if (!isNew && planId) {
            setPlanData({
                title: initialTitle || '',
                month: initialMonth || '',
                year: initialYear || new Date().getFullYear(),
                target: initialTarget || '',
                description: initialDescription || ''
            });
            setTasks(initialTasks && initialTasks.length > 0 ? initialTasks : Array(40).fill({
                product: '', mediaType: '', marketingChannel: '', mainGoal: '', done: false,
                description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
                startDate: '', endDate: '', notes: '', completedBy: '',
                completedTime: '', reportTo: '', expectedOutcome: '', duration: '', attachments: ''
            }).map(row => ({ ...row })));
        }
    }, [planId, initialTitle, initialMonth, initialYear, initialTarget, initialDescription, initialTasks, isNew]);

    const [tasks, setTasks] = useState(initialTasks.length > 0 ? initialTasks : Array(40).fill({
        product: '',
        mediaType: '',
        marketingChannel: '',
        mainGoal: '',
        done: false,
        description: '',
        outcome: '',
        owner: '',
        status: 'planning',
        priority: '',
        startDate: '',
        endDate: '',
        notes: '',
        completedBy: '',
        completedTime: '',
        reportTo: '',
        expectedOutcome: '',
        duration: '',
        attachments: ''
    }).map(row => ({ ...row })));

    const [saving, setSaving] = useState(false);
    const [collapsedMains, setCollapsedMains] = useState({});

    const toggleCollapse = (id) => {
        setCollapsedMains(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    const handleAddSubtask = (idx) => {
        let insertIndex = idx + 1;
        while (insertIndex < tasks.length) {
            if ((tasks[insertIndex].product?.trim() || tasks[insertIndex].mainGoal?.trim()) && !tasks[insertIndex]._isSubtask) {
                break;
            }
            insertIndex++;
        }

        const parentTask = tasks[idx];
        const newRow = {
            product: '', 
            assets: parentTask.assets || parentTask.product || '',
            mediaType: '', marketingChannel: '', mainGoal: '', done: false,
            description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
            startDate: '', endDate: '', notes: '', completedBy: '',
            completedTime: '', reportTo: '', expectedOutcome: '', duration: '', attachments: '', _isSubtask: true
        };

        const newTasks = [
            ...tasks.slice(0, insertIndex),
            newRow,
            ...tasks.slice(insertIndex)
        ];
        setTasks(newTasks);
    };

    // Statistics Calculation
    const stats = useMemo(() => {
        const validTasks = tasks.filter(t => {
            const isSubtask = !!t._isSubtask || (t.product === '' && (t.mediaType !== '' || t.mainGoal !== ''));
            if (isSubtask) return false;

            return (t.product && t.product.trim()) || 
                   (t.mainGoal && t.mainGoal.trim()) || 
                   (t.description && t.description.trim());
        });

        const total = validTasks.length;
        const completed = validTasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return t.done || status === 'completed' || status === 'published';
        }).length;
        const inProgress = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, inProgress, rate };
    }, [tasks]);

    // Statistics for specifically filtered product (Campaign Page)
    const filteredStats = useMemo(() => {
        const filteredTasks = tasks.filter(t => {
            if (!filterProduct) return true;
            const fpLower = filterProduct.toLowerCase();
            
            // Check if it's a subtask (based on _isSubtask flag OR empty product name with media/goal)
            const isSubtask = !!t._isSubtask || (t.product === '' && (t.mediaType !== '' || t.mainGoal !== ''));
            if (isSubtask) return false;

            return (t.assets === filterProduct) || (t.product && t.product.toLowerCase() === fpLower);
        });
        
        const validTasks = filteredTasks.filter(t => 
            (t.product && t.product.trim()) || 
            (t.mainGoal && t.mainGoal.trim()) || 
            (t.description && t.description.trim())
        );
        const total = validTasks.length;
        const completed = validTasks.filter(t => {
            const status = (t.status || '').toLowerCase();
            return t.done || status === 'completed' || status === 'published';
        }).length;
        const inProgress = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return { total, completed, inProgress, rate };
    }, [tasks, filterProduct]);

    const taskMatchesActiveProduct = useCallback((task) => {
        if (!filterProduct) return true;
        const activeProduct = normalizeProductName(filterProduct);
        return normalizeProductName(task.assets) === activeProduct || normalizeProductName(task.product) === activeProduct;
    }, [filterProduct]);

    const isOverdueNotCompletedInActivePlan = useCallback((task) => {
        if (!taskMatchesActiveProduct(task)) return false;
        return isOverdueNotCompleted(task);
    }, [taskMatchesActiveProduct]);

    const filteredOverdueTasks = useMemo(() => {
        return tasks.filter(isOverdueNotCompletedInActivePlan);
    }, [tasks, isOverdueNotCompletedInActivePlan]);

    // Find the product image from the uploaded plan products only.
    const activeProductImage = useMemo(() => {
        if (!filterProduct) return null;
        
        if (initialProducts && initialProducts.length > 0) {
            // Use findLast or reverse to match PlanDashboard's behavior of the last product overwriting previous duplicates
            const matches = initialProducts.filter(p => p.name && String(p.name).trim().toLowerCase() === String(filterProduct).trim().toLowerCase());
            const prod = matches.length > 0 ? matches[matches.length - 1] : null;
            const imagePath = prod?.image || prod?.imageUrl;
            if (imagePath) return getProductImageUrl(imagePath);
        }
        
        return null;
    }, [filterProduct, initialProducts]);

    const overdueTasks = useMemo(() => {
        return tasks.filter(isOverdueNotCompleted);
    }, [tasks]);

    const columns = useMemo(() => [
        { key: 'product', label: filterProduct ? 'Campaign / Subtask' : 'Product', icon: <ChevronDown size={14} />, width: filterProduct ? 'w-80' : 'w-40' },
        { key: 'marketingChannel', label: 'Channel', icon: <ChevronDown size={14} />, width: 'w-40' },
        { key: 'mainGoal', label: 'Main Goal', icon: <ChevronDown size={14} />, width: 'w-56' },
        { key: 'done', label: 'Done', icon: <CheckSquare size={14} />, width: 'w-20' },
        { key: 'owner', label: 'Responsibility', icon: <User size={14} />, width: 'w-40' },
        { key: 'duration', label: 'Duration', icon: <Clock size={14} />, width: 'w-28' },
        { key: 'startDate', label: 'Start Date', icon: <Calendar size={14} />, width: 'w-36' },
        { key: 'endDate', label: 'End Date', icon: <Calendar size={14} />, width: 'w-36' },
        { key: 'status', label: 'Status', icon: <Flag size={14} />, width: 'w-44' },
        { key: 'priority', label: 'Priority', icon: <MoreHorizontal size={14} />, width: 'w-28' },
        { key: 'attachments', label: 'Attachments', icon: <File size={14} />, width: 'w-48' },
        { key: 'notes', label: 'Notes', icon: <FileText size={14} />, width: 'w-64' },
        { key: 'completedTime', label: 'Date Completed', icon: <Clock size={14} />, width: 'w-40' },
        { key: 'description', label: 'Description', icon: <FileText size={14} />, width: 'w-64' },
        { key: 'outcome', label: 'Outcome', icon: <Target size={14} />, width: 'w-56' }
    ], [filterProduct]);

    const handleInputChange = (index, key, value) => {
        setTasks(prev => {
            const next = [...prev];
            const updatedTask = { ...next[index] };
            const isMainTask = !isMarketingSubtask(updatedTask);

            if (key === 'done') {
                updatedTask.done = value;
                if (value) {
                    const now = new Date();
                    Object.assign(updatedTask, completeMarketingTask(updatedTask, now));

                    if (isMainTask) {
                        for (let childIndex = index + 1; childIndex < next.length; childIndex++) {
                            if (!isMarketingSubtask(next[childIndex])) break;
                            next[childIndex] = completeMarketingTask(next[childIndex], now, true);
                        }
                    }
                } else {
                    updatedTask.dateCompleted = null;
                    updatedTask.completedTime = '';
                    if (updatedTask.status === 'published' || updatedTask.status === 'completed') {
                        updatedTask.status = 'planning';
                    }
                }
            } else if (key === 'status') {
                updatedTask.status = value;
                if (value === 'completed') {
                    const now = new Date();
                    Object.assign(updatedTask, completeMarketingTask(updatedTask, now));

                    if (isMainTask) {
                        for (let childIndex = index + 1; childIndex < next.length; childIndex++) {
                            if (!isMarketingSubtask(next[childIndex])) break;
                            next[childIndex] = completeMarketingTask(next[childIndex], now, true);
                        }
                    }
                } else {
                    updatedTask.done = false;
                    updatedTask.dateCompleted = null;
                    updatedTask.completedTime = '';
                }
            } else {
                updatedTask[key] = value;
            }

            next[index] = updatedTask;
            return next;
        });
    };

    const addRow = () => {
        setTasks([...tasks, {
            product: '', 
            assets: filterProduct || '', // Link to parent product
            mediaType: '', marketingChannel: '', mainGoal: '', done: false,
            description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
            startDate: '', endDate: '', notes: '', completedBy: '',
            completedTime: '', reportTo: '', expectedOutcome: '', duration: '', attachments: ''
        }]);
    };

    const removeRow = (index) => {
        if (tasks.length === 1) return;
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
    };

    const getStatusStyles = (status) => {
        if (!status) return 'bg-slate-200 dark:bg-white/5 text-slate-500 border-transparent';
        const s = status.toLowerCase();
        switch (s) {
            case 'planning': return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30';
            case 'hold': return 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30';
            case 'ongoing': return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30';
            case 'published': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30';
            case 'completed': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
            default: return 'bg-slate-200 dark:bg-white/5 text-slate-500 border-transparent';
        }
    };

    const getPriorityStyles = (priority) => {
        if (!priority) return 'bg-slate-200 dark:bg-white/5 text-slate-500 border-transparent';
        const p = priority.toLowerCase();
        switch (p) {
            case 'high': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            default: return 'bg-slate-200 dark:bg-white/5 text-slate-500 border-transparent';
        }
    };

    const handleSave = async () => {
        if (!planData.title?.trim() || !planData.month) {
            alert('Please provide both a Strategy Title and a Month before saving.');
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                const res = await axios.post(`${API_ORIGIN}/api/plans`, {
                    ...planData,
                    tasks: tasks.filter(t => 
                        t.product?.trim() || 
                        t.description?.trim() || 
                        t.mainGoal?.trim() || 
                        t.mediaType?.trim() ||
                        t._isSubtask
                    ),
                    department: deptId
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('Plan created successfully');
                if (onSuccess) onSuccess(res.data);
            } else {
                const res = await axios.put(`${API_ORIGIN}/api/plans/${planId}/tasks`, {
                    tasks: tasks.filter(t => 
                        t.product?.trim() || 
                        t.description?.trim() || 
                        t.mainGoal?.trim() || 
                        t.mediaType?.trim() ||
                        t._isSubtask
                    ),
                    ...planData
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('Plan saved successfully');
                if (onSuccess) onSuccess(res.data);
            }
        } catch (err) {
            console.error('Error saving plan:', err.response?.data || err.message);
            alert(`Error saving plan: ${err.response?.data?.msg || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-full bg-white dark:bg-[#0a0f1d] rounded-[32px] border border-slate-200 dark:border-white/5 shadow-2xl">
            {!filterProduct && (
                <Header 
                    title="Marketing Department" 
                    subtitle={filterProduct || `${planData.month} ${planData.year} - ${planData.title || 'Plan Execution'}`}
                    icon={TrendingUp}
                    iconBg="bg-indigo-600"
                    showUsersLink={false}
                />
            )}
            {(filterProduct ? filteredOverdueTasks : overdueTasks).length > 0 && (
                <div id="late-task-alert-banner" className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 rounded-2xl overflow-hidden shadow-lg shadow-red-500/5 animate-pulse">
                    <div className="bg-red-500 text-white px-5 py-2.5 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <AlertTriangle size={14} className="shrink-0 animate-bounce" />
                        <span>Late Task Alert - Expected End Date Exceeded!</span>
                    </div>
                    <div className="p-4 space-y-2 max-h-40 overflow-y-auto">
                        {(filterProduct ? filteredOverdueTasks : overdueTasks).map((t, idx) => {
                            const originalIdx = tasks.indexOf(t);
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        const el = document.getElementById(`task-row-${originalIdx}`);
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            el.classList.add('animate-pulse', 'bg-red-500/30');
                                            setTimeout(() => el.classList.remove('animate-pulse', 'bg-red-500/30'), 2000);
                                        }
                                    }}
                                    className="flex flex-col md:flex-row md:items-center justify-between text-xs text-red-500 dark:text-red-400 font-bold bg-red-500/5 hover:bg-red-500/10 px-4 py-2.5 rounded-xl border border-red-500/10 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span>Campaign / Subtask:</span>
                                        <span className="text-slate-900 dark:text-white font-extrabold uppercase">
                                            {getTaskDisplayName(t, `Task #${idx + 1}`)}
                                        </span>
                                        <span>is not completed!</span>
                                    </div>
                                    <div className="mt-1.5 md:mt-0 font-mono text-[10px] bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400">
                                        Expected: {formatDateValue(t.endDate)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            {!filterProduct && (
                <div className="px-4 pt-4 pb-2 flex flex-col gap-4">
                    <div className="flex items-center gap-6">
                        <div className="flex-1 grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Strategy Title</label>
                                <div className="relative group">
                                    <input
                                        className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                        value={planData.title}
                                        onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Month</label>
                                <select
                                    className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={planData.month}
                                    onChange={(e) => setPlanData({ ...planData, month: e.target.value })}
                                    disabled={readOnly}
                                >
                                    <option value="">Select...</option>
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Year</label>
                                <input
                                    type="number"
                                    className="w-full bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/5 rounded-2xl px-5 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                    value={planData.year}
                                    onChange={(e) => setPlanData({ ...planData, year: e.target.value })}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        <div className="w-64 space-y-2">
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Success Rate</label>
                                <span className="text-xs font-black text-slate-600 dark:text-slate-400">{stats.rate}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 dark:bg-[#1a1f2e] rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
                                <div 
                                    className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000"
                                    style={{ width: `${stats.rate}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        {[
                            { label: 'Total Tasks', value: stats.total, sub: 'this month', border: 'border-slate-200 dark:border-white/5' },
                            { label: 'Completed', value: stats.completed, sub: 'tasks done', border: 'border-emerald-500/30' },
                            { label: 'In Progress', value: stats.inProgress, sub: 'remaining', border: 'border-amber-500/30' },
                            { label: 'Completion', value: `${stats.rate}%`, sub: 'success rate', border: 'border-indigo-500/30 text-slate-900 dark:text-white' }
                        ].map((s, i) => (
                            <div key={i} className={`bg-slate-50 dark:bg-[#1a1f2e]/50 border ${s.border} p-4 rounded-2xl`}>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white">{s.value}</h3>
                                    <span className="text-[10px] font-bold text-slate-500">{s.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {filterProduct && (
                <div className="mx-4 mt-6 p-6 bg-slate-900 border border-white/10 rounded-[28px] shadow-2xl animate-in fade-in slide-in-from-top duration-700">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-5 min-w-0">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden border border-white/10 shrink-0 shadow-2xl group/img relative">
                                {activeProductImage ? (
                                    <img 
                                        src={activeProductImage} 
                                        alt={filterProduct}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                        }}
                                    />
                                ) : null}
                                <div className={`w-full h-full flex items-center justify-center bg-indigo-500/10 ${activeProductImage ? 'hidden' : 'flex'}`}>
                                    <TrendingUp className="text-indigo-400" size={32} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-[0.25em] mb-1">
                                    <span>Campaign Analysis</span>
                                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 text-[9px]">Real-time Tracking</span>
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tighter uppercase truncate max-w-md">
                                    {filterProduct}
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-10 bg-white/5 px-8 py-4 rounded-2xl border border-x border-white/5 mx-6">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total</p>
                                <h3 className="text-3xl font-black text-white leading-none">{filteredStats.total}</h3>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Done</p>
                                <h3 className="text-3xl font-black text-emerald-400 leading-none">{filteredStats.completed}</h3>
                            </div>
                            <div className="w-px h-10 bg-white/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Pending</p>
                                <h3 className="text-3xl font-black text-amber-400 leading-none">{filteredStats.inProgress}</h3>
                            </div>
                        </div>

                        <div className="flex-1 w-full max-w-md px-10">
                            <div className="flex justify-between items-end mb-2.5">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Execution Progress</span>
                                <span className="text-[10px] font-black text-indigo-400/80">{filteredStats.rate}%</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                                    <div 
                                        className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-1000 ease-out rounded-full"
                                        style={{ width: `${filteredStats.rate}%` }}
                                    />
                                    <div 
                                        className="absolute top-0 right-0 bottom-0 w-8 bg-white/20 blur-md animate-pulse"
                                        style={{ left: `calc(${filteredStats.rate}% - 20px)` }}
                                    />
                                </div>
                                {filteredOverdueTasks.length > 0 && (
                                    <button 
                                        onClick={() => {
                                            const alertEl = document.getElementById('late-task-alert-banner');
                                            if (alertEl) {
                                                alertEl.scrollIntoView({ behavior: 'smooth' });
                                            }
                                        }}
                                        className="flex items-center gap-2 cursor-pointer focus:outline-none group/overdue bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl border border-red-500/20 transition-all shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                                        <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.1em] group-hover/overdue:text-red-400 transition-colors mt-[1px]">Overdue</p>
                                        <h3 className="text-xl font-black text-red-500 leading-none group-hover/overdue:text-red-400 transition-colors">{filteredOverdueTasks.length}</h3>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 pt-2 pb-2">
                <div className="flex items-center justify-between mt-4 border-b border-slate-200 dark:border-white/5 pb-2">
                    <div className="flex gap-8">
                        {!filterProduct && ['Table View'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0])}
                                className={`pb-4 text-sm font-black transition-all relative ${
                                    activeTab === tab.toLowerCase().split(' ')[0] 
                                    ? 'text-slate-900 dark:text-white' 
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                {tab}
                                {activeTab === tab.toLowerCase().split(' ')[0] && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 mb-2">
                    {!filterProduct && (
                        <>
                            <div className="flex items-center bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2 text-slate-600 dark:text-slate-400">
                                <Search size={14} className="mr-3" />
                                <select 
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer min-w-[120px]"
                                    value={filterChannel}
                                    onChange={(e) => setFilterChannel(e.target.value)}
                                >
                                    <option>All Channels</option>
                                    <option>Social Media</option>
                                    <option>Email</option>
                                </select>
                            </div>
                            <div className="flex items-center bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-white/5 rounded-2xl px-4 py-2">
                                <select 
                                    className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer min-w-[120px]"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option>All Status</option>
                                    <option>Planned</option>
                                    <option>Published</option>
                                </select>
                            </div>
                        </>
                    )}
                        {!readOnly && (
                            <>
                                <button 
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-bold text-xs"
                                >
                                    <CheckCircle size={12} /> {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button 
                                    onClick={addRow}
                                    className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-[#1a1f2e] hover:bg-slate-100 dark:bg-[#252a3a] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 rounded-lg transition-all font-bold text-xs"
                                >
                                    <Plus size={12} /> {filterProduct ? 'Add Campaign' : 'Add Row'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full bg-slate-50 dark:bg-white/[0.01] pb-10">
                <table className="w-full text-left border-collapse min-w-max table-fixed">
                    <thead className="sticky top-0 z-20 bg-[#d97706]">
                        <tr className="divide-x divide-white/10">
                            <th className="p-2 w-12 bg-[#b45309] text-[12px] font-black text-white text-center uppercase tracking-tight">No.</th>
                            {columns.map(col => (
                                <th key={col.key} className={`p-2 text-[12px] font-black text-white uppercase tracking-tight ${col.width}`}>
                                    <div className="flex items-center gap-2">
                                        {col.icon}
                                        <span>{col.label}</span>
                                    </div>
                                </th>
                            ))}
                            {!readOnly && <th className="p-2 w-10 bg-[#b45309]"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                        {(() => {
                            const displayTasks = [];
                            let mainCounter = 0;
                            let subCounter = 0;
                            let currentMainCompleted = false;
                            let lastMainTask = null;
                            let lastMainIsLinked = false;

                            tasks.forEach((task, idx) => {
                                const isSubtask = !!task._isSubtask || (task.product === '' && (task.mediaType !== '' || task.mainGoal !== ''));
                                const taskCompleted = task.done || (task.status || '').toLowerCase() === 'completed' || (task.status || '').toLowerCase() === 'published';

                                if (!isSubtask) {
                                    lastMainTask = task;
                                    if (filterProduct) {
                                        const fpLower = filterProduct.toLowerCase();
                                        lastMainIsLinked = (task.assets === filterProduct) || (task.product && task.product.toLowerCase() === fpLower);
                                    } else {
                                        lastMainIsLinked = true;
                                    }
                                }

                                // Apply product filter
                                if (filterProduct) {
                                    if (!isSubtask && !lastMainIsLinked) return;
                                    if (isSubtask && !lastMainIsLinked) return;
                                }
                                
                                let displayNumber = '';
                                if (!isSubtask) {
                                    mainCounter++;
                                    subCounter = 0;
                                    displayNumber = `${mainCounter}`;
                                    currentMainCompleted = taskCompleted;
                                } else {
                                    subCounter++;
                                    displayNumber = `${mainCounter}.${subCounter}`;
                                }

                                let hasSubtasks = false;
                                if (!isSubtask) {
                                    if (idx + 1 < tasks.length) {
                                        const nextTask = tasks[idx + 1];
                                        if (nextTask._isSubtask || (nextTask.product === '' && (nextTask.mediaType !== '' || nextTask.mainGoal !== ''))) {
                                            hasSubtasks = true;
                                        }
                                    }
                                }

                                if (isSubtask && collapsedMains[mainCounter]) {
                                    return;
                                }

                                displayTasks.push({
                                    task,
                                    originalIndex: idx,
                                    isSubtask,
                                    displayNumber,
                                    mainCounter,
                                    hasSubtasks,
                                    parentCompleted: !isSubtask ? false : currentMainCompleted
                                });
                            });

                            return displayTasks.map(({ task, originalIndex, isSubtask, displayNumber, mainCounter, hasSubtasks, parentCompleted }) => {
                                const idx = originalIndex;
                                const isRowTaskCompleted = task.done || (task.status || '').toLowerCase() === 'completed' || (task.status || '').toLowerCase() === 'published';
                                const isCompleted = isRowTaskCompleted || parentCompleted;
                                const isOverdue = !isCompleted && isOverdueNotCompleted(task);
                                
                                if (!filterProduct) {
                                    if (filterChannel !== 'All Channels' && task.marketingChannel !== filterChannel) return null;
                                    const statusMatch = filterStatus === 'All Status' || (task.status || '').toLowerCase() === filterStatus.toLowerCase();
                                    if (!statusMatch) return null;
                                }

                                return (
                                    <tr key={idx} id={`task-row-${idx}`} className={`group transition-all duration-300 divide-x divide-slate-200 dark:divide-white/10 ${isCompleted ? 'bg-emerald-500/10' : (isOverdue ? 'bg-red-500/20 hover:bg-red-500/30' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]')}`}>
                                        <td className={`p-1.5 text-center font-black transition-colors ${isCompleted ? 'bg-emerald-500/40 text-emerald-300' : (isSubtask ? 'bg-[#0f172a] text-slate-500' : 'bg-slate-900/60 text-slate-400')} w-12`}>
                                            <span className={isSubtask ? 'text-[11px] opacity-70' : 'text-[14px]'}>
                                                {displayNumber}
                                            </span>
                                        </td>
                                        {columns.map(col => (
                                            <td key={col.key} className={`p-1 ${col.width} relative`}>
                                                {col.key === 'product' ? (
                                                    <div className={`flex items-start ${isSubtask ? 'pl-6' : ''}`}>
                                                        {!isSubtask && hasSubtasks && (
                                                            <button
                                                                onClick={() => toggleCollapse(mainCounter)}
                                                                className="mt-1 mr-2 text-slate-500 hover:text-indigo-500 transition-colors shrink-0"
                                                            >
                                                                {collapsedMains[mainCounter] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                            </button>
                                                        )}
                                                        {!isSubtask && !hasSubtasks && <div className="w-[22px] shrink-0" />}
                                                        
                                                        {isSubtask && (
                                                            <>
                                                                <div className="absolute left-2 top-0 bottom-0 w-px bg-indigo-500/20" />
                                                                <div className="absolute left-2 top-1/2 w-3 h-px bg-indigo-500/20" />
                                                                <CornerDownRight size={12} className="text-indigo-500/50 mt-1 mr-2 shrink-0" />
                                                                <div className="absolute left-3 top-0 bottom-1/2 w-px bg-slate-300 dark:bg-slate-600" />
                                                                <div className="absolute left-3 top-1/2 w-4 h-px bg-slate-300 dark:bg-slate-600" />
                                                            </>
                                                        )}
                                                        
                                                        <div className="flex-1 relative group/input">
                                                            <AutoResizeTextarea
                                                                value={isSubtask && filterProduct ? task.mediaType : task[col.key]}
                                                                onChange={(e) => handleInputChange(idx, isSubtask && filterProduct ? 'mediaType' : col.key, e.target.value)}
                                                                disabled={readOnly}
                                                                placeholder={isSubtask ? "Subtask details..." : "Enter goal/objective..."}
                                                                className={`${isSubtask ? 'text-slate-500 font-medium' : 'font-bold'} ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                                                            />
                                                            {!readOnly && !isSubtask && (task.product?.trim() || task.mainGoal?.trim()) && (
                                                                <button
                                                                    onClick={() => handleAddSubtask(idx)}
                                                                    className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover/input:opacity-100 shadow-lg shadow-orange-500/20 z-10"
                                                                    title="Add Subtask"
                                                                >
                                                                    <Plus size={12} strokeWidth={4} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : col.key === 'done' ? (
                                                    <div className="flex justify-center items-center">
                                                        {!isSubtask && hasSubtasks && !isCompleted ? (
                                                            <div className="flex flex-col items-center gap-0.5 min-w-[50px]">
                                                                {(() => {
                                                                    let totalSub = 0;
                                                                    let doneSub = 0;
                                                                    for (let sidx = idx + 1; sidx < tasks.length; sidx++) {
                                                                        const st = tasks[sidx];
                                                                        const isSt = !!st._isSubtask || (st.product === '' && (st.mediaType !== '' || st.mainGoal !== ''));
                                                                        if (!isSt) break;
                                                                        totalSub++;
                                                                        if (st.done || (st.status || '').toLowerCase() === 'completed' || (st.status || '').toLowerCase() === 'published') {
                                                                            doneSub++;
                                                                        }
                                                                    }
                                                                    const pct = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
                                                                    return (
                                                                        <>
                                                                            <span className="text-[10px] font-black text-indigo-500 leading-none">{pct}%</span>
                                                                            <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                                                                                <div 
                                                                                    className="h-full bg-indigo-500 transition-all duration-500"
                                                                                    style={{ width: `${pct}%` }}
                                                                                ></div>
                                                                            </div>
                                                                            <button 
                                                                                onClick={() => handleInputChange(idx, 'done', true)}
                                                                                disabled={readOnly}
                                                                                className={`text-[8px] font-bold uppercase mt-0.5 ${readOnly ? 'text-slate-500 cursor-not-allowed opacity-50' : 'text-slate-400 hover:text-emerald-500 transition-colors'}`}
                                                                            >
                                                                                Force
                                                                            </button>
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleInputChange(idx, 'done', !task.done)}
                                                                disabled={readOnly}
                                                                className={`p-1.5 rounded-xl transition-all ${isCompleted ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400'} ${readOnly ? 'cursor-not-allowed opacity-80' : 'hover:text-slate-600'}`}
                                                            >
                                                                {isCompleted ? <CheckCircle size={16} /> : <Circle size={16} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : col.key === 'status' ? (
                                                    <div className={`rounded-lg border px-2 py-0.5 transition-all ${getStatusStyles(task.status)} ${readOnly ? 'opacity-80' : ''}`}>
                                                        <select
                                                            className={`w-full bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-wider appearance-none outline-none ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                            value={task.status}
                                                            onChange={(e) => handleInputChange(idx, 'status', e.target.value)}
                                                            disabled={readOnly}
                                                        >
                                                            <option value="" className="bg-white dark:bg-[#0a0f1d]">Select...</option>
                                                            <option value="planning" className="bg-white dark:bg-[#0a0f1d]">Planning</option>
                                                            <option value="hold" className="bg-white dark:bg-[#0a0f1d]">Hold</option>
                                                            <option value="ongoing" className="bg-white dark:bg-[#0a0f1d]">Ongoing</option>
                                                            <option value="published" className="bg-white dark:bg-[#0a0f1d]">Published</option>
                                                            <option value="completed" className="bg-white dark:bg-[#0a0f1d]">Completed</option>
                                                        </select>
                                                    </div>
                                                ) : col.key === 'priority' ? (
                                                    <div className={`rounded-lg border px-2 py-0.5 transition-all ${getPriorityStyles(task.priority)} ${readOnly ? 'opacity-80' : ''}`}>
                                                        <select
                                                            className={`w-full bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-wider appearance-none outline-none ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                                            value={task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase() : ''}
                                                            onChange={(e) => handleInputChange(idx, 'priority', e.target.value)}
                                                            disabled={readOnly}
                                                        >
                                                            <option value="" className="bg-white dark:bg-[#0a0f1d]">Select...</option>
                                                            <option value="High" className="bg-white dark:bg-[#0a0f1d]">High</option>
                                                            <option value="Medium" className="bg-white dark:bg-[#0a0f1d]">Medium</option>
                                                            <option value="Low" className="bg-white dark:bg-[#0a0f1d]">Low</option>
                                                        </select>
                                                    </div>
                                                ) : col.key === 'startDate' || col.key === 'endDate' ? (
                                                    <input
                                                        type="date"
                                                        value={task[col.key]}
                                                        onChange={(e) => handleInputChange(idx, col.key, e.target.value)}
                                                        disabled={readOnly}
                                                        className={`w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-700 dark:text-slate-300 [color-scheme:light] dark:[color-scheme:dark] outline-none ${readOnly ? 'cursor-not-allowed opacity-80' : ''}`}
                                                    />
                                                ) : col.key === 'completedTime' ? (
                                                    <div className={`w-full text-center px-1.5 py-2 font-mono text-[11px] tracking-tight select-all ${isCompletedLate(task) ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        {isTaskCompleted(task) && getCompletionDateValue(task) ? (
                                                            isCompletedLate(task) ? (
                                                                <>Expected: {formatDateValue(task.endDate)} | Actual: {formatDateTimeValue(getCompletionDateValue(task))}</>
                                                            ) : (
                                                                formatDateTimeValue(getCompletionDateValue(task))
                                                            )
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </div>
                                                ) : (
                                                    <AutoResizeTextarea
                                                        value={task[col.key]}
                                                        onChange={(e) => handleInputChange(idx, col.key, e.target.value)}
                                                        disabled={readOnly}
                                                        className={`${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                                                    />
                                                )}
                                            </td>
                                        ))}
                                        {!readOnly && (
                                            <td className={`p-1 w-10 text-center transition-colors ${isCompleted ? 'bg-emerald-500/30' : (isSubtask ? 'bg-[#0f172a]/50' : 'bg-slate-900/40')}`}>
                                                <button 
                                                    onClick={() => removeRow(idx)}
                                                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarketingSheet;
