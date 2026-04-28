import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    Save, Plus, Trash2, CheckCircle, Circle, User, Calendar,
    FileText, Clock, ChevronDown, CheckSquare, Cloud, Flag, File,
    MoreHorizontal, Download, Layout, Search
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
            className={`w-full bg-transparent border-none focus:ring-0 resize-none overflow-hidden min-h-[16px] text-[12px] leading-tight outline-none ${className}`}
            onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
            }}
        />
    );
};

const MarketingSheet = ({ planId, initialTasks = [], isNew = false, onSuccess, deptId, initialTitle = '', initialMonth = '', initialYear = new Date().getFullYear(), initialTarget = '', initialDescription = '' }) => {
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
                description: '', outcome: '', owner: '', status: 'Planned', priority: 'Medium',
                startDate: '', endDate: '', notes: '', completedBy: '',
                completedTime: '', reportTo: ''
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
        status: 'Planned',
        priority: '',
        startDate: '',
        endDate: '',
        notes: '',
        completedBy: '',
        completedTime: '',
        reportTo: ''
    }).map(row => ({ ...row })));

    const [saving, setSaving] = useState(false);

    // Statistics Calculation
    const stats = useMemo(() => {
        const validTasks = tasks.filter(t => 
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
    }, [tasks]);

    const columns = [
        { key: 'product', label: 'Product', icon: <ChevronDown size={14} />, width: 'w-40' },
        { key: 'mediaType', label: 'Media Type', icon: <ChevronDown size={14} />, width: 'w-24' },
        { key: 'marketingChannel', label: 'Marketing Channel', icon: <ChevronDown size={14} />, width: 'w-40' },
        { key: 'mainGoal', label: 'Main Goal', icon: <ChevronDown size={14} />, width: 'w-56' },
        { key: 'done', label: 'Done', icon: <CheckSquare size={14} />, width: 'w-12' },
        { key: 'description', label: 'Task Description', icon: <ChevronDown size={14} />, width: 'w-72' },
        { key: 'outcome', label: 'Expected Outcome', icon: <ChevronDown size={14} />, width: 'w-56' },
        { key: 'owner', label: 'Owner', icon: <User size={14} />, width: 'w-40' },
        { key: 'status', label: 'Status', icon: <Cloud size={14} />, width: 'w-32' },
        { key: 'priority', label: 'Priority', icon: <Flag size={14} />, width: 'w-28' },
        { key: 'startDate', label: 'Start date', icon: <Calendar size={14} />, width: 'w-36' },
        { key: 'endDate', label: 'End date', icon: <Calendar size={14} />, width: 'w-36' },
        { key: 'notes', label: 'Notes', icon: <FileText size={14} />, width: 'w-56' },
        { key: 'completedBy', label: 'Completed By', icon: <User size={14} />, width: 'w-40' },
        { key: 'completedTime', label: 'Completed Time', icon: <Clock size={14} />, width: 'w-40' },
        { key: 'reportTo', label: 'Report to', icon: <User size={14} />, width: 'w-40' },
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
            description: '', outcome: '', owner: '', status: 'Planned', priority: 'Medium',
            startDate: '', endDate: '', assets: '', notes: '', completedBy: '',
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
            case 'developing': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'under review': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'on hold': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'published': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            default: return 'bg-white/5 text-slate-500 border-transparent';
        }
    };

    const getPriorityStyles = (priority) => {
        if (!priority) return 'bg-white/5 text-slate-500 border-transparent';
        const p = priority.toLowerCase();
        switch (p) {
            case 'high': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'medium': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            default: return 'bg-white/5 text-slate-500 border-transparent';
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isNew) {
                const res = await axios.post(`${API_ORIGIN}/api/plans`, {
                    ...planData,
                    tasks: tasks.filter(t => t.product?.trim() || t.description?.trim() || t.mainGoal?.trim()),
                    department: deptId
                }, {
                    headers: { 'x-auth-token': localStorage.getItem('token') }
                });
                alert('Plan created successfully');
                if (onSuccess) onSuccess(res.data);
            } else {
                const res = await axios.put(`${API_ORIGIN}/api/plans/${planId}/tasks`, {
                    tasks: tasks.filter(t => t.product?.trim() || t.description?.trim() || t.mainGoal?.trim()),
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
        <div className="flex flex-col h-full bg-[#0a0f1d] rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
            {/* Header Section */}
            <div className="px-4 pt-4 pb-2 flex flex-col gap-4">

                {/* Form Inputs and Success Rate */}
                <div className="flex items-center gap-6">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Strategy Title</label>
                            <div className="relative group">
                                <input
                                    className="w-full bg-[#1a1f2e] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                                    value={planData.title}
                                    onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Month</label>
                            <select
                                className="w-full bg-[#1a1f2e] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold appearance-none"
                                value={planData.month}
                                onChange={(e) => setPlanData({ ...planData, month: e.target.value })}
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
                                className="w-full bg-[#1a1f2e] border border-white/5 rounded-2xl px-5 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all font-bold"
                                value={planData.year}
                                onChange={(e) => setPlanData({ ...planData, year: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="w-64 space-y-2">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Success Rate</label>
                            <span className="text-xs font-black text-slate-400">{stats.rate}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#1a1f2e] rounded-full overflow-hidden border border-white/5">
                            <div 
                                className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000"
                                style={{ width: `${stats.rate}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Total Tasks', value: stats.total, sub: 'this month', border: 'border-white/5' },
                        { label: 'Completed', value: stats.completed, sub: 'tasks done', border: 'border-emerald-500/30' },
                        { label: 'In Progress', value: stats.inProgress, sub: 'remaining', border: 'border-amber-500/30' },
                        { label: 'Completion', value: `${stats.rate}%`, sub: 'success rate', border: 'border-indigo-500/30 text-white' }
                    ].map((s, i) => (
                        <div key={i} className={`bg-[#1a1f2e]/50 border ${s.border} p-4 rounded-2xl`}>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-xl font-black text-white">{s.value}</h3>
                                <span className="text-[10px] font-bold text-slate-500">{s.sub}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs and Filters */}
                <div className="flex items-center justify-between mt-4 border-b border-white/5 pb-2">
                    <div className="flex gap-8">
                        {['Table View'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab.toLowerCase().split(' ')[0])}
                                className={`pb-4 text-sm font-black transition-all relative ${
                                    activeTab === tab.toLowerCase().split(' ')[0] 
                                    ? 'text-white' 
                                    : 'text-slate-500 hover:text-slate-300'
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
                        <div className="flex items-center bg-[#1a1f2e] border border-white/5 rounded-2xl px-4 py-2 text-slate-400">
                            <Search size={14} className="mr-3" />
                            <select 
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-300 cursor-pointer min-w-[120px]"
                                value={filterChannel}
                                onChange={(e) => setFilterChannel(e.target.value)}
                            >
                                <option>All Channels</option>
                                <option>Social Media</option>
                                <option>Email</option>
                            </select>
                        </div>
                        <div className="flex items-center bg-[#1a1f2e] border border-white/5 rounded-2xl px-4 py-2">
                            <select 
                                className="bg-transparent border-none outline-none text-xs font-bold text-slate-300 cursor-pointer min-w-[120px]"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option>All Status</option>
                                <option>Planned</option>
                                <option>Published</option>
                            </select>
                        </div>
                        <div className="ml-4 text-xs font-bold text-slate-600">
                            {stats.total} rows
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all font-bold text-xs"
                        >
                            <CheckCircle size={12} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button 
                            onClick={addRow}
                            className="flex items-center gap-1.5 px-3 py-1 bg-[#1a1f2e] hover:bg-[#252a3a] text-slate-300 border border-white/5 rounded-lg transition-all font-bold text-xs"
                        >
                            <Plus size={12} /> Add Row
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-white/[0.01]">
                <table className="w-full text-left border-collapse min-w-max table-fixed">
                    <thead className="sticky top-0 z-20 bg-[#0a0f1d]">
                        <tr className="border-b border-white/5">
                            <th className="px-1 py-0.5 w-12 text-[10px] font-black text-slate-500 text-center uppercase tracking-[0.2em]">No.</th>
                            <th className="px-1 py-0.5 w-10"></th>
                            {columns.map(col => (
                                <th key={col.key} className={`px-1 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ${col.width}`}>
                                    <div className="flex items-center gap-2">
                                        {col.icon}
                                        <span>{col.label}</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {tasks.map((task, idx) => {
                            const isPublished = (task.status || '').toLowerCase() === 'published';
                            return (
                                <tr key={idx} className={`group hover:bg-white/[0.02] transition-colors ${isPublished ? 'bg-emerald-500/5' : ''}`}>
                                    <td className="px-1 py-0.5 text-center">
                                        <span className="text-[10px] font-black text-slate-600 group-hover:text-slate-400 transition-colors">{idx + 1}</span>
                                    </td>
                                    <td className="px-1 py-0.5 text-center">
                                        <button
                                            onClick={() => removeRow(idx)}
                                            className="p-1 text-slate-700 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.product}
                                            onChange={(e) => handleInputChange(idx, 'product', e.target.value)}
                                            className="text-[12px] font-bold text-slate-200"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.mediaType}
                                            onChange={(e) => handleInputChange(idx, 'mediaType', e.target.value)}
                                            className="text-[12px] font-bold text-slate-300"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.marketingChannel}
                                            onChange={(e) => handleInputChange(idx, 'marketingChannel', e.target.value)}
                                            className="text-[12px] font-bold text-slate-300"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.mainGoal}
                                            onChange={(e) => handleInputChange(idx, 'mainGoal', e.target.value)}
                                            className="text-[12px] font-bold text-slate-300"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5 text-center">
                                        <button
                                            onClick={() => handleInputChange(idx, 'done', !task.done)}
                                            className={`mx-auto w-4 h-4 rounded-md border flex items-center justify-center transition-all ${task.done ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white/5 border-slate-700 text-transparent'}`}
                                        >
                                            <CheckCircle size={10} />
                                        </button>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.description}
                                            onChange={(e) => handleInputChange(idx, 'description', e.target.value)}
                                            className="text-[12px] font-medium text-slate-400"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.outcome}
                                            onChange={(e) => handleInputChange(idx, 'outcome', e.target.value)}
                                            className="text-[12px] font-medium text-slate-400"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center">
                                                <User size={9} className="text-indigo-400" />
                                            </div>
                                            <AutoResizeTextarea
                                                value={task.owner}
                                                onChange={(e) => handleInputChange(idx, 'owner', e.target.value)}
                                                className="text-[12px] font-bold text-slate-300"
                                                placeholder="..."
                                            />
                                        </div>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <div className={`rounded-lg border px-2 py-0.5 transition-all ${getStatusStyles(task.status)}`}>
                                            <select
                                                className="w-full bg-transparent border-none focus:ring-0 text-[9px] font-black uppercase tracking-widest cursor-pointer appearance-none outline-none"
                                                value={task.status}
                                                onChange={(e) => handleInputChange(idx, 'status', e.target.value)}
                                            >
                                                <option value="" className="bg-[#0a0f1d]">Select...</option>
                                                <option value="planning" className="bg-[#0a0f1d]">Planning</option>
                                                <option value="developing" className="bg-[#0a0f1d]">Developing</option>
                                                <option value="under review" className="bg-[#0a0f1d]">Review</option>
                                                <option value="on hold" className="bg-[#0a0f1d]">Hold</option>
                                                <option value="published" className="bg-[#0a0f1d]">Published</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <div className={`rounded-lg border px-2 py-0.5 transition-all ${getPriorityStyles(task.priority)}`}>
                                            <select
                                                className="w-full bg-transparent border-none focus:ring-0 text-[9px] font-black uppercase tracking-widest cursor-pointer appearance-none outline-none"
                                                value={task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1).toLowerCase() : ''}
                                                onChange={(e) => handleInputChange(idx, 'priority', e.target.value)}
                                            >
                                                <option value="" className="bg-[#0a0f1d]">Select...</option>
                                                <option value="High" className="bg-[#0a0f1d]">High</option>
                                                <option value="Medium" className="bg-[#0a0f1d]">Medium</option>
                                                <option value="Low" className="bg-[#0a0f1d]">Low</option>
                                            </select>
                                        </div>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <input
                                            type="date"
                                            value={task.startDate}
                                            onChange={(e) => handleInputChange(idx, 'startDate', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-300 [color-scheme:dark] outline-none"
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <input
                                            type="date"
                                            value={task.endDate}
                                            onChange={(e) => handleInputChange(idx, 'endDate', e.target.value)}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold text-slate-300 [color-scheme:dark] outline-none"
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.notes}
                                            onChange={(e) => handleInputChange(idx, 'notes', e.target.value)}
                                            className="text-[11px] font-medium text-slate-500 italic"
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <div className="flex items-center gap-2">
                                            <User size={11} className="text-slate-600" />
                                            <AutoResizeTextarea
                                                value={task.completedBy}
                                                onChange={(e) => handleInputChange(idx, 'completedBy', e.target.value)}
                                                className="text-[11px] font-bold text-slate-400"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <AutoResizeTextarea
                                            value={task.completedTime}
                                            onChange={(e) => handleInputChange(idx, 'completedTime', e.target.value)}
                                            className="text-[11px] font-bold text-slate-400"
                                        />
                                    </td>
                                    <td className="px-1 py-0.5">
                                        <div className="flex items-center gap-2">
                                            <User size={11} className="text-slate-600" />
                                            <AutoResizeTextarea
                                                value={task.reportTo}
                                                onChange={(e) => handleInputChange(idx, 'reportTo', e.target.value)}
                                                className="text-[11px] font-bold text-slate-400"
                                            />
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default MarketingSheet;
