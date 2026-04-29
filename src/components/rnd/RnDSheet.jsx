import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Save, Plus, Trash2, CheckCircle, Circle, User, Calendar,
    FileText, Clock, ChevronDown, CheckSquare, Cloud, Flag, File,
    MoreHorizontal
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

const RnDSheet = ({ planId, initialTasks = [], isNew = false, onSuccess, deptId, initialTitle = '', initialMonth = '', initialYear = new Date().getFullYear(), initialTarget = '', initialDescription = '' }) => {
    const [planData, setPlanData] = useState({
        title: initialTitle,
        month: initialMonth,
        year: initialYear,
        target: initialTarget,
        description: initialDescription
    });

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
                completedTime: '', reportTo: ''
            }).map(row => ({ ...row })));
        }
    }, [planId, initialTitle, initialMonth, initialYear, initialTarget, initialDescription, initialTasks, isNew]);

    // Columns Mapping for R&D:
    // Task -> product
    // sub task -> mediaType
    // responsible -> marketingChannel
    // status -> status (custom styles)
    // remark (1) -> mainGoal
    // assigned employee -> owner
    // start date -> startDate
    // end date -> endDate
    // remark (2) -> description
    // done -> done

    const [tasks, setTasks] = useState(initialTasks.length > 0 ? initialTasks : Array(40).fill({
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

    const columns = [
        { key: 'product', label: 'Task', icon: <File size={14} />, width: 'w-64' },
        { key: 'mediaType', label: 'Sub Task', icon: <ChevronDown size={14} />, width: 'w-64' },
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
            case 'developing': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
            case 'under review': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
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
        <div className="flex flex-col h-full bg-[#020617]/50 rounded-[32px] overflow-hidden border border-white/5">
            <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-600/20 rounded-lg">
                            <Save className="text-amber-400" size={18} />
                        </div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-white">
                            {isNew ? 'Initialize New R&D Plan' : 'R&D Execution Sheet'}
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
                            className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-all text-xs font-black shadow-lg shadow-amber-600/20"
                        >
                            {saving ? 'Saving...' : <><Save size={14} /> Save</>}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 entrance-animation">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Plan Title</label>
                        <input
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500/50 transition-all font-medium"
                            placeholder="e.g. Next-Gen Product R&D"
                            value={planData.title}
                            onChange={(e) => setPlanData({ ...planData, title: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Month</label>
                        <select
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500/50 transition-all font-medium"
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
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:border-amber-500/50 transition-all font-medium"
                            value={planData.year}
                            onChange={(e) => setPlanData({ ...planData, year: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Success Percentage</label>
                        <div className="w-full bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-sm font-black text-amber-400 flex items-center justify-between">
                            <span>{(() => {
                                const activeTasks = tasks.filter(t => t.product?.trim() || t.mediaType?.trim());
                                const total = activeTasks.length;
                                const done = activeTasks.filter(t => {
                                    const status = (t.status || '').toLowerCase();
                                    return t.done || status === 'completed' || status === 'published';
                                }).length;
                                return total > 0 ? Math.round((done / total) * 100) : 0;
                            })()}%</span>
                            <div className="flex-1 ml-4 h-1.5 bg-white/5 rounded-full overflow-hidden">
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
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-slate-50/5">
                <table className="w-full text-left border-collapse min-w-max table-fixed">
                    <thead className="sticky top-0 z-20 bg-[#d97706]">
                        <tr className="divide-x divide-white/10">
                            <th className="p-2 w-12 bg-[#b45309] text-[11px] font-bold text-white text-center uppercase tracking-tight">No.</th>
                            <th className="p-2 w-10 bg-[#b45309]"></th>
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
                        {tasks.map((task, idx) => {
                            const isCompleted = (task.status || '').toLowerCase() === 'completed';
                            return (
                                <tr key={idx} className={`group hover:bg-amber-500/5 transition-colors divide-x divide-slate-200/10 ${isCompleted ? 'bg-emerald-500/20' : ''}`}>
                                    <td className={`p-1 text-center text-[11px] font-black transition-colors ${isCompleted ? 'bg-emerald-500/40 text-emerald-300' : 'bg-slate-900/60 text-slate-500'}`}>
                                        {idx + 1}
                                    </td>
                                    <td className={`p-1 text-center transition-colors ${isCompleted ? 'bg-emerald-500/30' : 'bg-slate-900/40'}`}>
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
                                    <div className={`rounded-lg border transition-all ${getStatusStyles(task.status)}`}>
                                        <select
                                            className="w-full bg-transparent border-none focus:ring-0 text-[11px] font-bold uppercase tracking-wider px-2 py-1 appearance-none cursor-pointer"
                                            value={task.status}
                                            onChange={(e) => handleInputChange(idx, 'status', e.target.value)}
                                        >
                                            <option value="" className="bg-slate-900 text-slate-500">Select...</option>
                                            <option value="planning" className="bg-slate-900 text-slate-300">Planning</option>
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
                                        className="text-[13px] text-slate-200 px-2 py-1"
                                    />
                                </td>
                                <td className="p-1">
                                    <div className="flex items-center gap-2 px-2">
                                        <User size={12} className="text-slate-500" />
                                        <AutoResizeTextarea
                                            value={task.owner}
                                            onChange={(e) => handleInputChange(idx, 'owner', e.target.value)}
                                            className="text-[13px] text-slate-200 py-1"
                                        />
                                    </div>
                                </td>
                                <td className="p-1">
                                    <input
                                        type="date"
                                        value={task.startDate}
                                        onChange={(e) => handleInputChange(idx, 'startDate', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-[13px] text-slate-200 px-2 py-1 [color-scheme:dark]"
                                    />
                                </td>
                                <td className="p-1">
                                    <input
                                        type="date"
                                        value={task.endDate}
                                        onChange={(e) => handleInputChange(idx, 'endDate', e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-[13px] text-slate-200 px-2 py-1 [color-scheme:dark]"
                                    />
                                </td>
                                <td className="p-1">
                                    <AutoResizeTextarea
                                        value={task.description}
                                        onChange={(e) => handleInputChange(idx, 'description', e.target.value)}
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
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RnDSheet;
