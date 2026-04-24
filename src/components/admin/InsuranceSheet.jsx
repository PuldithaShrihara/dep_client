import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Save, Plus, Trash2, ShieldPlus, Calendar,
    User, ArrowLeft, Loader2, AlertCircle,
    Building2, FileText, CheckCircle2, Clock, Search
} from 'lucide-react';
import toast from 'react-hot-toast';
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

const InsuranceSheet = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();
    const initialTab = searchParams.get('tab') || 'new-members';
    const namespace = searchParams.get('namespace') || 'life-insurance';

    const isGeneral = namespace === 'general-insurance';
    const registryTitle = isGeneral ? 'General' : 'Life';

    const [activeTab, setActiveTab] = useState(initialTab);
    const [entriesByTab, setEntriesByTab] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [members, setMembers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [error, setError] = useState('');

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const tabs = [
        { id: 'policy-renewal', label: 'Policy Renewal', icon: <Clock size={14} />, color: isGeneral ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500' },
        { id: 'new-members', label: 'New Members Adding', icon: <Plus size={14} />, color: 'from-emerald-500 to-teal-500' },
        { id: 'resigned-members', label: 'Resigned Members Removal', icon: <Trash2 size={14} />, color: 'from-rose-500 to-orange-500' },
        { id: 'claims', label: 'Claim Handling', icon: <ShieldPlus size={14} />, color: isGeneral ? 'from-cyan-500 to-blue-500' : 'from-indigo-500 to-violet-500' }
    ];

    useEffect(() => {
        fetchAppData();
    }, [month, year, namespace]);

    const fetchAppData = async () => {
        try {
            setLoading(true);
            setError('');

            const token = localStorage.getItem('token');

            const [entriesRes, membersRes, deptsRes] = await Promise.all([
                axios.get(`${API_ORIGIN}/api/insurance/entries?namespace=${namespace}&month=${month}&year=${year}`, {
                    headers: { 'x-auth-token': token }
                }),
                axios.get(`${API_ORIGIN}/api/hr/members`, {
                    headers: { 'x-auth-token': token }
                }),
                axios.get(`${API_ORIGIN}/api/departments`, {
                    headers: { 'x-auth-token': token }
                })
            ]);

            const fetched = entriesRes.data.entriesByTab || {};
            const initialized = { ...fetched };

            tabs.forEach(tab => {
                if (!initialized[tab.id] || initialized[tab.id].length === 0) {
                    initialized[tab.id] = Array.from({ length: 3 }, () => ({
                        fullName: '',
                        email: '',
                        phone: '',
                        department: '',
                        status: 'In Progress',
                        assignedDate: new Date().toISOString().split('T')[0],
                        remarks: '',
                        completed: false
                    }));
                }
            });

            setEntriesByTab(initialized);
            setMembers(membersRes.data || []);
            setDepartments(deptsRes.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to synchronize insurance registry.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (idx, key, value) => {
        setEntriesByTab(prev => {
            const currentTabEntries = [...(prev[activeTab] || [])];
            currentTabEntries[idx] = { ...currentTabEntries[idx], [key]: value };
            return {
                ...prev,
                [activeTab]: currentTabEntries
            };
        });
    };

    const addRow = () => {
        setEntriesByTab(prev => {
            const currentTabEntries = [...(prev[activeTab] || [])];
            currentTabEntries.push({
                fullName: '',
                email: '',
                phone: '',
                department: '',
                status: 'In Progress',
                assignedDate: new Date().toISOString().split('T')[0],
                remarks: '',
                completed: false
            });
            return { ...prev, [activeTab]: currentTabEntries };
        });
    };

    const deleteRow = async (idx) => {
        const entry = entriesByTab[activeTab][idx];

        if (entry.id || entry._id) {
            if (!window.confirm('Wipe this record from the database?')) return;

            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_ORIGIN}/api/insurance/entry/${entry.id || entry._id}`, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Record purged');
            } catch (err) {
                toast.error('Purge failed');
                return;
            }
        }

        setEntriesByTab(prev => ({
            ...prev,
            [activeTab]: (prev[activeTab] || []).filter((_, i) => i !== idx)
        }));
    };

    const saveEntry = async (idx) => {
        const entry = entriesByTab[activeTab][idx];

        if (!entry.fullName.trim()) {
            return toast.error('Employee Name is required');
        }

        setSaving(true);
        const toastId = toast.loading('Securing record...');

        try {
            const token = localStorage.getItem('token');

            const res = await axios.post(`${API_ORIGIN}/api/insurance/entry`, {
                namespace,
                categoryKey: activeTab,
                month,
                year,
                entry
            }, {
                headers: { 'x-auth-token': token }
            });

            setEntriesByTab(prev => {
                const next = { ...prev };
                const currentTabEntries = [...(next[activeTab] || [])];
                currentTabEntries[idx] = res.data.entry;
                next[activeTab] = currentTabEntries;
                return next;
            });

            toast.success('Record synchronized', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Sync failed', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { key: 'fullName', label: 'Employee Full Name', icon: <User size={14} />, width: 'w-72' },
        { key: 'department', label: 'Dept', icon: <Building2 size={14} />, width: 'w-40' },
        { key: 'status', label: 'Execution Status', icon: <Clock size={14} />, width: 'w-44' },
        { key: 'observedById', label: 'Verified By', icon: <Search size={14} />, width: 'w-52' },
        { key: 'remarks', label: 'Operational Notes', icon: <FileText size={14} />, width: 'w-80' },
        { key: 'completed', label: 'Done', icon: <CheckCircle2 size={14} />, width: 'w-24' }
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
                    Accessing Insurance Vault...
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8 entrance-animation">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <button
                        onClick={() => navigate(`/admin/hr?month=${month}&year=${year}`)}
                        className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft size={14} />
                        Nexus Task Hub
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2.5 rounded-xl shadow-lg ${isGeneral ? 'bg-amber-600 shadow-amber-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
                            <ShieldPlus size={24} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            {registryTitle} Insurance{' '}
                            <span className={isGeneral ? 'text-amber-500' : 'text-indigo-500'}>
                                Registry
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 backdrop-blur-sm">
                            <Calendar size={14} className={isGeneral ? 'text-amber-400' : 'text-indigo-400'} />
                            <span className="text-xs font-bold text-slate-300">
                                {monthNames[month - 1]} {year}
                            </span>
                        </div>
                        <span className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">
                            Finance {registryTitle} Insurance Module
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5 backdrop-blur-md">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                                    ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 font-bold text-sm">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="glass-panel border-white/5 rounded-[40px] overflow-hidden flex flex-col bg-[#020617]/40 backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="bg-slate-900/80 border-b border-white/5">
                                <th className="p-4 w-20"></th>
                                {columns.map(col => (
                                    <th key={col.key} className={`p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest ${col.width}`}>
                                        <div className="flex items-center gap-2">
                                            {col.icon}
                                            {col.label}
                                        </div>
                                    </th>
                                ))}
                                <th className="p-4 w-24"></th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-white/5">
                            {(entriesByTab[activeTab] || []).map((entry, idx) => (
                                <tr key={idx} className="group hover:bg-white/[0.02] transition-all">
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => deleteRow(idx)}
                                            className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
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
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="">Select Dept...</option>
                                            {departments.map(d => (
                                                <option key={d._id || d.id || d.name} value={d.name}>
                                                    {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td className="p-2">
                                        <select
                                            value={entry.status || 'In Progress'}
                                            onChange={(e) => handleInputChange(idx, 'status', e.target.value)}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-indigo-400 uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="In Progress">In Progress</option>
                                            <option value="Renewed">Renewed</option>
                                            <option value="Pending Doc">Pending Doc</option>
                                            <option value="Completed">Completed</option>
                                        </select>
                                    </td>

                                    <td className="p-2">
                                        <select
                                            value={entry.observedById || ''}
                                            onChange={(e) => {
                                                const m = members.find(m => m.id === e.target.value || m._id === e.target.value);
                                                handleInputChange(idx, 'observedById', e.target.value);
                                                handleInputChange(idx, 'observedByName', m ? m.name : '');
                                            }}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-300 uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none cursor-pointer"
                                        >
                                            <option value="">System Select...</option>
                                            {members.map(m => (
                                                <option key={m.id || m._id} value={m.id || m._id}>
                                                    {m.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>

                                    <td className="p-2">
                                        <AutoResizeTextarea
                                            value={entry.remarks || ''}
                                            onChange={(e) => handleInputChange(idx, 'remarks', e.target.value)}
                                            placeholder="Operations logs..."
                                            className="text-[11px] text-slate-500 font-medium px-2 py-2"
                                        />
                                    </td>

                                    <td className="p-4 text-center">
                                        <button
                                            onClick={() => handleInputChange(idx, 'completed', !entry.completed)}
                                            className={`transition-all duration-300 ${entry.completed ? 'text-indigo-400 transform scale-110' : 'text-slate-800 hover:text-slate-600'}`}
                                        >
                                            {entry.completed ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                        </button>
                                    </td>

                                    <td className="p-4">
                                        <button
                                            onClick={() => saveEntry(idx)}
                                            disabled={saving}
                                            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                        >
                                            <Save size={14} />
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
                        <Plus size={14} /> Add New Entry
                    </button>

                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        <span>Active Rows: {(entriesByTab[activeTab] || []).length}</span>
                        <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                        <span>Ready for Synchronization</span>
                    </div>
                </div>
            </div>

            <footer className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">
                <div className="flex items-center gap-4">
                    <span>Registry Type: {registryTitle} Insurance Portfolio</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Real-time persistence enabled via POST/PATCH Nexus</span>
                </div>
                <span>Nexus Insurance Intelligence v1.0</span>
            </footer>
        </div>
    );
};

export default InsuranceSheet;