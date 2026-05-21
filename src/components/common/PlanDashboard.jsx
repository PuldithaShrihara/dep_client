import React, { useState, useMemo } from 'react';
import { 
    Layout, Package, ListTodo, Target, Clock, Edit3, Trash2, 
    ChevronRight, Plus, TrendingUp, ArrowLeft, BarChart3, X, CheckCircle
} from 'lucide-react';

const PlanDashboard = ({ 
    plan, 
    onBack, 
    onEdit, 
    onUpdatePlan,
    onDelete, 
    onAddProduct,
    onDeleteProduct,
    onProductClick,
    readOnly 
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditPlanModalOpen, setIsEditPlanModalOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({ name: '', imageFile: null, category: '' });
    const [editPlanData, setEditPlanData] = useState({ title: plan?.title || '', month: plan?.month || '' });

    // Group tasks by product to show in the products tab
    const products = useMemo(() => {
        if (!plan) return [];
        
        const productMap = {};
        
        const normalizeDate = (dStr) => {
            if (!dStr) return '';
            return String(dStr).trim().split(' ')[0].replace(/\//g, '-');
        };
        
        const getTodayDateStr = () => {
            const today = new Date();
            const pad = (num) => String(num).padStart(2, '0');
            return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
        };

        // 1. Initialize from dedicated products array (if it exists)
        if (plan.products && plan.products.length > 0) {
            plan.products.forEach(p => {
                productMap[p.name] = {
                    name: p.name,
                    category: p.category || 'Campaign',
                    totalTasks: 0,
                    completedTasks: 0,
                    overdueTasks: 0,
                    image: p.image || null
                };
            });
        }
        
        // 2. Merge in tasks and find any additional products from legacy data
        if (plan.tasks) {
            plan.tasks.forEach(task => {
                const productName = task.assets || task.product;
                if (!productName || !productName.trim()) return; // Ignore blank placeholder rows

                if (!productMap[productName]) {
                    productMap[productName] = {
                        name: productName,
                        category: task.mediaType || 'Marketing',
                        totalTasks: 0,
                        completedTasks: 0,
                        overdueTasks: 0,
                        image: task.productImage || null
                    };
                }
                
                if (!productMap[productName].overdueTasks) {
                    productMap[productName].overdueTasks = 0;
                }

                const status = (task.status || '').toLowerCase();
                const isComp = task.done || status === 'completed' || status === 'published';

                // Product-level alert count only includes unfinished overdue tasks.
                const isTaskOverdue = (() => {
                    if (!task.endDate) return false;
                    const endDate = new Date(task.endDate);
                    if (isNaN(endDate.getTime())) return false;
                    endDate.setHours(23, 59, 59, 999);
                    if (isComp) return false;

                    const today = new Date();
                    return today.getTime() > endDate.getTime();
                })();

                if (isTaskOverdue) {
                    productMap[productName].overdueTasks += 1;
                }

                // Ignore subtasks for high-level product progress bar ratio
                const isSubtask = !!task._isSubtask || (task.product === '' && (task.mediaType !== '' || task.mainGoal !== ''));
                if (isSubtask) return; 
                
                productMap[productName].totalTasks += 1;
                if (isComp) {
                    productMap[productName].completedTasks += 1;
                }
            });
        }

        return Object.values(productMap).map(p => ({
            ...p,
            progress: p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0,
            overdueTasks: p.overdueTasks || 0
        }));
    }, [plan]);

    if (!plan) return null;

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (newProductData.name && onAddProduct) {
            onAddProduct(
                newProductData.name,
                newProductData.imageFile,
                '',
                newProductData.category
            );
            setNewProductData({ name: '', imageFile: null, category: '' });
            setIsAddModalOpen(false);
        }
    };

    const handleUpdateSubmit = (e) => {
        e.preventDefault();
        if (onUpdatePlan) {
            onUpdatePlan(editPlanData.title, editPlanData.month);
            setIsEditPlanModalOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] text-slate-200 animate-in fade-in duration-500 relative">
            {/* Custom Edit Plan Modal */}
            {isEditPlanModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Edit Plan Details</h3>
                            <button onClick={() => setIsEditPlanModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Plan Name</label>
                                <input 
                                    type="text" 
                                    value={editPlanData.title}
                                    onChange={(e) => setEditPlanData({...editPlanData, title: e.target.value})}
                                    placeholder="e.g. Q4 Marketing Plan"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Plan Month</label>
                                <select 
                                    value={editPlanData.month}
                                    onChange={(e) => setEditPlanData({...editPlanData, month: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                    required
                                >
                                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                                        <option key={m} value={m} className="bg-slate-900 text-white">{m}</option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 mt-2"
                            >
                                Save Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Custom Add Product Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Add New Product</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddSubmit} className="space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto pr-2">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Product Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={newProductData.name}
                                    onChange={(e) => setNewProductData({...newProductData, name: e.target.value})}
                                    placeholder="e.g. GlowFace Cleanser"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Category (optional)</label>
                                <select
                                    value={newProductData.category}
                                    onChange={(e) => setNewProductData({ ...newProductData, category: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-bold cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900 text-slate-200">Select a category...</option>
                                    <option value="Fadna" className="bg-slate-900 text-slate-200">Fadna</option>
                                    <option value="Quality of Life" className="bg-slate-900 text-slate-200">Quality of Life</option>
                                    <option value="Life Science" className="bg-slate-900 text-slate-200">Life Science</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Product Image (PNG)</label>
                                <input
                                    type="file"
                                    accept="image/png"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setNewProductData({ ...newProductData, imageFile: file });
                                    }}
                                    className="w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>

                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 mt-2"
                            >
                                Create Product
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-8 pb-4">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
                >
                    <div className="w-8 h-8 rounded-full bg-white/5 group-hover:bg-indigo-600 flex items-center justify-center transition-all">
                        <ArrowLeft size={16} className="group-hover:text-white transition-colors" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Back to Plans</span>
                </button>

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-3 text-indigo-400 font-black text-sm uppercase tracking-[0.2em] mb-2">
                            <span>{plan.month} {plan.year} Plan</span>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 text-xs">
                                In Progress
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase">
                            {plan.title}
                        </h2>
                        <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
                            {plan.description || 'Monitor and manage product-specific marketing campaigns and strategic objectives.'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsEditPlanModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-indigo-600/20 uppercase tracking-widest"
                        >
                            <Edit3 size={16} /> Edit Plan
                        </button>
                        {!readOnly && (
                            <button 
                                onClick={onDelete}
                                className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/10 rounded-xl transition-all"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto px-8 pb-8 custom-scrollbar">
                <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">Products</h3>
                            <p className="text-slate-500 text-xs font-bold tracking-tight">Analyze progress of each segment under this plan</p>
                        </div>
                        {!readOnly && (
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20"
                            >
                                <Plus size={14} /> Add Product
                            </button>
                        )}
                    </div>

                    <div className="space-y-10 pb-8">
                        {[
                            { id: 'fadna', label: 'Fadna', color: 'text-indigo-400' },
                            { id: 'qol', label: 'Quality of Life', color: 'text-emerald-400' },
                            { id: 'ls', label: 'Life Science', color: 'text-amber-400' }
                        ].map(section => {
                            const sectionProducts = products.filter(p => {
                                const cat = (p.category || '').toLowerCase();
                                if (section.id === 'fadna') return cat === 'fadna';
                                if (section.id === 'qol') return cat === 'quality of life';
                                if (section.id === 'ls') return cat === 'life science';
                                return false;
                            });

                            if (sectionProducts.length === 0) return null;

                            return (
                                <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                    <div className="flex items-center gap-4 mb-5">
                                        <h3 className={`text-lg font-black uppercase tracking-[0.25em] ${section.color}`}>
                                            {section.label}
                                        </h3>
                                        <div className="h-px flex-1 bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        {sectionProducts.map((product, idx) => (
                                            <div 
                                                key={product.name}
                                                onClick={() => onProductClick && onProductClick(product.name)}
                                                className={`group relative flex items-center gap-6 p-4 rounded-2xl transition-all duration-500 cursor-pointer overflow-hidden shadow-xl ${
                                                    product.overdueTasks > 0
                                                    ? 'bg-red-500/[0.01] border border-red-500/30 hover:border-red-500/50 shadow-lg shadow-red-950/10'
                                                    : 'bg-white/[0.02] border border-white/5 hover:border-indigo-500/30'
                                                }`}
                                            >
                                                {/* Hover Glow Effect */}
                                                <div className={`absolute inset-0 bg-gradient-to-r transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${
                                                    product.overdueTasks > 0
                                                    ? 'from-red-500/0 via-red-500/0 to-red-500/5'
                                                    : 'from-indigo-500/0 via-indigo-500/0 to-indigo-500/5'
                                                }`} />
                                                {!readOnly && onDeleteProduct && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Delete ${product.name}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteProduct(product.name);
                                                        }}
                                                        className="absolute right-3 top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-slate-500 opacity-0 transition-all hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                
                                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900 border border-white/10 shrink-0 group-hover:scale-105 transition-transform duration-500 shadow-2xl">
                                                    <img 
                                                        src={product.image || '/skincare_product_1_1778561641568.png'} 
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="flex-1 min-w-0 relative">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-indigo-400 transition-colors">
                                                            {product.name}
                                                        </h4>
                                                        {product.overdueTasks > 0 && (
                                                            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)] animate-pulse shrink-0">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                                {product.overdueTasks} Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8 mr-2 relative">
                                                    <div className="text-right min-w-[160px]">
                                                        <div className="flex justify-between items-end mb-2.5 px-1">
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Completion</span>
                                                            <span className="text-lg font-black text-indigo-400">{product.progress}%</span>
                                                        </div>
                                                        <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                                                                style={{ width: `${product.progress || 0}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onProductClick && onProductClick(product.name);
                                                            }}
                                                            className="px-4.5 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                                                        >
                                                            + Campaigns
                                                        </button>
                                                        <ChevronRight size={24} className="text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}

                        {products.length === 0 && (
                            <div className="h-[400px] flex flex-col items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-[48px] animate-in fade-in zoom-in duration-700">
                                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                                    <Package className="text-slate-500" size={40} />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">No Products Defined</h3>
                                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Portfolio will populate automatically</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanDashboard;
