import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Save, Plus, Trash2, UserMinus, Calendar,
    User, ArrowLeft, Loader2, AlertCircle,
    Building2, FileText, CheckCircle2, Clock, 
    Search, UserX
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const ResignedEmployeeSheet = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const taskColumns = [
        { key: 'exitInterview', label: 'Exit Interview' },
        { key: 'resignationLetter', label: 'Resign Letter' },
        { key: 'acceptanceLetter', label: 'Accept Letter' },
        { key: 'serviceLetter', label: 'Service Letter' },
        { key: 'clearanceForm', label: 'Clearance Form' },
        { key: 'documentHandover', label: 'Doc Handover' }
    ];

    useEffect(() => {
        fetchAppData();
    }, [month, year]);

    const fetchAppData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const axiosConfig = { 
                headers: { 'x-auth-token': token },
                timeout: 5000 // 5 second timeout to prevent hanging
            };

            const [entriesRes, membersRes, deptsRes] = await Promise.all([
                axios.get(`/api/resigned-employees/entries?month=${month}&year=${year}`, axiosConfig),
                axios.get('/api/hr/members', axiosConfig),
                axios.get('/api/departments', axiosConfig)
            ]);
            
            let fetched = entriesRes.data || [];
            if (!Array.isArray(fetched) || fetched.length === 0) {
                fetched = Array.from({ length: 3 }, () => ({
                    fullName: '', department: '',
                    tasks: {
                        exitInterview: 'Pending',
                        resignationLetter: 'Pending',
                        acceptanceLetter: 'Pending',
                        serviceLetter: 'Pending',
                        clearanceForm: 'Pending',
                        documentHandover: 'Pending'
                    },
                    observedById: null, observedByName: '',
                    remarks: '', completed: false
                }));
            }

            setEntries(fetched);
            setMembers(membersRes.data || []);
            setDepartments(deptsRes.data || []);
        } catch (err) {
            console.error(err);
            setError(`Connection Warning: ${err.message}. Showing local offline rows.`);
            
            // Standard fallback rows to ensure UI is ALWAYS interactive
            const fallbackRows = Array.from({ length: 3 }, () => ({
                fullName: '', department: '',
                tasks: {
                    exitInterview: 'Pending',
                    resignationLetter: 'Pending',
                    acceptanceLetter: 'Pending',
                    serviceLetter: 'Pending',
                    clearanceForm: 'Pending',
                    documentHandover: 'Pending'
                },
                observedById: null, observedByName: '',
                remarks: '', completed: false
            }));
            setEntries(fallbackRows);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (idx, key, value) => {
        const next = [...entries];
        next[idx] = { ...next[idx], [key]: value };
        setEntries(next);
    };

    const handleTaskChange = (idx, taskKey, value) => {
        const next = [...entries];
        next[idx] = {
            ...next[idx],
            tasks: { ...next[idx].tasks, [taskKey]: value }
        };
        setEntries(next);
    };

    const addRow = () => {
        setEntries([...entries, {
            fullName: '', department: '',
            tasks: {
                exitInterview: 'Pending',
                resignationLetter: 'Pending',
                acceptanceLetter: 'Pending',
                serviceLetter: 'Pending',
                clearanceForm: 'Pending',
                documentHandover: 'Pending'
            },
            observedById: null, observedByName: '',
            remarks: '', completed: false
        }]);
    };

    const deleteRow = async (idx) => {
        const entry = entries[idx];
        if (entry._id || entry.id) {
            if (!window.confirm('Wipe this record from the database?')) return;
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`/api/resigned-employees/entry/${entry._id || entry.id}`, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Record purged');
            } catch (err) {
                toast.error('Purge failed');
                return;
            }
        }
        setEntries(entries.filter((_, i) => i !== idx));
    };

    const saveEntry = async (idx) => {
        const entry = entries[idx];
        if (!entry.fullName.trim()) return toast.error('Employee Name is required');

        setSaving(true);
        const toastId = toast.loading('Securing record...');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/resigned-employees/entry', {
                month,
                year,
                entry
            }, { headers: { 'x-auth-token': token } });
            
            const next = [...entries];
            next[idx] = res.data.entry;
            setEntries(next);
            toast.success('Record synchronized', { id: toastId });
        } catch (err) {
            toast.error('Sync failed', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Done': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'In Progress': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'N/A': return 'text-slate-500 bg-slate-500/5 border-slate-500/10';
            default: return 'text-rose-400 bg-rose-500/5 border-rose-500/10';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-slate-400">
                <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest">Accessing Exit Records...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1700px] mx-auto px-6 py-8 space-y-8 entrance-animation">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <button
                        onClick={() => navigate(`/admin/hr?month=${month}&year=${year}`)}
                        className="flex items-center gap-2 text-rose-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft size={14} />
                        Nexus Task Hub
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-rose-600 rounded-xl shadow-lg shadow-rose-600/20 text-white">
                            <UserX size={24} />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">Resigned Employee <span className="text-rose-500">Registry</span></h1>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 backdrop-blur-sm">
                            <Calendar size={14} className="text-rose-400" />
                            <span className="text-white">{monthNames[month - 1]} {year}</span>
                        </div>
                        <span className="text-slate-500">Exit Clearance Tracking Grid</span>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                   <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Status Legend</span>
                       <div className="flex gap-2">
                           {[
                               { label: 'Completed', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                               { label: 'Pending', color: 'text-slate-500 bg-white/5 border-white/10' }
                           ].map(s => (
                               <span key={s.label} className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase ${s.color}`}>
                                   {s.label}
                               </span>
                           ))}
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

            {/* Excel Grid Table */}
            <div className="glass-panel border-white/5 rounded-[40px] overflow-hidden flex flex-col bg-[#020617]/40 backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-white/5">
                                <th className="p-4 w-12"></th>
                                <th className="p-4 w-12 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Done
                                </th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-64">
                                    <div className="flex items-center gap-2"><User size={14} />Employee Name</div>
                                </th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-40">
                                    <div className="flex items-center gap-2"><Building2 size={14} />Dept</div>
                                </th>
                                {taskColumns.map(tc => (
                                    <th key={tc.key} className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-28">
                                        {tc.label}
                                    </th>
                                ))}
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-44 text-center">
                                    <div className="flex items-center gap-2 justify-center"><Search size={14} />Verified By</div>
                                </th>
                                <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[200px]">
                                    <div className="flex items-center gap-2"><FileText size={14} />Exit Notes</div>
                                </th>
                                <th className="p-4 w-20 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Saved</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {entries.map((entry, idx) => (
                                <tr key={idx} className="group hover:bg-white/[0.02] transition-all">
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => deleteRow(idx)}
                                            className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleInputChange(idx, 'completed', !entry.completed)}
                                            className={`transition-all duration-300 transform hover:scale-110 ${entry.completed ? 'text-rose-500' : 'text-slate-700 hover:text-slate-500'}`}
                                        >
                                            {entry.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <AutoResizeTextarea
                                            value={entry.fullName || ''}
                                            onChange={(e) => handleInputChange(idx, 'fullName', e.target.value)}
                                            placeholder="Member Name..."
                                            className="text-xs text-white font-bold px-2 py-2"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            value={entry.department || ''}
                                            onChange={(e) => handleInputChange(idx, 'department', e.target.value)}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest outline-none focus:border-rose-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="">Select...</option>
                                            {departments.map(d => (
                                                <option key={d._id} value={d.name}>{d.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    
                                    {taskColumns.map(tc => (
                                        <td key={tc.key} className="p-2 text-center">
                                            <button
                                                onClick={() => handleTaskChange(idx, tc.key, (entry.tasks && entry.tasks[tc.key] === 'Done') ? 'Pending' : 'Done')}
                                                className={`p-2 rounded-xl border transition-all duration-300 transform hover:scale-110 flex items-center justify-center mx-auto ${
                                                    (entry.tasks && entry.tasks[tc.key] === 'Done')
                                                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10'
                                                        : 'bg-white/[0.03] border-white/5 text-slate-700 hover:border-white/20'
                                                }`}
                                            >
                                                {(entry.tasks && entry.tasks[tc.key] === 'Done') ? (
                                                    <CheckCircle2 size={18} className="animate-in zoom-in duration-300" />
                                                ) : (
                                                    <Circle size={18} />
                                                )}
                                            </button>
                                        </td>
                                    ))}

                                    <td className="p-2">
                                        <select
                                            value={entry.observedById || ''}
                                            onChange={(e) => {
                                                const m = members.find(m => m.id === e.target.value);
                                                handleInputChange(idx, 'observedById', e.target.value);
                                                handleInputChange(idx, 'observedByName', m ? m.name : '');
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-2 py-1.5 text-[9px] font-black text-slate-300 uppercase tracking-widest outline-none focus:border-rose-500/50 appearance-none cursor-pointer text-center"
                                        >
                                            <option value="">Select...</option>
                                            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <AutoResizeTextarea
                                            value={entry.remarks || ''}
                                            onChange={(e) => handleInputChange(idx, 'remarks', e.target.value)}
                                            placeholder="Add logs..."
                                            className="text-[10px] text-slate-500 font-medium px-2 py-2"
                                        />
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => saveEntry(idx)}
                                            disabled={saving}
                                            className={`p-2.5 rounded-xl transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 ${entry._id || entry.id ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-white/5 text-slate-600 hover:text-white border border-white/10'}`}
                                        >
                                            <Save size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-8 bg-slate-900/20 flex justify-between items-center border-t border-white/5">
                    <button
                        onClick={addRow}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Plus size={14} /> Add Exit Row
                    </button>
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <UserMinus size={14} className="text-rose-500" />
                            <span>Monthly Exits: {entries.filter(e => e.fullName).length}</span>
                        </div>
                        <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse" />
                        <span>Ready for Nexus Sync</span>
                    </div>
                </div>
            </div>

            <footer className="flex items-center justify-between text-[9px] font-black text-slate-700 uppercase tracking-widest px-2">
                <div className="flex items-center gap-4">
                    <span>Registry Mode: Resigned Employee Table</span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                    <span>6-Axis Clearance Matrix Enabled</span>
                </div>
                <span>Nexus Clearance v2.4</span>
            </footer>
        </div>
    );
};

export default ResignedEmployeeSheet;
