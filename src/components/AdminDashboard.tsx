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
  User
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Order, Analytics } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [notifications, setNotifications] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const newOrder = payload.new as Order;
        setOrders(prev => [newOrder, ...prev]);
        setNotifications(prev => [newOrder, ...prev]);
        
        // Update analytics
        setOrders(prevOrders => {
          const updatedOrders = [newOrder, ...prevOrders];
          setAnalytics(calculateAnalytics(updatedOrders));
          return updatedOrders;
        });

        // Play notification sound
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audio.play().catch(() => {});
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const calculateAnalytics = (orders: Order[]) => {
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;

    // Top Products
    const productMap: Record<string, number> = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        productMap[i.name] = (productMap[i.name] || 0) + i.quantity;
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
      if (o.livreur_name) {
        livreurMap[o.livreur_name] = (livreurMap[o.livreur_name] || 0) + 1;
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
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      setAnalytics(calculateAnalytics(data || []));
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
    doc.setTextColor(255, 208, 0); // #FFD000
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
      o.items.map(i => `${i.name} x${i.quantity}`).join(", "),
      `${o.total} MAD`
    ]);

    autoTable(doc, {
      startY: 70,
      head: [["Date", "Client", "Articles", "Total"]],
      body: tableData,
      headStyles: { fillColor: [255, 208, 0], textColor: [0, 0, 0] },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 70 },
    });

    doc.save(`fquick_orders_${format(new Date(), "yyyy-MM-dd")}.pdf`);
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

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-black border-r border-white/10 hidden lg:flex flex-col p-6">
        <div className="text-2xl font-black text-[#FFD000] mb-12 tracking-tighter">F-QUICK ADMIN</div>
        
        <nav className="flex-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-[#FFD000] text-black rounded-xl font-bold">
            <LayoutDashboard size={20} /> Dashboard
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white transition-colors font-bold"
        >
          <LogOut size={20} /> Déconnexion
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter">TABLEAU DE BORD</h1>
            <p className="text-gray-500 font-medium">Bienvenue, voici l'état de votre restaurant aujourd'hui.</p>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-[#FFD000] text-black hover:opacity-90 px-6 py-3 rounded-xl font-bold transition-all"
            >
              <FileText size={18} /> Exporter PDF
            </button>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="REVENU TOTAL" 
            value={`${analytics?.totalRevenue || 0} MAD`} 
            icon={<TrendingUp className="text-green-500" />} 
          />
          <StatCard 
            title="COMMANDES" 
            value={analytics?.orderCount || 0} 
            icon={<ShoppingBag className="text-blue-500" />} 
          />
          <StatCard 
            title="CLIENTS" 
            value={new Set(orders.map(o => o.customer_phone)).size} 
            icon={<Users className="text-purple-500" />} 
          />
          <StatCard 
            title="TOP PRODUIT" 
            value={analytics?.bestSellers[0]?.name || "-"} 
            icon={<CheckCircle2 className="text-[#FFD000]" />} 
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Recent Orders Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black tracking-tighter">COMMANDES RÉCENTES</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:border-[#FFD000] transition-all"
                />
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">CLIENT</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">ARTICLES</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">TOTAL</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">DATE</th>
                    <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.map(order => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-black text-[#FFD000]">{order.customer_name}</div>
                        <div className="font-bold text-xs">{order.customer_phone}</div>
                        <div className="text-[10px] text-gray-500 truncate max-w-[200px]">Localisation GPS</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">
                          {order.items.map(i => `${i.name} x${i.quantity}`).join(", ")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-[#FFD000]">{order.total} MAD</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                          <Clock size={12} />
                          {format(new Date(order.created_at), "HH:mm", { locale: fr })}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/tracking/${order.id}`}
                            className="p-2 bg-white/5 hover:bg-[#FFD000] hover:text-black rounded-lg transition-all"
                            title="Suivre la commande"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Best Sellers & Notifications */}
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

            <section>
              <h2 className="text-2xl font-black tracking-tighter mb-6">TOP LIVREURS</h2>
              <div className="space-y-4">
                {analytics?.topLivreurs.map((livreur, i) => (
                  <div key={livreur.name} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm",
                        i === 0 ? "bg-[#FFD000] text-black" : "bg-white/10 text-white"
                      )}>
                        {i + 1}
                      </div>
                      <span className="font-bold">{livreur.name}</span>
                    </div>
                    <span className="text-sm font-black text-gray-500">{livreur.count} livraisons</span>
                  </div>
                ))}
                {analytics?.topLivreurs.length === 0 && (
                  <p className="text-center text-gray-500 font-medium py-4 border-2 border-dashed border-white/5 rounded-2xl">
                    Aucun livreur actif
                  </p>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tighter">NOTIFICATIONS</h2>
                <button 
                  onClick={() => setNotifications([])}
                  className="text-xs font-bold text-[#FFD000] hover:underline"
                >
                  Effacer tout
                </button>
              </div>
              <div className="space-y-4">
                <AnimatePresence>
                  {notifications.map(notif => (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-[#FFD000] text-black rounded-2xl p-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-black text-sm flex items-center gap-2">
                          <Bell size={14} /> NOUVELLE COMMANDE
                        </div>
                        <span className="text-[10px] font-black opacity-50">MAINTENANT</span>
                      </div>
                      <p className="text-xs font-black mb-1">{notif.customer_name}</p>
                      <p className="text-[10px] font-bold opacity-80">{notif.customer_phone}</p>
                      <p className="text-[10px] font-medium opacity-70 truncate">Localisation GPS</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {notifications.length === 0 && (
                  <p className="text-center text-gray-500 font-medium py-8 border-2 border-dashed border-white/5 rounded-2xl">
                    Aucune nouvelle notification
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{title}</span>
        <div className="p-2 bg-white/5 rounded-xl">
          {icon}
        </div>
      </div>
      <div className="text-3xl font-black tracking-tighter">{value}</div>
    </div>
  );
}
