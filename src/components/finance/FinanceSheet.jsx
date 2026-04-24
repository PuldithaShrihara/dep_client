import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Save, Plus, Trash2, CheckCircle, Circle, User, Calendar,
    FileText, Clock, ChevronDown, CheckSquare, Cloud, DollarSign, File
} from 'lucide-react';
import { API_ORIGIN } from '../../config';

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

const FinanceSheet = ({ planId, initialTasks = [], isNew = false, onSuccess, deptId, initialTitle = '', initialMonth = '', initialYear = new Date().getFullYear(), initialTarget = '', initialDescription = '' }) => {
    const [planData, setPlanData] = useState({
        title: initialTitle,
        month: initialMonth,
        year: initialYear,
        target: initialTarget,
        description: initialDescription
    });

    const recurringTasksList = [
        "Import Costing", "Batch Wise Product Cost", "Settled head office invoice",
        "Daily Head Office Cash Sale Invoice settle", "Updating Bank Details",
        "Enter the deposit slips into the ERP system.", "Overlook outstanding balances",
        "Preparing Weekly Group Cash Flow", "Check the weekly cash receipts updates",
        "Checking Web order cash deposit", "City Pack Invoice Settle",
        "Preparing Weekly Collection report for Sales Rep",
        "Preparing Weekly Sales Invoice Report for Sales Rep", "Petty cash float checking",
        "Updating payments to cash flow.", "Report of Advance Payment with days",
        "Check internal cash sales details", "Preparing Outstanding Repots - Fadna Tea (Pvt) Ltd",
        "Physical Cheque verification", "Filling the supplier payments bank wise.",
        "Check the Post date cheques in hand amount", "Documents Filing",
        "Check the MT outstanding With Invoices", "Finalized the Collecting receipts from sales Represented.",
        "Fuel Card payment", "Documents Filling", "Monthly Stock Report",
        "Check Route Expenses", "Disposal Stock Report",
        "Preparing Bank reconciliation of Fadna Tea (Pvt) Ltd banks.", "Preparing for Bank Reconciliation",
        "Monthly Collection & Deposit Report", "Monthly Cash Collection & Bank Deposit Report",
        "Sales Commission", "Stock Shortage Report", "Prepare monthly P & L",
        "Preparing Route Wise P & L", "PAYE & WHT Payment", "Issue Salary Slips",
        "Update the Staff Loan Balances", "Update the Security Deposits", "SSCL Payment",
        "Salary - Finalized", "EPF & ETF Payment", "Prepare the quarter tax return – SSCL",
        "PAYE & WHT Return", "Annual Accounts - FLS", "CIT Return"
    ];

    const getInitialTasks = () => {
        if (initialTasks.length > 0) return initialTasks;
        if (isNew) {
            return recurringTasksList.map(taskName => ({
                product: taskName,      // Task
                mediaType: '',    // sub task
                marketingChannel: '', // responsible
                status: 'planning', // status
                mainGoal: '',     // remark (1)
                owner: '',        // assigned employee
                startDate: '',    // start date
                endDate: '',      // end date
                description: '',  // remark (2)
                done: false,      // done
                outcome: '',
                priority: '',
                notes: '',
                completedBy: '',
                completedTime: '',
                reportTo: ''
            }));
        }
        return Array(20).fill({
            product: '', mediaType: '', marketingChannel: '', status: 'planning',
            mainGoal: '', owner: '', startDate: '', endDate: '', description: '',
            done: false, outcome: '', priority: '', notes: '',
            completedBy: '', completedTime: '', reportTo: ''
        }).map(row => ({ ...row }));
    };

    const [tasks, setTasks] = useState(getInitialTasks());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isNew && planId) {
            setPlanData({
                title: initialTitle || '',
                month: initialMonth || '',
                year: initialYear || new Date().getFullYear(),
                target: initialTarget || '',
                description: initialDescription || ''
            });
            setTasks(initialTasks && initialTasks.length > 0 ? initialTasks : getInitialTasks());
        }
    }, [planId, initialTitle, initialMonth, initialYear, initialTarget, initialDescription, initialTasks, isNew]);

    const columns = [
        { key: 'product', label: 'Task', icon: <File size={14} />, width: 'w-64' },
        { key: 'status', label: 'Status', icon: <Cloud size={14} />, width: 'w-40' },
        { key: 'mediaType', label: 'Submitted', icon: <ChevronDown size={14} />, width: 'w-40' },
        { key: 'marketingChannel', label: 'Officer 1', icon: <User size={14} />, width: 'w-40' },
        { key: 'mainGoal', label: 'Officer 2', icon: <User size={14} />, width: 'w-40' },
        { key: 'owner', label: 'Officer 3', icon: <User size={14} />, width: 'w-40' },
        { key: 'priority', label: 'Officer 4', icon: <User size={14} />, width: 'w-40' },
        { key: 'done', label: 'Done', icon: <CheckSquare size={14} />, width: 'w-20' },
    ];

    const handleInputChange = (index, key, value) => {
        setTasks(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const addRow = () => {
        setTasks([...tasks, {
            product: '', mediaType: '', marketingChannel: '', mainGoal: '', done: false,
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

    const getStatusStyles = (status) => {
        switch (status) {
            case 'planning': return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
            case 'in progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'pending': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'on hold': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'completed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            default: return 'bg-white/5 text-slate-500 border-transparent';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isNew) {
                const res = await axios.post(`${API_ORIGIN}/api/plans`, {
                    ...planData,
                    tasks: tasks.filter(t => t.product || t.mediaType),
                    department: deptId
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('Finance Plan created successfully');
                if (onSuccess) onSuccess(res.data);
            } else {
                const res = await axios.put(`${API_ORIGIN}/api/plans/${planId}/tasks`, {
                    tasks: tasks.filter(t => t.product?.trim() || t.description?.trim() || t.mainGoal?.trim()),
                    ...planData
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('Finance Plan updated successfully');
                if (onSuccess) onSuccess(res.data);
            }
        } catch (err) {
            console.error('Error saving finance plan:', err.response?.data || err.message);
            alert(`Error saving plan: ${err.response?.data?.msg || err.message}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#020617]/50 rounded-[32px] overflow-hidden border border-white/5">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-600/20 rounded-lg">
                            <DollarSign className="text-emerald-400" size={18} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-white">
                            {isNew ? 'Initialize New Finance Plan' : 'Finance Execution Sheet'}
                        </h4>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={addRow}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-all text-xs font-bold"
                        >
                            <Plus size={14} /> Add Row
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-emerald-600/20"
                        >
                            {saving ? 'Saving...' : <><Save size={14} /> {isNew ? 'Deploy Plan' : 'Update Sheet'}</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 entrance-animation">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plan Title</label>
                        <input
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500/50 transition-all font-medium"
                            placeholder="e.g. Monthly Finance Audit"
                            value={planData.title}
                            onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Month</label>
                        <select
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500/50 transition-all font-medium"
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
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-emerald-500/50 transition-all font-medium"
                            value={planData.year}
                            onChange={(e) => setPlanData({ ...planData, year: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Success Percentage</label>
                        <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2 text-sm font-black text-emerald-400 flex items-center justify-between">
                            <span>{(() => {
                                const activeTasks = tasks.filter(t => t.product?.trim());
                                const total = activeTasks.length;
                                const done = activeTasks.filter(t => t.done).length;
                                return total > 0 ? Math.round((done / total) * 100) : 0;
                            })()}%</span>
                            <div className="flex-1 ml-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-1000" 
                                    style={{ width: `${(() => {
                                        const activeTasks = tasks.filter(t => t.product?.trim());
                                        const total = activeTasks.length;
                                        const done = activeTasks.filter(t => t.done).length;
                                        return total > 0 ? Math.round((done / total) * 100) : 0;
                                    })()}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/5">
                <table className="w-full text-left border-collapse min-w-max table-fixed">
                    <thead className="sticky top-0 z-20 bg-[#059669]">
                        <tr className="divide-x divide-white/10">
                            <th className="p-2 w-10 bg-[#047857]"></th>
                            {columns.map(col => (
                                <th key={col.key} className={`p-2 text-[11px] font-bold text-white uppercase tracking-tight ${col.width}`}>
                                    <div className="flex items-center gap-2">
                                        {col.icon}
                                        <span>{col.label}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/10">
                        {tasks.map((task, idx) => (
                            <tr key={idx} className={`group hover:bg-emerald-500/5 transition-colors divide-x divide-slate-200/10 ${task.done ? 'bg-emerald-500/20' : ''}`}>
                                <td className={`p-1 text-center transition-colors ${task.done ? 'bg-emerald-500/30' : 'bg-slate-900/40'}`}>
                                    <button
                                        onClick={() => removeRow(idx)}
                                        className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.product}
                                        onChange={(e) => handleInputChange(idx, 'product', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
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
                                            <option value="planning" className="bg-slate-900 text-slate-300">Planning</option>
                                            <option value="in progress" className="bg-slate-900 text-blue-300">In Progress</option>
                                            <option value="pending" className="bg-slate-900 text-amber-300">Pending</option>
                                            <option value="on hold" className="bg-slate-900 text-rose-300">On Hold</option>
                                            <option value="completed" className="bg-slate-900 text-emerald-300">Completed</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.mediaType}
                                        onChange={(e) => handleInputChange(idx, 'mediaType', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.marketingChannel}
                                        onChange={(e) => handleInputChange(idx, 'marketingChannel', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.mainGoal}
                                        onChange={(e) => handleInputChange(idx, 'mainGoal', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.owner}
                                        onChange={(e) => handleInputChange(idx, 'owner', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.priority}
                                        onChange={(e) => handleInputChange(idx, 'priority', e.target.value)}
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1 text-center">
                                    <button
                                        onClick={() => handleInputChange(idx, 'done', !task.done)}
                                        className={`mx-auto w-5 h-5 rounded border flex items-center justify-center transition-all ${task.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-slate-700 text-transparent'}`}
                                    >
                                        <CheckCircle size={12} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinanceSheet;
