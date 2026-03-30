import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart3, 
  Package, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  ChevronRight, 
  Loader2, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  LogOut,
  LayoutGrid,
  Truck,
  MoreVertical,
  AlertCircle,
  Phone,
  Clock,
  MapPin
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Order, MenuItem, Category, Livreur, OrderItem } from "../types";
import { format, startOfDay, subDays, isWithinInterval, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const COLORS = ['#FFD000', '#FF8A00', '#FF4D00', '#FF0000', '#8B0000'];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'categories' | 'livreurs' | 'analytics'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'product' | 'category' | 'livreur' | 'order_details'>('product');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Real-time orders subscription
    const subscription = supabase
      .channel('admin-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, categoriesRes, livreursRes] = await Promise.all([
        supabase.from('orders').select('*, livreurs(full_name)').order('created_at', { ascending: false }),
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('order_index'),
        supabase.from('livreurs').select('*').order('full_name')
      ]);

      if (ordersRes.data) setOrders(ordersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (livreursRes.data) setLivreurs(livreursRes.data);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Statut mis à jour avec succès");
      fetchData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated');
    window.location.href = '/';
  };

  const analyticsData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const dayOrders = orders.filter(o => 
        isWithinInterval(new Date(o.created_at), {
          start: startOfDay(date),
          end: endOfDay(date)
        })
      );
      return {
        date: format(date, 'dd MMM', { locale: fr }),
        revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length
      };
    }).reverse();

    const categoryStats = categories.map(cat => ({
      name: cat.name,
      value: products.filter(p => p.category_id === cat.id).length
    }));

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    return { last7Days, categoryStats, totalRevenue, completedOrders, averageOrderValue };
  }, [orders, products, categories]);

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         o.tracking_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#FFD000] animate-spin" />
          <div className="absolute inset-0 blur-2xl bg-[#FFD000]/20 animate-pulse" />
        </div>
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-80 bg-black/50 backdrop-blur-xl border-b lg:border-b-0 lg:border-r border-white/5 sticky top-0 z-40 h-auto lg:h-screen flex flex-col">
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD000] rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#FFD000]/20">
            <Settings className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">ADMIN</h1>
            <p className="text-[10px] font-black text-[#FFD000] tracking-widest uppercase">F-QUICK DASHBOARD</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 py-4 lg:py-0 overflow-x-auto lg:overflow-x-visible flex lg:flex-col gap-2 lg:gap-0">
          {[
            { id: 'orders', label: 'Commandes', icon: ShoppingBag },
            { id: 'products', label: 'Produits', icon: Package },
            { id: 'categories', label: 'Catégories', icon: LayoutGrid },
            { id: 'livreurs', label: 'Livreurs', icon: Truck },
            { id: 'analytics', label: 'Analytiques', icon: BarChart3 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                activeTab === tab.id 
                  ? "bg-[#FFD000] text-black shadow-lg shadow-[#FFD000]/10 scale-105" 
                  : "text-gray-500 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon size={20} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5 mt-auto">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            <span className="hidden lg:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">COMMANDES</h2>
                <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input 
                      type="text" 
                      placeholder="Rechercher..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-[#FFD000] transition-all font-bold text-sm"
                    />
                  </div>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FFD000] transition-all font-bold text-sm uppercase tracking-widest"
                  >
                    <option value="all">TOUS LES STATUTS</option>
                    <option value="pending">EN ATTENTE</option>
                    <option value="accepted">PRÉPARATION</option>
                    <option value="delivering">LIVRAISON</option>
                    <option value="completed">TERMINÉ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredOrders.map((order) => (
                  <div 
                    key={order.id}
                    className="bg-white/5 rounded-[32px] p-6 border border-white/5 hover:border-white/10 transition-all group"
                  >
                    <div className="flex flex-col lg:flex-row justify-between gap-6">
                      <div className="flex items-start gap-6">
                        <div className={cn(
                          "w-16 h-16 rounded-2xl flex items-center justify-center rotate-3 shadow-lg",
                          order.status === 'completed' ? "bg-green-500/10 text-green-500" :
                          order.status === 'delivering' ? "bg-orange-500/10 text-orange-500" :
                          order.status === 'accepted' ? "bg-yellow-500/10 text-yellow-500" :
                          "bg-blue-500/10 text-blue-500"
                        )}>
                          <ShoppingBag size={32} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-xl font-black tracking-tighter uppercase italic">{order.customer_name}</h3>
                            <span className="text-[10px] font-black text-[#FFD000] tracking-widest uppercase bg-[#FFD000]/10 px-2 py-1 rounded-md">
                              {order.tracking_code}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-500">
                            <span className="flex items-center gap-1"><Phone size={14} /> {order.customer_phone}</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> {format(new Date(order.created_at), "HH:mm", { locale: fr })}</span>
                            <span className="flex items-center gap-1 text-[#FFD000]"><DollarSign size={14} /> {order.total} MAD</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={() => {
                            setSelectedItem(order);
                            setModalType('order_details');
                            setIsModalOpen(true);
                          }}
                          className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white"
                        >
                          <Eye size={20} />
                        </button>
                        
                        <div className="flex items-center gap-2 bg-black/40 p-2 rounded-2xl border border-white/5">
                          {['pending', 'accepted', 'delivering', 'completed'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusUpdate(order.id, status)}
                              disabled={isActionLoading}
                              className={cn(
                                "px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                                order.status === status 
                                  ? "bg-[#FFD000] text-black shadow-lg" 
                                  : "text-gray-600 hover:text-white hover:bg-white/5"
                              )}
                            >
                              {status === 'pending' ? 'Attente' : 
                               status === 'accepted' ? 'Prép' : 
                               status === 'delivering' ? 'Liv' : 'Fini'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div 
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">PRODUITS</h2>
                <button 
                  onClick={() => {
                    setSelectedItem(null);
                    setModalType('product');
                    setIsModalOpen(true);
                  }}
                  className="bg-[#FFD000] text-black px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-[#FFD000]/20"
                >
                  <Plus size={20} /> AJOUTER UN PRODUIT
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white/5 rounded-[40px] p-6 border border-white/5 hover:border-[#FFD000]/30 transition-all group">
                    <div className="relative aspect-video rounded-[24px] overflow-hidden mb-6">
                      <img 
                        src={product.image_url} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4">
                        <span className="bg-[#FFD000] text-black px-3 py-1 rounded-lg font-black text-xs">
                          {product.sizes?.[0]?.price || 0} MAD
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-black tracking-tighter uppercase italic group-hover:text-[#FFD000] transition-colors">{product.name}</h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                          {categories.find(c => c.id === product.category_id)?.name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedItem(product);
                            setModalType('product');
                            setIsModalOpen(true);
                          }}
                          className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={async () => {
                            if (confirm("Supprimer ce produit ?")) {
                              const { error } = await supabase.from('products').delete().eq('id', product.id);
                              if (error) toast.error("Erreur lors de la suppression");
                              else {
                                toast.success("Produit supprimé");
                                fetchData();
                              }
                            }
                          }}
                          className="p-3 bg-white/5 hover:bg-red-500/20 rounded-xl transition-colors text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'analytics' && (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              <h2 className="text-4xl font-black tracking-tighter uppercase italic">ANALYTIQUES</h2>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'REVENU TOTAL', value: `${analyticsData.totalRevenue.toFixed(2)} MAD`, icon: DollarSign, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'COMMANDES TERMINÉES', value: analyticsData.completedOrders, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'PANIER MOYEN', value: `${analyticsData.averageOrderValue.toFixed(2)} MAD`, icon: TrendingUp, color: 'text-[#FFD000]', bg: 'bg-[#FFD000]/10' },
                  { label: 'TOTAL PRODUITS', value: products.length, icon: Package, color: 'text-orange-500', bg: 'bg-orange-500/10' }
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white/5 rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
                    <div className={cn("absolute -right-4 -top-4 w-24 h-24 blur-3xl opacity-20 transition-opacity group-hover:opacity-40", stat.bg)} />
                    <stat.icon className={cn("mb-6", stat.color)} size={32} />
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 rounded-[40px] p-8 border border-white/5">
                  <h3 className="text-xl font-black tracking-tighter uppercase italic mb-8 flex items-center gap-3">
                    <div className="w-2 h-6 bg-[#FFD000] rounded-full" />
                    REVENU DES 7 DERNIERS JOURS
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsData.last7Days}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD000" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#FFD000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#666" 
                          fontSize={10} 
                          fontWeight="bold"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="#666" 
                          fontSize={10} 
                          fontWeight="bold"
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(value) => `${value} MAD`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px' }}
                          itemStyle={{ color: '#FFD000', fontWeight: 'bold' }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#FFD000" 
                          strokeWidth={4}
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 rounded-[40px] p-8 border border-white/5">
                  <h3 className="text-xl font-black tracking-tighter uppercase italic mb-8 flex items-center gap-3">
                    <div className="w-2 h-6 bg-[#FFD000] rounded-full" />
                    RÉPARTITION PAR CATÉGORIE
                  </h3>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analyticsData.categoryStats}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {analyticsData.categoryStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '16px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 mt-4">
                    {analyticsData.categoryStats.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setIsModalOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0A0A0A] border border-white/10 rounded-[48px] overflow-hidden shadow-2xl"
            >
              {modalType === 'product' && (
                <ProductForm 
                  product={selectedItem} 
                  categories={categories} 
                  onClose={() => setIsModalOpen(false)} 
                  onSuccess={() => {
                    setIsModalOpen(false);
                    fetchData();
                  }}
                />
              )}
              {modalType === 'order_details' && selectedItem && (
                <OrderDetails 
                  order={selectedItem} 
                  onClose={() => setIsModalOpen(false)} 
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductForm({ product, categories, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    description: product?.description || "",
    image_url: product?.image_url || "",
    category_id: product?.category_id || categories[0]?.id || "",
    is_active: product?.is_active ?? true,
    sizes: product?.sizes || [{ size_name: "Standard", price: 0, is_default: true }]
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (product) {
        const { error } = await supabase
          .from('products')
          .update(formData)
          .eq('id', product.id);
        if (error) throw error;
        toast.success("Produit mis à jour");
      } else {
        const { error } = await supabase
          .from('products')
          .insert(formData);
        if (error) throw error;
        toast.success("Produit créé");
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-12 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-black tracking-tighter uppercase italic">
          {product ? "MODIFIER PRODUIT" : "NOUVEAU PRODUIT"}
        </h2>
        <button type="button" onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
          <XCircle size={24} className="text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">NOM DU PRODUIT</label>
            <input 
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#FFD000] font-bold"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">CATÉGORIE</label>
            <select 
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#FFD000] font-bold uppercase tracking-widest"
            >
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">DESCRIPTION</label>
            <textarea 
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#FFD000] font-bold resize-none"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">URL DE L'IMAGE</label>
            <input 
              required
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-[#FFD000] font-bold"
            />
          </div>
          
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">TAILLES & PRIX</label>
            {formData.sizes.map((size, idx) => (
              <div key={idx} className="flex gap-4">
                <input 
                  placeholder="Taille"
                  value={size.size_name}
                  onChange={(e) => {
                    const newSizes = [...formData.sizes];
                    newSizes[idx].size_name = e.target.value;
                    setFormData({ ...formData, sizes: newSizes });
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FFD000] font-bold text-sm"
                />
                <input 
                  type="number"
                  placeholder="Prix"
                  value={size.price}
                  onChange={(e) => {
                    const newSizes = [...formData.sizes];
                    newSizes[idx].price = parseFloat(e.target.value);
                    setFormData({ ...formData, sizes: newSizes });
                  }}
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#FFD000] font-bold text-sm"
                />
                {formData.sizes.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, sizes: formData.sizes.filter((_, i) => i !== idx) })}
                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, sizes: [...formData.sizes, { size_name: "", price: 0, is_default: false }] })}
              className="w-full py-3 border border-dashed border-white/10 rounded-xl text-gray-500 font-black text-[10px] uppercase tracking-widest hover:border-[#FFD000] hover:text-[#FFD000] transition-all"
            >
              + AJOUTER UNE TAILLE
            </button>
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 flex gap-4">
        <button 
          type="button" 
          onClick={onClose}
          className="flex-1 py-5 rounded-2xl font-black text-sm uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all"
        >
          ANNULER
        </button>
        <button 
          type="submit"
          disabled={loading}
          className="flex-[2] bg-[#FFD000] text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-transform shadow-xl shadow-[#FFD000]/20 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "ENREGISTRER PRODUIT"}
        </button>
      </div>
    </form>
  );
}

function OrderDetails({ order, onClose }: any) {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchItems() {
      const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
      if (data) setItems(data);
      setLoading(false);
    }
    fetchItems();
  }, [order.id]);

  return (
    <div className="p-12 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tighter uppercase italic">DÉTAILS COMMANDE</h2>
          <p className="text-[#FFD000] font-black text-xs tracking-widest uppercase">{order.tracking_code}</p>
        </div>
        <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors">
          <XCircle size={24} className="text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-8">
          <section>
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">CLIENT</h4>
            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FFD000]/10 rounded-xl flex items-center justify-center text-[#FFD000]">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-black text-sm uppercase italic">{order.customer_name}</p>
                  <p className="text-gray-500 font-bold text-xs">{order.customer_phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-[#FFD000]/10 rounded-xl flex items-center justify-center text-[#FFD000]">
                  <MapPin size={18} />
                </div>
                <a 
                  href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white font-bold text-xs hover:text-[#FFD000] transition-colors flex items-center gap-1"
                >
                  Voir sur Maps <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </section>

          <section>
            <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">LIVREUR</h4>
            <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
              {order.livreurs ? (
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500">
                    <Truck size={18} />
                  </div>
                  <div>
                    <p className="font-black text-sm uppercase italic">{order.livreurs.full_name}</p>
                    <p className="text-gray-500 font-bold text-xs">Assigné</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 font-bold text-xs italic text-center py-2">Aucun livreur assigné</p>
              )}
            </div>
          </section>
        </div>

        <section>
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">ARTICLES</h4>
          <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
            {loading ? (
              <Loader2 className="animate-spin mx-auto text-[#FFD000]" size={24} />
            ) : (
              <>
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-black text-sm uppercase italic">{item.product_name}</p>
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">x{item.quantity}</p>
                    </div>
                    <p className="font-black text-[#FFD000]">{item.subtotal} MAD</p>
                  </div>
                ))}
                <div className="pt-4 flex justify-between items-center">
                  <span className="font-black uppercase italic">Total</span>
                  <span className="text-2xl font-black text-[#FFD000] tracking-tighter">{order.total} MAD</span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ExternalLink({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
