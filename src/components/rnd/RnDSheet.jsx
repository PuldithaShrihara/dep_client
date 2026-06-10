import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
    Save, Plus, Trash2, CheckCircle, Circle, User, Calendar,
    FileText, Clock, ChevronDown, ChevronRight, CornerDownRight, CheckSquare, Cloud, Flag, File,
    MoreHorizontal
} from 'lucide-react';
import { API_ORIGIN } from '../../config';
import { flattenNestedRdTasksToLegacy } from '../../utils/rnd/rdTasks';
import Header from '../common/Header';
import { Cpu } from 'lucide-react';

const AutoResizeTextarea = ({ value, onChange, placeholder, className }) => {
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
            placeholder={placeholder}
            rows="1"
            className={`w-full bg-transparent border-none focus:ring-0 resize-none overflow-hidden transition-all duration-200 whitespace-pre-wrap break-words leading-relaxed ${className}`}
            onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }}
        />
    );
};

const EmployeeMultiSelect = ({ value, onChange, employees }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    const [dropdownStyles, setDropdownStyles] = useState({});

    const selectedList = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

    const toggleSelection = (empName) => {
        let newList;
        if (selectedList.includes(empName)) {
            newList = selectedList.filter(name => name !== empName);
        } else {
            newList = [...selectedList, empName];
        }
        onChange(newList.join(', '));
    };

    const handleOpen = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const width = Math.max(rect.width, 250);
            
            let left = rect.left;
            if (left + width > window.innerWidth) {
                left = window.innerWidth - width - 10;
            }

            let styles = {
                position: 'fixed',
                left: `${left}px`,
                width: `${width}px`,
                zIndex: 99999
            };

            // Estimate dropdown height up to 300px
            if (rect.bottom + 300 > window.innerHeight && rect.top > 300) {
                styles.bottom = `${window.innerHeight - rect.top + 4}px`;
                styles.maxHeight = `${rect.top - 20}px`;
            } else {
                styles.top = `${rect.bottom + 4}px`;
                styles.maxHeight = `${window.innerHeight - rect.bottom - 20}px`;
            }

            setDropdownStyles(styles);
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current && !containerRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on scroll to prevent detachment from the cell
    useEffect(() => {
        const handleScroll = (e) => {
            if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        window.addEventListener('scroll', handleScroll, true);
        return () => window.removeEventListener('scroll', handleScroll, true);
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={containerRef}>
            <div 
                className="w-full text-[13px] text-slate-900 dark:text-slate-200 py-1 cursor-pointer min-h-[28px] hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors break-words whitespace-pre-wrap flex items-center"
                onClick={handleOpen}
            >
                {value || <span className="text-slate-500 opacity-50">Select employees...</span>}
            </div>
            
            {isOpen && createPortal(
                <div 
                    ref={dropdownRef}
                    style={dropdownStyles}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-2 overflow-y-auto custom-scrollbar entrance-animation"
                >
                    {employees.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-500">Loading or no employees found</div>
                    ) : (
                        employees.map(emp => {
                            const empName = emp.fullName || emp.username;
                            const isSelected = selectedList.includes(empName);
                            return (
                                <div 
                                    key={emp._id}
                                    className="flex items-center gap-3 px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleSelection(empName);
                                    }}
                                >
                                    <input 
                                        type="checkbox" 
                                        checked={isSelected}
                                        readOnly
                                        className="rounded border-slate-300 dark:border-slate-600 text-amber-500 focus:ring-amber-500 bg-transparent w-3.5 h-3.5 cursor-pointer"
                                    />
                                    <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{empName}</span>
                                </div>
                            );
                        })
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }
    let date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        const parts = dateStr.split(/[\/\-]/);
        if (parts.length === 3) {
            if (parts[2].length === 4) {
                const month = parseInt(parts[0], 10);
                const day = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                date = new Date(year, month - 1, day);
            } else if (parts[0].length === 4) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);
                date = new Date(year, month - 1, day);
            }
        }
    }
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const RnDSheet = ({ 
    planId, 
    initialTasks = [], 
    initialRdMainTasks = [], 
    isNew = false, 
    onSuccess, 
    deptId, 
    initialTitle = '', 
    initialMonth = '', 
    initialYear = new Date().getFullYear(), 
    initialTarget = '', 
    initialDescription = '',
    filterProduct = null
}) => {
    const [planData, setPlanData] = useState({
        title: initialTitle,
        month: initialMonth,
        year: initialYear,
        target: initialTarget,
        description: initialDescription
    });

    const [employees, setEmployees] = useState([]);

    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                const res = await axios.get(`${API_ORIGIN}/api/users`, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                setEmployees(res.data);
            } catch (err) {
                console.error('Failed to fetch employees', err);
            }
        };
        fetchEmployees();
    }, []);

    const resolvedTasks = useMemo(() => {
        return initialRdMainTasks?.length > 0 
            ? flattenNestedRdTasksToLegacy(initialRdMainTasks) 
            : initialTasks;
    }, [initialRdMainTasks, initialTasks]);

    const lastSyncedTasksRef = useRef(null);

    useEffect(() => {
        if (!isNew && planId) {
            if (resolvedTasks !== lastSyncedTasksRef.current) {
                setPlanData({
                    title: initialTitle || '',
                    month: initialMonth || '',
                    year: initialYear || new Date().getFullYear(),
                    target: initialTarget || '',
                    description: initialDescription || ''
                });
                setTasks(resolvedTasks && resolvedTasks.length > 0 ? resolvedTasks : Array(40).fill({
                    product: '', mediaType: '', marketingChannel: '', mainGoal: '', done: false,
                    description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
                    startDate: '', endDate: '', notes: '', completedBy: '',
                    completedTime: '', reportTo: ''
                }).map(row => ({ ...row })));
                lastSyncedTasksRef.current = resolvedTasks;
            }
        }
    }, [planId, initialTitle, initialMonth, initialYear, initialTarget, initialDescription, isNew, resolvedTasks]);

    const [tasks, setTasks] = useState(resolvedTasks?.length > 0 ? resolvedTasks : Array(40).fill({
        product: '',      // Task
        mediaType: '',    // sub task
        marketingChannel: '', // responsible
        status: 'planning', // status
        mainGoal: '',     // remark (1)
        owner: '',        // assigned employee
        startDate: '',    // start date
        endDate: '',      // end date
        description: '',  // remark (2)
        done: false,      // done
        outcome: '',      // unused but in schema
        priority: 'Medium',
        notes: '',
        completedBy: '',
        completedTime: '',
        reportTo: ''
    }).map(row => ({ ...row })));

    const [saving, setSaving] = useState(false);
    const [collapsedMains, setCollapsedMains] = useState({});

    const toggleCollapse = (mainId) => {
        setCollapsedMains(prev => ({ ...prev, [mainId]: !prev[mainId] }));
    };

    const columns = [
        { key: 'product', label: 'Task', icon: <File size={14} />, width: 'w-[400px]' },
        { key: 'marketingChannel', label: 'Responsible', icon: <User size={14} />, width: 'w-48' },
        { key: 'status', label: 'Status', icon: <Cloud size={14} />, width: 'w-40' },
        { key: 'mainGoal', label: 'Remark', icon: <FileText size={14} />, width: 'w-64' },
        { key: 'owner', label: 'Assigned Employee', icon: <User size={14} />, width: 'w-48' },
        { key: 'startDate', label: 'Start Date', icon: <Calendar size={14} />, width: 'w-40' },
        { key: 'endDate', label: 'End Date', icon: <Calendar size={14} />, width: 'w-40' },
        { key: 'description', label: 'Remark', icon: <FileText size={14} />, width: 'w-64' },
        { key: 'done', label: 'Done', icon: <CheckSquare size={14} />, width: 'w-20' },
    ];

    const handleInputChange = (index, key, value) => {
        setTasks(prev => {
            const next = [...prev];
            const task = next[index];
            next[index] = { ...task, [key]: value };

            const isSubtask = task._isSubtask || (task.product === '' && task.mediaType !== '');
            
            if (!isSubtask) {
                if ((key === 'status' && value === 'completed') || (key === 'done' && value === true)) {
                    let i = index + 1;
                    while (i < next.length) {
                        const sub = next[i];
                        const subIsSubtask = sub._isSubtask || (sub.product === '' && sub.mediaType !== '');
                        
                        if (!subIsSubtask) {
                            break;
                        }
                        
                        next[i] = { ...sub, [key]: value };
                        i++;
                    }
                }
            }

            return next;
        });
    };

    const addRow = () => {
        setTasks([...tasks, {
            product: filterProduct || '', mediaType: '', marketingChannel: '', mainGoal: '', done: false,
            description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
            startDate: '', endDate: '', notes: '', completedBy: '',
            completedTime: '', reportTo: ''
        }]);
    };

    const removeRow = (index) => {
        if (tasks.length === 1) return;
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
    };

    const handleAddSubtask = (idx) => {
        let insertIndex = idx + 1;
        while (insertIndex < tasks.length) {
            if (tasks[insertIndex].product?.trim()) {
                break;
            }
            insertIndex++;
        }

        const newRow = {
            product: '', mediaType: '', marketingChannel: '', mainGoal: '', done: false,
            description: '', outcome: '', owner: '', status: 'planning', priority: 'Medium',
            startDate: '', endDate: '', notes: '', completedBy: '',
            completedTime: '', reportTo: '', _isSubtask: true
        };

        const newTasks = [
            ...tasks.slice(0, insertIndex),
            newRow,
            ...tasks.slice(insertIndex)
        ];
        setTasks(newTasks);
    };

    const getStatusStyles = (status) => {
        switch (status) {
            case 'planning': return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30';
            case 'developing': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'under review': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'on hold': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'completed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
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
                    tasks: tasks.filter(t => t.product || t.mediaType), // Save only non-empty rows
                    department: deptId
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('R&D Plan created successfully');
                if (onSuccess) onSuccess(res.data);
            } else {
                const res = await axios.put(`${API_ORIGIN}/api/plans/${planId}/tasks`, {
                    tasks: tasks.filter(t => t.product || t.mediaType),
                    ...planData
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('R&D Plan updated successfully');
                if (onSuccess) onSuccess(res.data);
            }
        } catch (err) {
            console.error('Error saving R&D plan:', err.response?.data || err.message);
            alert(`Error saving plan: ${err.response?.data?.msg || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col min-h-full bg-[#020617]/50 rounded-[32px] border border-slate-200 dark:border-white/5">
            {!filterProduct && (
                <Header 
                    title="R&D Department" 
                    subtitle={filterProduct || `${planData.month} ${planData.year} - ${planData.title || 'Plan Execution'}`}
                    icon={Cpu}
                    iconBg="bg-amber-600"
                    showUsersLink={false}
                />
            )}
            
            <div className="p-4 border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-white/[0.02] flex items-center justify-between">
                <div className="flex gap-3">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-white/5 hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white rounded-xl transition-all text-xs font-bold"
                    >
                        <Plus size={14} /> {filterProduct ? 'Add Campaign' : 'Add Row'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-slate-900 dark:text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-amber-600/20"
                    >
                        {saving ? 'Saving...' : <><Save size={14} /> Save</>}
                    </button>
                </div>
            </div>

                {!filterProduct && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 entrance-animation">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plan Title</label>
                            <input
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500/50 transition-all font-medium"
                                placeholder="e.g. Next-Gen Product R&D"
                                value={planData.title}
                                onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Month</label>
                            <select
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500/50 transition-all font-medium"
                                value={planData.month}
                                onChange={(e) => setPlanData({ ...planData, month: e.target.value })}
                            >
                                <option value="" className="bg-slate-900">Select...</option>
                                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Year</label>
                            <input
                                type="number"
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-900 dark:text-white focus:border-amber-500/50 transition-all font-medium"
                                value={planData.year}
                                onChange={(e) => setPlanData({ ...planData, year: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Success Percentage</label>
                            <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-sm font-black text-amber-400 flex items-center justify-between">
                                <span>{(() => {
                                    const activeMainTasks = tasks.filter(t => {
                                        const isSubtask = t._isSubtask || (t.product === '' && t.mediaType !== '');
                                        return !isSubtask && t.product?.trim();
                                    });
                                    const total = activeMainTasks.length;
                                    const done = activeMainTasks.filter(t => {
                                        const status = (t.status || '').toLowerCase();
                                        return t.done || status === 'completed' || status === 'published';
                                    }).length;
                                    return total > 0 ? Math.round((done / total) * 100) : 0;
                                })()}%</span>
                                <div className="flex-1 ml-4 h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-amber-500 transition-all duration-1000" 
                                        style={{ width: `${(() => {
                                            const activeTasks = tasks.filter(t => t.product?.trim() || t.mediaType?.trim());
                                            const total = activeTasks.length;
                                            const done = activeTasks.filter(t => {
                                                const status = (t.status || '').toLowerCase();
                                                return t.done || status === 'completed' || status === 'published';
                                            }).length;
                                            return total > 0 ? Math.round((done / total) * 100) : 0;
                                        })()}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            
            <div className="w-full bg-slate-50/5 pb-10">
                <table className="w-full text-left border-collapse min-w-max table-fixed">
                    <thead className="sticky top-0 z-20 bg-[#d97706]">
                        <tr className="divide-x divide-white/10">
                            <th className="p-2 w-12 bg-[#b45309] text-[12px] font-black text-slate-900 dark:text-white text-center uppercase tracking-tight">No.</th>
                            <th className="p-2 w-10 bg-[#b45309]"></th>
                            {columns.map(col => (
                                <th key={col.key} className={`p-2 text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-tight ${col.width}`}>
                                    <div className="flex items-center gap-2">
                                        {col.icon}
                                        <span>{col.label}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/10">
                        {(() => {
                            const displayTasks = [];
                            let mainCounter = 0;
                            let subCounter = 0;

                            tasks.forEach((task, idx) => {
                                const isSubtask = task._isSubtask || (task.product === '' && task.mediaType !== '');
                                
                                // Apply product filter (case-insensitive)
                                if (filterProduct) {
                                    const fpLower = filterProduct.toLowerCase();
                                    // If it's a main task, check if it matches
                                    if (!isSubtask && (task.product || '').toLowerCase() !== fpLower) return;
                                    // If it's a subtask, it belongs to the previous main task
                                    if (isSubtask) {
                                        const parentTask = tasks.slice(0, idx).reverse().find(t => t.product && !t._isSubtask);
                                        if ((parentTask?.product || '').toLowerCase() !== fpLower) return;
                                    }
                                }
                                
                                let displayNumber = '';
                                if (!isSubtask) {
                                    mainCounter++;
                                    subCounter = 0;
                                    displayNumber = `${mainCounter}`;
                                } else {
                                    subCounter++;
                                    displayNumber = `${mainCounter}.${subCounter}`;
                                }

                                let hasSubtasks = false;
                                if (!isSubtask) {
                                    if (idx + 1 < tasks.length) {
                                        const nextTask = tasks[idx + 1];
                                        if (nextTask._isSubtask || (nextTask.product === '' && nextTask.mediaType !== '')) {
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
                                    hasSubtasks
                                });
                            });

                            return displayTasks.map(({ task, originalIndex, isSubtask, displayNumber, mainCounter, hasSubtasks }) => {
                                const idx = originalIndex;
                                const isCompleted = (task.status || '').toLowerCase() === 'completed';
                                return (
                                <tr key={idx} className={`group hover:bg-amber-500/5 transition-colors divide-x divide-slate-200/10 ${isCompleted ? 'bg-emerald-500/20' : ''}`}>
                                    <td className={`p-1 text-center font-black transition-colors ${isCompleted ? 'bg-emerald-500/40 text-emerald-300' : 'bg-slate-900/60 text-slate-500'}`}>
                                        <span className={isSubtask ? 'text-[12px] opacity-60' : 'text-[14px]'}>
                                            {displayNumber}
                                        </span>
                                    </td>
                                    <td className={`p-1 text-center transition-colors ${isCompleted ? 'bg-emerald-500/30' : 'bg-slate-900/40'}`}>
                                    <button
                                        onClick={() => removeRow(idx)}
                                        className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                                <td className="p-1 relative group/task">
                                    <div className={`flex items-start ${isSubtask ? 'pl-6 relative' : ''}`}>
                                        {!isSubtask && hasSubtasks && (
                                            <button
                                                onClick={() => toggleCollapse(mainCounter)}
                                                className="mt-1.5 mr-2 text-slate-500 hover:text-amber-500 transition-colors shrink-0"
                                            >
                                                {collapsedMains[mainCounter] ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        )}
                                        {!isSubtask && !hasSubtasks && (
                                            <div className="w-[22px] shrink-0" />
                                        )}
                                        
                                        {isSubtask && (
                                            <div className="absolute left-2 top-0 bottom-0 w-px bg-amber-500/20" />
                                        )}
                                        {isSubtask && (
                                            <div className="absolute left-2 top-1/2 w-3 h-px bg-amber-500/20" />
                                        )}
                                        
                                        <div className="flex-1 relative flex items-start w-full">
                                            {isSubtask && (
                                                <CornerDownRight size={12} className="text-amber-500/50 mt-1.5 mr-2 shrink-0" />
                                            )}
                                            
                                            <AutoResizeTextarea
                                                value={isSubtask ? task.mediaType : task.product}
                                                onChange={(e) => handleInputChange(idx, isSubtask ? 'mediaType' : 'product', e.target.value)}
                                                placeholder={isSubtask ? "Enter subtask..." : "Enter task..."}
                                        className="text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1"
                                            />
                                            
                                            {!isSubtask && task.product?.trim() && (
                                                <button
                                                    onClick={() => handleAddSubtask(idx)}
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 rounded-full transition-all flex items-center justify-center bg-amber-500/10"
                                                    title="Add Subtask"
                                                >
                                                    <Plus size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.marketingChannel}
                                        onChange={(e) => handleInputChange(idx, 'marketingChannel', e.target.value)}
                                        className="text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <div className={`rounded-lg border transition-all ${getStatusStyles(task.status)}`}>
                                        <select
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold uppercase tracking-wider px-2 py-1 appearance-none cursor-pointer"
                                            value={task.status}
                                            onChange={(e) => handleInputChange(idx, 'status', e.target.value)}
                                        >
                                            <option value="" className="bg-slate-900 text-slate-500">Select...</option>
                                            <option value="planning" className="bg-slate-900 text-slate-700 dark:text-slate-300">Planning</option>
                                            <option value="developing" className="bg-slate-900 text-blue-300">Developing</option>
                                            <option value="under review" className="bg-slate-900 text-amber-300">Under Review</option>
                                            <option value="on hold" className="bg-slate-900 text-rose-300">On Hold</option>
                                            <option value="completed" className="bg-slate-900 text-emerald-300">Completed</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.mainGoal}
                                        onChange={(e) => handleInputChange(idx, 'mainGoal', e.target.value)}
                                        className="text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <div className="flex items-start gap-2 px-2 pt-1">
                                        <User size={12} className="text-slate-500 mt-1 shrink-0" />
                                        <EmployeeMultiSelect
                                            value={task.owner}
                                            onChange={(val) => handleInputChange(idx, 'owner', val)}
                                            employees={employees}
                                        />
                                    </div>
                                </td>
                                <td className="p-1">
                                    <input
                                        type="date"
                                        value={formatDateForInput(task.startDate)}
                                        onChange={(e) => handleInputChange(idx, 'startDate', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1 [color-scheme:dark]"
                                    />
                                </td>
                                <td className="p-1">
                                    <input
                                        type="date"
                                        value={formatDateForInput(task.endDate)}
                                        onChange={(e) => handleInputChange(idx, 'endDate', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1 [color-scheme:dark]"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.description}
                                        onChange={(e) => handleInputChange(idx, 'description', e.target.value)}
                                        className="text-[15px] text-slate-900 dark:text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => handleInputChange(idx, 'done', !task.done)}
                                        className={`mx-auto w-5 h-5 rounded border flex items-center justify-center transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-slate-900 dark:text-white' : 'bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-slate-700 text-transparent dark:text-transparent'}`}
                                    >
                                        <CheckCircle size={12} />
                                    </button>
                                </td>
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

export default RnDSheet;
