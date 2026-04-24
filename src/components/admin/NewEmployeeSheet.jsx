import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    Save, Plus, Trash2, UserPlus, Calendar,
    User, ArrowLeft, Loader2, AlertCircle,
    Building2, Phone, Fingerprint, FileText
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

const NewEmployeeSheet = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const month = parseInt(searchParams.get('month')) || new Date().getMonth() + 1;
    const year = parseInt(searchParams.get('year')) || new Date().getFullYear();

    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        fetchEntries();
    }, [month, year]);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_ORIGIN}/api/new-employees?month=${month}&year=${year}`, {
                headers: { 'x-auth-token': token }
            });
            
            // If no entries, start with a few empty rows
            if (res.data.entries.length === 0) {
                setEntries(Array(5).fill({
                    fullName: '', nameWithInitial: '', nic: '', dob: '',
                    department: '', contactNo: '', remarks: ''
                }).map((row, i) => ({ ...row, sortOrder: i })));
            } else {
                setEntries(res.data.entries);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load employee directory.');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (index, key, value) => {
        setEntries(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [key]: value };
            return next;
        });
    };

    const addRow = () => {
        setEntries([...entries, {
            fullName: '', nameWithInitial: '', nic: '', dob: '',
            department: '', contactNo: '', remarks: '',
            sortOrder: entries.length
        }]);
    };

    const removeRow = async (index) => {
        const entry = entries[index];
        if (entry.id) {
            if (!window.confirm('Delete this record permanently?')) return;
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_ORIGIN}/api/new-employees/${entry.id}`, {
                    headers: { 'x-auth-token': token }
                });
                toast.success('Record removed');
            } catch (err) {
                toast.error('Failed to delete');
                return;
            }
        }
        const newEntries = entries.filter((_, i) => i !== index);
        setEntries(newEntries);
    };

    const handleSave = async () => {
        // Filter out completely empty rows
        const validEntries = entries.filter(e => e.fullName.trim() !== '' || e.nic.trim() !== '');
        
        setSaving(true);
        const toastId = toast.loading('Synchronizing data...');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_ORIGIN}/api/new-employees/save`, {
                month,
                year,
                entries: validEntries
            }, {
                headers: { 'x-auth-token': token }
            });
            toast.success('Directory updated successfully', { id: toastId });
            fetchEntries();
        } catch (err) {
            toast.error('Failed to save changes', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { key: 'fullName', label: 'Full Name', icon: <User size={14} />, width: 'w-80' },
        { key: 'nameWithInitial', label: 'Name with Initial', icon: <User size={14} />, width: 'w-64' },
        { key: 'nic', label: 'NIC Number', icon: <Fingerprint size={14} />, width: 'w-48' },
        { key: 'dob', label: 'D.O.B', icon: <Calendar size={14} />, width: 'w-40' },
        { key: 'department', label: 'Department', icon: <Building2 size={14} />, width: 'w-48' },
        { key: 'contactNo', label: 'Contact No', icon: <Phone size={14} />, width: 'w-48' },
        { key: 'remarks', label: 'Remarks', icon: <FileText size={14} />, width: 'w-64' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading Employee Registry...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8 entrance-animation">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <button
                        onClick={() => navigate(`/admin/hr?month=${month}&year=${year}`)}
                        className="flex items-center gap-2 text-indigo-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-4"
                    >
                        <ArrowLeft size={14} />
                        Back to HR Task Hub
                    </button>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-indigo-600 rounded-xl">
                            <UserPlus size={24} className="text-white" />
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">New Joiners <span className="text-indigo-500">Registry</span></h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                            <Calendar size={14} className="text-indigo-400" />
                            <span className="text-xs font-bold text-slate-300">{monthNames[month - 1]} {year}</span>
                        </div>
                        <span className="text-slate-500 text-sm font-medium">Onboarding details for newly recruited staff</span>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto md:mr-12">
                    <button
                        onClick={addRow}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                        <Plus size={14} /> Add Entry
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        {saving ? 'Processing...' : <><Save size={14} /> Save Changes</>}
                    </button>
                </div>
            </header>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 flex items-center gap-3 font-bold text-sm">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Table Container */}
            <div className="glass-panel border-white/5 rounded-[40px] overflow-hidden flex flex-col bg-[#020617]/40 backdrop-blur-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-max table-fixed">
                        <thead>
                            <tr className="bg-indigo-600/90 border-b border-indigo-500/20">
                                <th className="p-2 w-16 bg-indigo-700/50"></th>
                                {columns.map(col => (
                                    <th key={col.key} className={`p-2.5 text-[10px] font-black text-white uppercase tracking-widest ${col.width}`}>
                                        <div className="flex items-center gap-2">
                                            <span className="p-1 bg-white/10 rounded-lg">{col.icon}</span>
                                            <span>{col.label}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-slate-900/20">
                            {entries.map((entry, idx) => (
                                <tr key={idx} className="group hover:bg-indigo-500/[0.03] transition-colors divide-x divide-white/5">
                                    <td className="p-2 text-center bg-white/[0.02]">
                                        <button
                                            onClick={() => removeRow(idx)}
                                            className="p-2 text-slate-600 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                    {columns.map(col => (
                                        <td key={col.key} className="p-1 focus-within:bg-indigo-500/[0.05] transition-colors">
                                            {col.key === 'dob' ? (
                                                <input
                                                    type="date"
                                                    value={entry[col.key] || ''}
                                                    onChange={(e) => handleInputChange(idx, col.key, e.target.value)}
                                                    className="w-full bg-transparent border-none focus:ring-0 text-[12px] text-slate-200 px-2 py-1.5 [color-scheme:dark] font-medium"
                                                />
                                            ) : (
                                                <AutoResizeTextarea
                                                    value={entry[col.key] || ''}
                                                    onChange={(e) => handleInputChange(idx, col.key, e.target.value)}
                                                    placeholder={`Enter ${col.label.toLowerCase()}...`}
                                                    className="text-[12px] text-slate-200 px-2 py-1.5 font-medium placeholder:text-slate-700"
                                                />
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {entries.length === 0 && (
                    <div className="py-20 text-center space-y-4">
                        <User size={48} className="mx-auto text-slate-700" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No entries found for this period</p>
                        <button onClick={addRow} className="text-indigo-400 hover:text-indigo-300 font-black text-xs uppercase tracking-widest border-b border-indigo-400/30 pb-1">Initialize Registry</button>
                    </div>
                )}
            </div>

            {/* Hint Footer */}
            <footer className="flex items-center justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">
                <div className="flex items-center gap-4">
                    <span>Total Entries: {entries.filter(e => e.fullName.trim() !== '').length}</span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span>Auto-saving disabled: Press Save changes to sync with Nexus</span>
                </div>
                <span>DPMS Onboarding Module v1.0</span>
            </footer>
        </div>
    );
};

export default NewEmployeeSheet;
