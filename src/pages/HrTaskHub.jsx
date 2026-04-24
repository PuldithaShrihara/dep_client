import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    ClipboardCheck, Users, Calendar, CheckCircle2,
    Circle, AlertCircle, Loader2, BarChart3,
    Plus, Search, Filter, ArrowLeft, MoreHorizontal,
    MessageSquare, Clock, User, ChevronDown
} from 'lucide-react';
import { API_ORIGIN } from '../config';

const HrTaskHub = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [areas, setAreas] = useState([]);
    const [completions, setCompletions] = useState([]);
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [month, setMonth] = useState(parseInt(searchParams.get('month')) || new Date().getMonth() + 1);
    const [year, setYear] = useState(parseInt(searchParams.get('year')) || new Date().getFullYear());
    const [expandedTaskId, setExpandedTaskId] = useState(null);
    const [updating, setUpdating] = useState(null);
    const [draftValues, setDraftValues] = useState({}); // Tracking { memberId, observedByMemberId, remarks } per taskId

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetchData();
    }, [month, year]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const [areasRes, completionsRes, membersRes] = await Promise.all([
                axios.get(`${API_ORIGIN}/api/hr/areas`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_ORIGIN}/api/hr/completions?month=${month}&year=${year}`, { headers: { 'x-auth-token': token } }),
                axios.get(`${API_ORIGIN}/api/hr/members`, { headers: { 'x-auth-token': token } })
            ]);
            setAreas(areasRes.data);
            setCompletions(completionsRes.data);
            setMembers(membersRes.data);
        } catch (err) {
            console.error(err);
            setError('Failed to synchronize HR data modules.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleCompletion = async (taskId) => {
        const existing = completions.find(c => c.taskId === taskId);
        const token = localStorage.getItem('token');
        const draft = draftValues[taskId] || {};

        if (existing) {
            if (!window.confirm('Remove this completion record?')) return;
            try {
                await axios.delete(`${API_ORIGIN}/api/hr/completions/${existing.completionId}`, {
                    headers: { 'x-auth-token': token }
                });
                setCompletions(completions.filter(c => c.completionId !== existing.completionId));
            } catch (err) {
                alert('De-registration failed.');
            }
        } else {
            const memberId = draft.memberId || members[0]?.id;
            if (!memberId) return alert('No HR members found to assign task.');

            try {
                const res = await axios.post(`${API_ORIGIN}/api/hr/completions`, {
                    taskId,
                    memberId,
                    observedByMemberId: draft.observedByMemberId || memberId,
                    month,
                    year,
                    remarks: draft.remarks || 'Manual completion via Hub'
                }, { headers: { 'x-auth-token': token } });
                setCompletions([...completions, res.data]);
                
                // Clear draft after success
                setDraftValues(prev => {
                    const next = { ...prev };
                    delete next[taskId];
                    return next;
                });
            } catch (err) {
                alert('Task completion signal failed.');
            }
        }
    };

    const handleUpdateField = async (completionId, field, value) => {
        const token = localStorage.getItem('token');
        setUpdating(completionId);
        try {
            const body = {};
            if (field === 'memberId') body.memberId = value;
            if (field === 'observedByMemberId') body.observedByMemberId = value;
            if (field === 'remarks') body.remarks = value;

            const res = await axios.patch(`${API_ORIGIN}/api/hr/completions/${completionId}`, body, {
                headers: { 'x-auth-token': token }
            });

            setCompletions(prev => prev.map(c => c.completionId === completionId ? res.data : c));
        } catch (err) {
            console.error('Update operation failed:', err);
            const msg = err.response?.data?.message || err.message;
            alert(`Update rejected: ${msg}`);
        } finally {
            setUpdating(null);
        }
    };

    const stats = useMemo(() => {
        const totalTasks = areas.reduce((acc, area) => acc + area.tasks.length, 0);
        const completedCount = completions.length;
        const percentage = totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);
        return { totalTasks, completedCount, percentage };
    }, [areas, completions]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">Initializing HR Strategic Board...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-10 entrance-animation">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft size={14} />
                        Back to Nexus
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-indigo-600 rounded-xl">
                            <ClipboardCheck size={24} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">HR Task Hub <span className="text-indigo-500">Board</span></h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400" />
                            <span className="text-xs font-bold text-slate-300">{monthNames[month - 1]} {year}</span>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Monthly operational compliance and HR performance data</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-4 w-full md:w-auto">
                    <div className="glass-panel border-white/5 px-6 py-4 rounded-3xl flex-1 md:min-w-[160px]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Compliance Rate</p>
                        <div className="flex items-end gap-2">
                            <span className="text-2xl font-black text-white">{stats.percentage}%</span>
                            <div className="w-full bg-white/5 h-1.5 rounded-full mb-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                                    style={{ width: `${stats.percentage}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="glass-panel border-white/5 px-6 py-4 rounded-3xl flex-1 md:min-w-[160px]">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Executed Tasks</p>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-white">{stats.completedCount}</span>
                            <span className="text-slate-500 font-bold">/ {stats.totalTasks}</span>
                        </div>
                    </div>
                </div>
            </header>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 font-bold text-sm">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {areas.map((area, idx) => (
                    <div
                        key={area.id}
                        className="group flex flex-col glass-panel border-white/5 rounded-[40px] p-8 hover:border-indigo-500/30 transition-all duration-500 hover:translate-y-[-4px]"
                        style={{ animationDelay: `${idx * 0.1}s` }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="space-y-1">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{area.category}</span>
                                <h2 className="text-xl font-black text-white group-hover:text-indigo-300 transition-colors uppercase leading-tight">{area.title}</h2>
                                <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase">
                                    <Clock size={10} />
                                    <span>{area.frequency} CHECK</span>
                                </div>
                            </div>
                            <div className="p-3 bg-white/5 rounded-2xl">
                                <BarChart3 size={20} className="text-indigo-400 opacity-50" />
                            </div>
                        </div>

                        <div className="space-y-3 flex-1">
                            {area.tasks.map(task => {
                                const completion = completions.find(c => c.taskId === task.id);
                                return (
                                    <React.Fragment key={task.id}>
                                        <div
                                            className={`group/task flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${completion
                                                    ? 'bg-indigo-500/10 border-indigo-500/20'
                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleCompletion(task.id);
                                                }}
                                                className={`transition-transform duration-300 hover:scale-110 cursor-pointer ${completion ? 'text-indigo-400' : 'text-slate-700 hover:text-slate-500'}`}
                                            >
                                                {completion ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                                            </div>
                                            <div
                                                className={`flex-1 ${(['Joined staff updates', 'Policy renewal', 'New members adding', 'Resigned members removing', 'Claim handling', 'Exit interview', 'Resignation letter', 'Resignation acceptance letter', 'Service letter', 'Clearance form', 'Document handover', 'Resigned Employee Registry'].includes(task.label)) ? 'cursor-pointer group/label' : ''}`}
                                                onClick={() => {
                                                    const isInsurance = ['Policy renewal', 'New members adding', 'Resigned members removing', 'Claim handling'].includes(task.label);
                                                    const isResigned = ['Exit interview', 'Resignation letter', 'Resignation acceptance letter', 'Service letter', 'Clearance form', 'Document handover', 'Resigned Employee Registry'].includes(task.label);
                                                    const ns = area.title.toLowerCase().includes('general') ? 'general-insurance' : 'life-insurance';
                                                    
                                                    if (task.label === 'Joined staff updates') {
                                                        navigate(`/admin/hr/new-employees?month=${month}&year=${year}`);
                                                    } else if (isInsurance) {
                                                        let tab = 'policy-renewal';
                                                        if (task.label === 'New members adding') tab = 'new-members';
                                                        else if (task.label === 'Resigned members removing') tab = 'resigned-members';
                                                        else if (task.label === 'Claim handling') tab = 'claims';
                                                        navigate(`/admin/hr/insurance?namespace=${ns}&tab=${tab}&month=${month}&year=${year}`);
                                                    } else if (isResigned) {
                                                        navigate(`/admin/hr/resigned-employees?month=${month}&year=${year}`);
                                                    } else {
                                                        setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <p className={`text-sm font-bold transition-colors ${completion ? 'text-white' : 'text-slate-400'} ${(['Joined staff updates', 'Policy renewal', 'New members adding', 'Resigned members removing', 'Claim handling'].includes(task.label)) ? 'group-hover/label:text-indigo-400' : ''}`}>
                                                        {task.label}
                                                    </p>
                                                    {(['Joined staff updates', 'Policy renewal', 'New members adding', 'Resigned members removing', 'Claim handling'].includes(task.label)) && (
                                                        <ArrowLeft size={12} className="text-indigo-500 rotate-180 opacity-0 group-hover/label:opacity-100 transition-all transform group-hover/label:translate-x-1" />
                                                    )}
                                                </div>
                                                {expandedTaskId === task.id && (
                                                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mt-1">
                                                        {task.subLabel || 'Standard HR Procedure'}
                                                    </p>
                                                )}
                                            </div>

                                            {completion && expandedTaskId !== task.id && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 mr-2">
                                                    <User size={10} className="text-indigo-400" />
                                                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">{completion.memberName}</span>
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                                                }}
                                                className={`p-2.5 rounded-xl transition-all duration-300 border flex items-center justify-center ${expandedTaskId === task.id 
                                                    ? 'bg-indigo-600 border-indigo-500/30 text-white shadow-lg shadow-indigo-500/20' 
                                                    : 'bg-white/[0.03] border-white/5 text-slate-600 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <ChevronDown 
                                                    size={16} 
                                                    className={`transition-transform duration-500 ease-in-out ${expandedTaskId === task.id ? 'rotate-180' : ''}`} 
                                                />
                                            </button>
                                        </div>

                                        {expandedTaskId === task.id && (
                                            <div className="mt-3 ml-2 md:ml-6 p-5 bg-slate-900/60 rounded-[24px] border border-white/10 entrance-animation space-y-5 shadow-2xl backdrop-blur-xl">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned By (Main)</label>
                                                        <select
                                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500/50 transition-all font-bold appearance-none cursor-pointer outline-none"
                                                            value={completion ? (completion.memberId || '') : (draftValues[task.id]?.memberId || members[0]?.id || '')}
                                                            onChange={(e) => {
                                                                if (completion) {
                                                                    handleUpdateField(completion.completionId, 'memberId', e.target.value);
                                                                } else {
                                                                    setDraftValues(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), memberId: e.target.value } }));
                                                                }
                                                            }}
                                                            disabled={updating === completion?.completionId}
                                                        >
                                                            <option value="" disabled className="bg-slate-900 text-slate-500">Select Member...</option>
                                                            {members.map(m => (
                                                                <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observed By</label>
                                                        <select
                                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500/50 transition-all font-bold appearance-none cursor-pointer outline-none"
                                                            value={completion ? (completion.observedById || '') : (draftValues[task.id]?.observedByMemberId || members[0]?.id || '')}
                                                            onChange={(e) => {
                                                                if (completion) {
                                                                    handleUpdateField(completion.completionId, 'observedByMemberId', e.target.value);
                                                                } else {
                                                                    setDraftValues(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), observedByMemberId: e.target.value } }));
                                                                }
                                                            }}
                                                            disabled={updating === completion?.completionId}
                                                        >
                                                            <option value="" className="bg-slate-900 text-slate-500">Not assigned</option>
                                                            {members.map(m => (
                                                                <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="pt-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Operational Remarks & Notes</label>
                                                    <textarea
                                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-300 focus:border-indigo-500/50 transition-all font-medium mt-2 resize-none min-h-[80px]"
                                                        placeholder="Document findings or execution hurdles here..."
                                                        value={completion ? (completion.remarks || '') : (draftValues[task.id]?.remarks || '')}
                                                        onChange={(e) => {
                                                            if (completion) {
                                                                setCompletions(prev => prev.map(c => c.completionId === completion.completionId ? { ...c, remarks: e.target.value } : c));
                                                            } else {
                                                                setDraftValues(prev => ({ ...prev, [task.id]: { ...(prev[task.id] || {}), remarks: e.target.value } }));
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            if (completion) {
                                                                handleUpdateField(completion.completionId, 'remarks', e.target.value);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                
                                                {!completion && (
                                                    <div className="pt-2 flex justify-end">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleToggleCompletion(task.id);
                                                            }}
                                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                                                        >
                                                            Confirm Completion
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Progress</div>
                                <div className="flex items-center gap-1">
                                    <CheckCircle2 size={12} className="text-indigo-500" />
                                    <span className="text-xs font-black text-white">
                                        {area.tasks.filter(t => completions.find(c => c.taskId === t.id)).length} / {area.tasks.length}
                                    </span>
                                </div>
                            </div>
                            <button className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors">
                                <MoreHorizontal size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default HrTaskHub;
