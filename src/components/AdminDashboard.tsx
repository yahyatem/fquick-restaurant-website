import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingBag, 
  TrendingUp, 
  Users, 
  Download, 
  Bell, 
  LogOut,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  User,
  Truck,
  UserCheck,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronRight,
  Menu as MenuIcon,
  X,
  Package,
  Layers,
  Settings,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Order, Analytics, OrderItem, Livreur, Client } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

type AdminTab = 'dashboard' | 'orders' | 'livreurs' | 'clients' | 'products' | 'categories' | 'settings' | 'analytics';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [livreurs, setLivreurs] = useState<Livreur[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notifications, setNotifications] = useState<OrderWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLivreurModalOpen, setIsLivreurModalOpen] = useState(false);
  const [editingLivreur, setEditingLivreur] = useState<Livreur | null>(null);
  const [livreurForm, setLivreurForm] = useState({
    full_name: "",
    phone: "",
    password: "",
    status: "available" as const
  });
  const [orderFilter, setOrderFilter] = useState<Order['status'] | 'all'>('all');
  const [livreurFilter, setLivreurFilter] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
      return;
    }

    fetchData();

    // Supabase real-time subscription
    const subscription = supabase
      .channel('admin_orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const newOrder = payload.new as Order;
        
        // Fetch items for the new order
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', newOrder.id);
        
        const orderWithItems = { ...newOrder, order_items: items || [] } as OrderWithItems;
        
        setOrders(prev => {
          const updatedOrders = [orderWithItems, ...prev];
          setAnalytics(calculateAnalytics(updatedOrders));
          return updatedOrders;
        });
        setNotifications(prev => [orderWithItems, ...prev]);
        
        // Play notification sound
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(() => {});
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const calculateAnalytics = (orders: OrderWithItems[]) => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;

    // Top Products
    const productMap: Record<string, number> = {};
    orders.forEach(o => {
      o.order_items?.forEach(i => {
        productMap[i.product_name] = (productMap[i.product_name] || 0) + i.quantity;
      });
    });
    const bestSellers = Object.entries(productMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Top Clients
    const clientMap: Record<string, { name: string, total: number }> = {};
    orders.forEach(o => {
      if (!clientMap[o.customer_phone]) {
        clientMap[o.customer_phone] = { name: o.customer_name, total: 0 };
      }
      clientMap[o.customer_phone].total += o.total;
    });
    const topClients = Object.entries(clientMap)
      .map(([phone, data]) => ({ phone, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // Top Delivery Person
    const livreurMap: Record<string, number> = {};
    orders.forEach(o => {
      if (o.livreur_id) {
        livreurMap[o.livreur_id] = (livreurMap[o.livreur_id] || 0) + 1;
      }
    });
    const topLivreurs = Object.entries(livreurMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { totalRevenue, orderCount, bestSellers, topClients, topLivreurs };
  };

  const fetchData = async () => {
    try {
      const [ordersRes, livreursRes, clientsRes] = await Promise.all([
        supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }),
        supabase.from('livreurs').select('*').order('created_at', { ascending: false }),
        supabase.from('clients').select('*').order('created_at', { ascending: false })
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (livreursRes.error) throw livreursRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setOrders((ordersRes.data as OrderWithItems[]) || []);
      setLivreurs((livreursRes.data as Livreur[]) || []);
      setClients((clientsRes.data as Client[]) || []);
      setAnalytics(calculateAnalytics((ordersRes.data as OrderWithItems[]) || []));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), "dd/MM/yyyy HH:mm");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(34, 197, 94); // #22c55e (Green-500)
    doc.text("F-QUICK", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100);
    doc.text("Rapport des Commandes", 14, 30);
    doc.text(`Généré le: ${dateStr}`, 14, 38);

    // Summary Stats
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Commandes: ${analytics?.orderCount || 0}`, 14, 50);
    doc.text(`Revenu Total: ${analytics?.totalRevenue || 0} MAD`, 14, 58);

    // Table
    const tableData = orders.map(o => [
      format(new Date(o.created_at), "dd/MM HH:mm"),
      o.customer_name || o.customer_phone,
      o.order_items.map(i => `${i.product_name} x${i.quantity}`).join(", "),
      `${o.total} MAD`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [["Date", "Client", "Articles", "Total"]],
      body: tableData,
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 70 },
    });

    doc.save(`fquick_orders_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const handleSaveLivreur = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLivreur) {
        const { error } = await supabase
          .from('livreurs')
          .update(livreurForm)
          .eq('id', editingLivreur.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('livreurs')
          .insert([livreurForm]);
        if (error) throw error;
      }
      setIsLivreurModalOpen(false);
      setEditingLivreur(null);
      setLivreurForm({ full_name: "", phone: "", password: "", status: "available" });
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement du livreur");
    }
  };

  const handleDeleteLivreur = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce livreur ?")) return;
    try {
      const { error } = await supabase
        .from('livreurs')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/admin/login");
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#FFD000] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const navLinks: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'orders', label: 'Commandes', icon: <ShoppingBag size={20} /> },
    { id: 'livreurs', label: 'Livreurs', icon: <Truck size={20} /> },
    { id: 'clients', label: 'Clients', icon: <Users size={20} /> },
    { id: 'products', label: 'Produits', icon: <Package size={20} /> },
    { id: 'categories', label: 'Catégories', icon: <Layers size={20} /> },
    { id: 'analytics', label: 'Analyses', icon: <BarChart3 size={20} /> },
    { id: 'settings', label: 'Paramètres', icon: <Settings size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-black border-r border-white/10 hidden lg:flex flex-col p-6 sticky top-0 h-screen">
        <div className="text-2xl font-black text-[#FFD000] mb-12 tracking-tighter">F-QUICK ADMIN</div>
        
        <nav className="flex-1 space-y-2">
          {navLinks.map(link => (
            <SidebarLink 
              key={link.id}
              active={activeTab === link.id} 
              onClick={() => setActiveTab(link.id as AdminTab)} 
              icon={link.icon} 
              label={link.label} 
            />
          ))}
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white transition-colors font-bold"
        >
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      {/* Mobile Topbar */}
      <header className="lg:hidden bg-black border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <MenuIcon size={24} />
          </button>
          <div className="text-xl font-black text-[#FFD000] tracking-tighter">F-QUICK</div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <button className="p-2 bg-white/5 border border-white/10 rounded-lg text-white relative">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black" />
              )}
            </button>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-white transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] lg:hidden"
            />
            <motion.div 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-80 bg-black z-[70] lg:hidden flex flex-col p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="text-2xl font-black text-[#FFD000] tracking-tighter">F-QUICK ADMIN</div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-hide">
                {navLinks.map(link => (
                  <SidebarLink 
                    key={link.id}
                    active={activeTab === link.id} 
                    onClick={() => {
                      setActiveTab(link.id as AdminTab);
                      setIsMobileMenuOpen(false);
                    }} 
                    icon={link.icon} 
                    label={link.label} 
                  />
                ))}
              </nav>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-4 mt-6 text-gray-500 hover:text-white transition-colors font-bold border-t border-white/10"
              >
                <LogOut size={20} /> Déconnexion
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto pb-24 lg:pb-12">
        <header className="hidden lg:flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase">
              {activeTab === 'dashboard' && "TABLEAU DE BORD"}
              {activeTab === 'orders' && "GESTION COMMANDES"}
              {activeTab === 'livreurs' && "GESTION LIVREURS"}
              {activeTab === 'clients' && "GESTION CLIENTS"}
              {activeTab === 'products' && "GESTION PRODUITS"}
              {activeTab === 'categories' && "GESTION CATÉGORIES"}
              {activeTab === 'analytics' && "ANALYSES & RAPPORTS"}
              {activeTab === 'settings' && "PARAMÈTRES"}
            </h1>
            <p className="text-gray-500 font-medium">
              {activeTab === 'dashboard' && "Bienvenue, voici l'état de votre restaurant aujourd'hui."}
              {activeTab === 'orders' && "Gérez et suivez toutes les commandes clients."}
              {activeTab === 'livreurs' && "Suivez les performances de vos livreurs."}
              {activeTab === 'clients' && "Consultez votre base de données clients."}
              {activeTab === 'products' && "Gérez votre catalogue de produits."}
              {activeTab === 'categories' && "Organisez vos produits par catégories."}
              {activeTab === 'analytics' && "Visualisez vos performances commerciales."}
              {activeTab === 'settings' && "Configurez les paramètres de votre application."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {activeTab === 'dashboard' && (
              <button 
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-[#FFD000] text-black hover:opacity-90 px-6 py-3 rounded-xl font-bold transition-all"
              >
                <FileText size={18} /> Exporter PDF
              </button>
            )}
            <div className="relative">
              <button className="p-3 bg-white/5 border border-white/10 rounded-xl text-white relative">
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Page Title */}
        <div className="lg:hidden mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase">
            {activeTab === 'dashboard' && "TABLEAU DE BORD"}
            {activeTab === 'orders' && "COMMANDES"}
            {activeTab === 'livreurs' && "LIVREURS"}
            {activeTab === 'clients' && "CLIENTS"}
            {activeTab === 'products' && "PRODUITS"}
            {activeTab === 'categories' && "CATÉGORIES"}
            {activeTab === 'analytics' && "ANALYSES"}
            {activeTab === 'settings' && "PARAMÈTRES"}
          </h1>
          {activeTab === 'dashboard' && (
            <button 
              onClick={exportToPDF}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-[#FFD000] text-black py-4 rounded-2xl font-black text-sm transition-all"
            >
              <FileText size={18} /> EXPORTER RAPPORT PDF
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                  <StatCard 
                    title="REVENU TOTAL" 
                    value={`${analytics?.totalRevenue || 0} MAD`} 
                    icon={<TrendingUp className="text-[#FFD000]" />} 
                  />
                  <StatCard 
                    title="COMMANDES" 
                    value={analytics?.orderCount || 0} 
                    icon={<ShoppingBag className="text-blue-500" />} 
                  />
                  <StatCard 
                    title="CLIENTS" 
                    value={clients.length} 
                    icon={<Users className="text-purple-500" />} 
                  />
                  <StatCard 
                    title="TOP PRODUIT" 
                    value={analytics?.bestSellers[0]?.name || "-"} 
                    icon={<CheckCircle2 className="text-[#FFD000]" />} 
                  />
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 lg:gap-12">
                  <div className="xl:col-span-2">
                    <section>
                      <h2 className="text-2xl font-black tracking-tighter mb-6">NOTIFICATIONS RÉCENTES</h2>
                      <div className="space-y-4">
                        {notifications.map(notif => (
                          <div key={notif.id} className="bg-[#FFD000] text-black rounded-[32px] p-6 lg:p-8 shadow-lg shadow-[#FFD000]/10">
                            <div className="flex items-start justify-between mb-4">
                              <div className="font-black text-[10px] flex items-center gap-2 tracking-widest uppercase opacity-80">
                                <Bell size={14} /> NOUVELLE COMMANDE
                              </div>
                              <span className="text-[10px] font-black opacity-50">MAINTENANT</span>
                            </div>
                            <p className="text-2xl font-black tracking-tighter mb-1">{notif.customer_name}</p>
                            <p className="text-sm font-bold opacity-80 mb-4">{notif.customer_phone}</p>
                            <div className="flex items-center justify-between pt-4 border-t border-white/20">
                              <span className="text-xl font-black">{notif.total} MAD</span>
                              <button 
                                onClick={() => setActiveTab('orders')}
                                className="bg-white text-[#FFD000] px-4 py-2 rounded-xl text-xs font-black hover:scale-105 transition-transform"
                              >
                                VOIR DÉTAILS
                              </button>
                            </div>
                          </div>
                        ))}
                        {notifications.length === 0 && (
                          <p className="text-center text-gray-500 font-medium py-12 border-2 border-dashed border-white/5 rounded-[32px]">
                            Aucune nouvelle notification
                          </p>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-12">
                    <section>
                      <h2 className="text-2xl font-black tracking-tighter mb-6">TOP 3 PRODUITS</h2>
                      <div className="space-y-4">
                        {analytics?.bestSellers.map((item, i) => (
                          <div key={item.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                                i === 0 ? "bg-[#FFD000] text-black" : "bg-white/10 text-white"
                              )}>
                                {i + 1}
                              </div>
                              <span className="font-bold">{item.name}</span>
                            </div>
                            <span className="text-sm font-black text-gray-500">{item.count} ventes</span>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section>
                      <h2 className="text-2xl font-black tracking-tighter mb-6">TOP 3 CLIENTS</h2>
                      <div className="space-y-4">
                        {analytics?.topClients.map((client, i) => (
                          <div key={client.phone} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                                i === 0 ? "bg-[#FFD000] text-black" : "bg-white/10 text-white"
                              )}>
                                {i + 1}
                              </div>
                              <div>
                                <p className="font-bold">{client.name}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{client.phone}</p>
                              </div>
                            </div>
                            <span className="text-sm font-black text-[#FFD000]">{client.total.toFixed(2)} MAD</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-2xl font-black tracking-tighter">LISTE DES COMMANDES</h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <select 
                        value={orderFilter}
                        onChange={(e) => setOrderFilter(e.target.value as any)}
                        className="w-full md:w-auto bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[#FFD000] transition-all appearance-none font-bold"
                      >
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="accepted">Acceptée</option>
                        <option value="en_livraison">En livraison</option>
                        <option value="delivered">Livrée</option>
                        <option value="cancelled">Annulée</option>
                      </select>
                    </div>
                    <div className="relative flex-1 md:flex-none">
                      <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <select 
                        value={livreurFilter}
                        onChange={(e) => setLivreurFilter(e.target.value)}
                        className="w-full md:w-auto bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm outline-none focus:border-[#FFD000] transition-all appearance-none font-bold"
                      >
                        <option value="all">Tous les livreurs</option>
                        {livreurs.map(l => (
                          <option key={l.id} value={l.id}>{l.full_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLIENT</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">ARTICLES</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">TOTAL</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">LIVREUR</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">STATUT</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {orders
                        .filter(o => orderFilter === 'all' || o.status === orderFilter)
                        .filter(o => livreurFilter === 'all' || o.livreur_id === livreurFilter)
                        .map(order => (
                        <tr key={order.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-black text-[#FFD000]">{order.customer_name}</div>
                            <div className="font-bold text-xs">{order.customer_phone}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium">
                              {order.order_items.map(i => `${i.product_name} x${i.quantity}`).join(", ")}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black text-[#FFD000]">{order.total} MAD</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-bold text-gray-400">
                              {livreurs.find(l => l.id === order.livreur_id)?.full_name || "Non assigné"}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                              order.status === 'delivered' ? "bg-[#FFD000]/20 text-[#FFD000]" :
                              order.status === 'cancelled' ? "bg-red-500/20 text-red-500" :
                              "bg-[#FFD000]/20 text-[#FFD000]"
                            )}>
                              {order.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link 
                              to={`/tracking/${order.id}`}
                              className="inline-flex p-2 bg-white/5 hover:bg-[#FFD000] hover:text-black rounded-lg transition-all"
                            >
                              <ExternalLink size={14} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Stacked Cards for Orders (Optional, but Table is scrollable now) */}
              </div>
            )}

            {activeTab === 'livreurs' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <h2 className="text-2xl font-black tracking-tighter">LISTE DES LIVREURS</h2>
                  <button 
                    onClick={() => {
                      setEditingLivreur(null);
                      setLivreurForm({ full_name: "", phone: "", password: "", status: "available" });
                      setIsLivreurModalOpen(true);
                    }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#FFD000] text-black px-6 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform shadow-lg shadow-[#FFD000]/20"
                  >
                    <Plus size={18} /> AJOUTER UN LIVREUR
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {livreurs.map(livreur => {
                    const livreurOrders = orders.filter(o => o.livreur_id === livreur.id);
                    return (
                      <div key={livreur.id} className="bg-white/5 border border-white/10 rounded-[40px] p-8 group relative">
                        <div className="absolute top-8 right-8 flex gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingLivreur(livreur);
                              setLivreurForm({ 
                                full_name: livreur.full_name, 
                                phone: livreur.phone, 
                                password: livreur.password || "", 
                                status: livreur.status 
                              });
                              setIsLivreurModalOpen(true);
                            }}
                            className="p-3 bg-white/5 hover:bg-blue-500/20 hover:text-blue-500 rounded-xl transition-all"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteLivreur(livreur.id)}
                            className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex items-center gap-5 mb-8">
                          <div className="w-16 h-16 bg-[#FFD000] rounded-[24px] flex items-center justify-center text-black rotate-3 shadow-lg shadow-[#FFD000]/20">
                            <Truck size={32} />
                          </div>
                          <div>
                            <h3 className="font-black text-2xl tracking-tighter">{livreur.full_name}</h3>
                            <p className="text-gray-500 font-bold text-sm tracking-widest">{livreur.phone}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-black/40 rounded-3xl p-5 border border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Commandes</p>
                            <p className="text-2xl font-black text-[#FFD000]">{livreurOrders.length}</p>
                          </div>
                          <div className="bg-black/40 rounded-3xl p-5 border border-white/5">
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Statut</p>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              livreur.status === 'available' ? "text-[#FFD000]" : "text-red-500"
                            )}>
                              {livreur.status === 'available' ? "Disponible" : "Occupé"}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-2 tracking-widest uppercase">
                          <Calendar size={12} />
                          Inscrit le {format(new Date(livreur.created_at), "dd/MM/yyyy")}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tighter">BASE DE DONNÉES CLIENTS</h2>
                <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left min-w-[800px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLIENT</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">TÉLÉPHONE</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">TOTAL COMMANDES</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">DERNIÈRE COMMANDE</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">DÉPENSE TOTALE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clients.map(client => {
                        const clientOrders = orders.filter(o => o.customer_phone === client.phone);
                        const lastOrder = clientOrders[0];
                        const totalSpent = clientOrders.reduce((sum, o) => sum + o.total, 0);
                        
                        return (
                          <tr key={client.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-black text-white">{client.full_name}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-[#FFD000]">{client.phone}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-black">{clientOrders.length}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-xs text-gray-500 font-bold">
                                {lastOrder ? format(new Date(lastOrder.created_at), "dd MMM yyyy", { locale: fr }) : "-"}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="font-black text-[#FFD000]">{totalSpent.toFixed(2)} MAD</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Placeholder sections for new tabs */}
            {(activeTab === 'products' || activeTab === 'categories' || activeTab === 'settings' || activeTab === 'analytics') && (
              <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-500">
                  {activeTab === 'products' && <Package size={40} />}
                  {activeTab === 'categories' && <Layers size={40} />}
                  {activeTab === 'settings' && <Settings size={40} />}
                  {activeTab === 'analytics' && <BarChart3 size={40} />}
                </div>
                <h3 className="text-2xl font-black tracking-tighter mb-2 uppercase italic">Section en développement</h3>
                <p className="text-gray-500 font-bold max-w-sm mx-auto">
                  Cette section est en cours de déploiement. Revenez bientôt pour gérer vos {activeTab === 'products' ? 'produits' : activeTab === 'categories' ? 'catégories' : activeTab === 'settings' ? 'paramètres' : 'analyses'}.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Livreur Modal */}
        <AnimatePresence>
          {isLivreurModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLivreurModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[40px] p-8 shadow-2xl"
              >
                <h2 className="text-3xl font-black tracking-tighter mb-8 uppercase">
                  {editingLivreur ? "MODIFIER LIVREUR" : "NOUVEAU LIVREUR"}
                </h2>
                
                <form onSubmit={handleSaveLivreur} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">NOM COMPLET</label>
                      <input 
                        required
                        type="text" 
                        value={livreurForm.full_name}
                        onChange={e => setLivreurForm({...livreurForm, full_name: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                        placeholder="Ex: Ahmed Benani"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">TÉLÉPHONE / LOGIN</label>
                      <input 
                        required
                        type="tel" 
                        value={livreurForm.phone}
                        onChange={e => setLivreurForm({...livreurForm, phone: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                        placeholder="06..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">MOT DE PASSE</label>
                      <input 
                        required
                        type="text" 
                        value={livreurForm.password}
                        onChange={e => setLivreurForm({...livreurForm, password: e.target.value})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">STATUT INITIAL</label>
                      <select 
                        value={livreurForm.status}
                        onChange={e => setLivreurForm({...livreurForm, status: e.target.value as any})}
                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:border-[#FFD000] outline-none transition-all font-bold appearance-none"
                      >
                        <option value="available">Disponible</option>
                        <option value="busy">Occupé</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsLivreurModalOpen(false)}
                      className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/10 transition-colors"
                    >
                      ANNULER
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-[#FFD000] text-black py-4 rounded-2xl font-black text-sm hover:scale-[1.02] transition-transform shadow-lg shadow-[#FFD000]/20"
                    >
                      ENREGISTRER
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/10 px-6 py-4 flex items-center justify-between z-50 backdrop-blur-lg bg-black/80">
        <BottomNavLink 
          active={activeTab === 'dashboard'} 
          onClick={() => setActiveTab('dashboard')} 
          icon={<LayoutDashboard size={20} />} 
          label="Dash" 
        />
        <BottomNavLink 
          active={activeTab === 'orders'} 
          onClick={() => setActiveTab('orders')} 
          icon={<ShoppingBag size={20} />} 
          label="Orders" 
        />
        <BottomNavLink 
          active={activeTab === 'livreurs'} 
          onClick={() => setActiveTab('livreurs')} 
          icon={<Truck size={20} />} 
          label="Livreurs" 
        />
        <BottomNavLink 
          active={activeTab === 'clients'} 
          onClick={() => setActiveTab('clients')} 
          icon={<Users size={20} />} 
          label="Clients" 
        />
      </nav>
    </div>
  );
}

const SidebarLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-4 rounded-2xl font-black text-sm transition-all",
        active ? "bg-[#FFD000] text-black shadow-lg shadow-[#FFD000]/20" : "text-gray-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon} {label}
    </button>
  );
};

const BottomNavLink: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all",
        active ? "text-[#FFD000]" : "text-gray-500"
      )}
    >
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
};

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 hover:border-white/20 transition-all group">
      <div className="flex items-center justify-between mb-6">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</span>
        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tracking-tighter">{value}</div>
    </div>
  );
};
