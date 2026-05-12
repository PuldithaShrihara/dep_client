import React, { useState, useMemo } from 'react';
import { 
    Layout, Package, ListTodo, Target, Clock, Edit3, Trash2, 
    ChevronRight, Plus, TrendingUp, ArrowLeft, BarChart3, X
} from 'lucide-react';

const PlanDashboard = ({ 
    plan, 
    onBack, 
    onEdit, 
    onDelete, 
    onAddProduct,
    onDeleteProduct,
    onProductClick,
    readOnly 
}) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newProductData, setNewProductData] = useState({ name: '', image: '' });

    // Group tasks by product to show in the products tab
    const products = useMemo(() => {
        if (!plan || !plan.tasks) return [];
        
        const productMap = {};
        
        plan.tasks.forEach(task => {
            const productName = task.product || 'General/Miscellaneous';
            if (!productMap[productName]) {
                productMap[productName] = {
                    name: productName,
                    category: task.mediaType || 'Marketing',
                    totalTasks: 0,
                    completedTasks: 0,
                    image: task.productImage || null
                };
            }
            
            productMap[productName].totalTasks += 1;
            const status = (task.status || '').toLowerCase();
            if (task.done || status === 'completed' || status === 'published') {
                productMap[productName].completedTasks += 1;
            }
        });

        return Object.values(productMap).map(p => ({
            ...p,
            progress: p.totalTasks > 0 ? Math.round((p.completedTasks / p.totalTasks) * 100) : 0
        }));
    }, [plan]);

    if (!plan) return null;

    const handleAddSubmit = (e) => {
        e.preventDefault();
        if (newProductData.name && onAddProduct) {
            onAddProduct(newProductData.name, newProductData.image);
            setNewProductData({ name: '', image: '' });
            setIsAddModalOpen(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] text-slate-200 animate-in fade-in duration-500 relative">
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
                        <form onSubmit={handleAddSubmit} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Product Name</label>
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
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Image URL (Optional)</label>
                                <input 
                                    type="text" 
                                    value={newProductData.image}
                                    onChange={(e) => setNewProductData({...newProductData, image: e.target.value})}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold"
                                />
                            </div>
                            <button 
                                type="submit"
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 mt-4"
                            >
                                Create Product
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="p-8 pb-4">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-3 text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                            <span>{plan.month} {plan.year} Plan</span>
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20 text-[9px]">
                                In Progress
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-white tracking-tighter mb-3 uppercase">
                            {plan.title}
                        </h2>
                        <p className="text-slate-400 max-w-2xl text-sm font-medium leading-relaxed">
                            {plan.description || 'Monitor and manage product-specific marketing campaigns and strategic objectives for this period.'}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={onEdit}
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
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">Products</h3>
                            <p className="text-slate-500 text-xs font-bold tracking-tight">Track progress of each product under this plan</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setIsAddModalOpen(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                            >
                                <Plus size={14} /> Add Product
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {products.length === 0 ? (
                            <div className="p-12 text-center bg-white/5 border border-dashed border-white/10 rounded-[32px]">
                                <Package size={48} className="mx-auto text-slate-600 mb-4 opacity-20" />
                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No products defined in this plan</p>
                            </div>
                        ) : products.map((product, idx) => (
                            <div 
                                key={idx}
                                onClick={() => onProductClick && onProductClick(product.name)}
                                className="group relative flex items-center gap-6 p-5 bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 rounded-[24px] transition-all duration-300 cursor-pointer"
                            >
                                {/* Mock Product Image */}
                                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-800 border border-white/10 shrink-0">
                                    <img 
                                        src={product.image || [
                                            '/skincare_product_1_1778561641568.png',
                                            '/skincare_product_2_1778561675994.png',
                                            '/skincare_product_3_1778561699216.png'
                                        ][idx % 3]} 
                                        alt={product.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.src = '/skincare_product_1_1778561641568.png';
                                        }}
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="text-lg font-black text-white mb-1 truncate">{product.name}</h4>
                                    <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">{product.category}</span>
                                </div>

                                <div className="w-64 px-8">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Progress</span>
                                        <span className="text-sm font-black text-indigo-400">{product.progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-1000"
                                            style={{ width: `${product.progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button className="px-5 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-600/30 rounded-xl font-black text-[12px] uppercase tracking-widest transition-all flex items-center gap-2">
                                        <Plus size={14} /> Create Campaign
                                    </button>
                                    {!readOnly && (
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
                                                    onDeleteProduct(product.name);
                                                }
                                            }}
                                            className="p-2.5 bg-white/5 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-xl transition-all"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <ChevronRight size={20} className="text-slate-600 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlanDashboard;
