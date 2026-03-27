import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bike, MapPin, Phone, CheckCircle, Clock, ExternalLink, LogOut, Navigation } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../lib/supabase";
import { Order } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function LivreurPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("livreur_authenticated");
    if (!isAuthenticated) {
      navigate("/livreur/login");
      return;
    }

    fetchOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'pending')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      const { error } = await supabase
        .from('orders')
        .update({ status, livreurName: 'Livreur F-Quick' }) // Hardcoded for demo
        .eq('id', orderId);

      if (error) throw error;
      
      if (status === 'accepted' && order?.latitude && order?.longitude) {
        window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank');
      }
      
      fetchOrders();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("livreur_authenticated");
    navigate("/livreur/login");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
      case 'accepted': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'delivered': return 'bg-green-500/20 text-green-500 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  const getGoogleMapsLink = (order: Order) => {
    if (order.latitude && order.longitude) {
      return `https://www.google.com/maps?q=${order.latitude},${order.longitude}`;
    }
    return `https://www.google.com/maps/search/${encodeURIComponent(order.name)}`;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD000] rounded-xl flex items-center justify-center rotate-3">
            <Bike className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">LIVREUR F-QUICK</h1>
            <p className="text-gray-400 text-sm font-bold">Commandes en cours</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors"
        >
          <LogOut size={20} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-[#FFD000] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 font-bold">Chargement des commandes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 bg-[#111] border border-white/10 rounded-3xl">
            <Bike className="mx-auto text-gray-600 mb-4" size={48} />
            <p className="text-gray-400 font-bold">Aucune commande pour le moment</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111] border border-white/10 rounded-3xl p-6 shadow-xl"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-black text-gray-500 uppercase tracking-widest">#{order.id.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${getStatusColor(order.status)}`}>
                        {order.status === 'pending' ? 'En attente' : order.status === 'accepted' ? 'Acceptée' : 'Livrée'}
                      </span>
                    </div>
                    <h3 className="text-xl font-black">{order.name}</h3>
                    <p className="text-gray-400 font-bold flex items-center gap-2 mt-1">
                      <Phone size={14} /> {order.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#FFD000]">{order.total.toFixed(2)} MAD</p>
                    <p className="text-gray-500 text-xs font-bold flex items-center justify-end gap-1 mt-1">
                      <Clock size={12} /> {format(new Date(order.createdAt), "HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                    <MapPin className="text-[#FFD000] shrink-0 mt-1" size={18} />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-300">Localisation GPS</p>
                      <a 
                        href={getGoogleMapsLink(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-[#FFD000] text-xs font-black mt-2 hover:underline"
                      >
                        <Navigation size={12} /> VOIR SUR GOOGLE MAPS <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                    <p className="text-xs font-black text-gray-500 uppercase mb-3 tracking-widest">Articles</p>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm font-bold">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="text-gray-400">{(item.price * item.quantity).toFixed(2)} MAD</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => updateStatus(order.id, 'accepted')}
                      className="flex-1 bg-white text-black font-black py-4 rounded-2xl hover:bg-[#FFD000] transition-colors flex items-center justify-center gap-2"
                    >
                      CONFIRMER
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
