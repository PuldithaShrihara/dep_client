import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, UserPlus, Search, Filter, MoreVertical,
    Edit2, Trash2, Mail, Shield, MapPin,
    CheckCircle2, XCircle, Loader2, X, AlertCircle
} from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'User',
        department: '',
        status: 'Active'
    });

    const departments = ['Marketing', 'Finance', 'R&D', 'Admin', 'Production'];
    const departmentOptions = ['All Departments', ...departments];
    const roles = ['Admin', 'DepartmentHead', 'User'];

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/users', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setUsers(res.data);
            setError('');
        } catch (err) {
            setError('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setIsEditing(true);
            setSelectedUser(user);
            setFormData({
                fullName: user.fullName || '',
                username: user.username,
                email: user.email || '',
                password: '',
                confirmPassword: '',
                role: user.role,
                department: user.department || 'All Departments',
                status: user.status
            });
        } else {
            setIsEditing(false);
            setSelectedUser(null);
            setFormData({
                fullName: '',
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: 'User',
                department: 'All Departments',
                status: 'Active'
            });
        }
        setShowModal(true);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const dataToSend = { ...formData };
            
            // Normalize "All Departments" to null for backend global access
            if (dataToSend.department === 'All Departments') {
                dataToSend.department = null;
            }

            if (isEditing) {
                const updateData = { ...dataToSend };
                if (!updateData.password) {
                    delete updateData.password;
                    delete updateData.confirmPassword;
                }
                const res = await axios.patch(`/api/users/${selectedUser._id}`, updateData, {
                    headers: { 'x-auth-token': token }
                });
                setUsers(users.map(u => u._id === selectedUser._id ? res.data : u));
            } else {
                const res = await axios.post('/api/users', dataToSend, {
                    headers: { 'x-auth-token': token }
                });
                setUsers([...users, res.data]);
            }
            setShowModal(false);
        } catch (err) {
            setError(err.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this user?')) return;
        try {
            await axios.delete(`/api/users/${id}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setUsers(users.filter(u => u._id !== id));
        } catch (err) {
            alert('Failed to delete user');
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDept = filterDept === 'all' || u.department === filterDept;
        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">User Administration</h2>
                    <p className="text-slate-400 font-medium">Manage access control and departmental assignments</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs"
                >
                    <UserPlus size={18} />
                    Create New Account
                </button>
            </div>

            {/* Filters Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, username or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium"
                    />
                </div>
                <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <select
                        value={filterDept}
                        onChange={(e) => setFilterDept(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500/50 transition-all font-medium appearance-none"
                    >
                        <option value="all">All Departments</option>
                        {departments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                </div>
                <div className="glass-panel border-white/5 flex items-center justify-center gap-4 px-6 rounded-2xl">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Total Accounts</span>
                    <span className="text-xl font-black text-white">{users.length}</span>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-panel border-white/5 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">User Profile</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role & Dept</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Synchronizing User Base...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-slate-700" />
                                            <span className="text-slate-500 font-bold">No matching records found in the directory</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="group hover:bg-indigo-500/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-black text-white text-lg">
                                                    {user.username[0].toUpperCase()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.username}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.fullName || 'No Name Set'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <Shield size={14} className="text-amber-400" />
                                                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider">{user.role}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-indigo-400" />
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase">{user.department || 'ALL DEPARTMENTS'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${user.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                    {user.status === 'Active' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {user.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all"
                                                    title="Edit User"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id)}
                                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                                                    title="Delete User"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md" onClick={() => !submitting && setShowModal(false)} />

                    <div className="relative w-full max-w-xl glass-panel border-white/10 rounded-[40px] shadow-2xl overflow-hidden entrance-animation">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black text-white">{isEditing ? 'Modify Account' : 'Initialize Profile'}</h3>
                                <p className="text-slate-400 font-medium text-sm">Set permissions and system access credentials</p>
                            </div>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-4">
                            {error && (
                                <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-bold">
                                    <AlertCircle size={18} />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Identity Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Username</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Protocol (Role)</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Department Scope</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        required
                                    >
                                        {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isEditing ? 'New Password (Optional)' : 'Password'}</label>
                                    <input
                                        type="password"
                                        required={!isEditing}
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{isEditing ? 'Confirm New Password' : 'Confirm Password'}</label>
                                    <input
                                        type="password"
                                        required={!isEditing && formData.password !== ''}
                                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs mt-6 disabled:opacity-50"
                            >
                                {submitting ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Processing...</span>
                                    </div>
                                ) : (
                                    isEditing ? 'Sync Modifications' : 'Finalize Authorization'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
