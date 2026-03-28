import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bike, MapPin, Phone, Package, LogOut, CheckCircle2, Clock, ExternalLink, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Order, OrderItem } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

export default function LivreurPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [livreurName, setLivreurName] = useState("");
  const [livreurId, setLivreurId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("livreur_authenticated");
    if (!isAuthenticated) {
      navigate("/livreur/login");
      return;
    }
    setLivreurName(localStorage.getItem("livreur_name") || "Livreur");
    setLivreurId(localStorage.getItem("livreur_id") || "");
    fetchOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('livreur_orders')
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
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("livreur_authenticated");
    localStorage.removeItem("livreur_name");
    localStorage.removeItem("livreur_phone");
    localStorage.removeItem("livreur_id");
    navigate("/livreur/login");
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      const now = new Date().toISOString();
      
      // If accepting, assign the livreur and set accepted_at
      if (newStatus === 'accepted') {
        // Exclusivity check: ensure no one else accepted it
        const { data: currentOrder } = await supabase
          .from('orders')
          .select('livreur_id')
          .eq('id', orderId)
          .single();
        
        if (currentOrder?.livreur_id) {
          alert("Cette commande a déjà été acceptée par un autre livreur.");
          fetchOrders();
          return;
        }

        updateData.livreur_id = livreurId;
        updateData.accepted_at = now;
      } else if (newStatus === 'en_livraison') {
        updateData.picked_up_at = now;
      } else if (newStatus === 'delivered') {
        updateData.delivered_at = now;
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      // If accepted, open Google Maps
      if (newStatus === 'accepted') {
        const order = orders.find(o => o.id === orderId);
        if (order?.latitude && order?.longitude) {
          window.open(`https://www.google.com/maps?q=${order.latitude},${order.longitude}`, '_blank');
        }
      }
      
      fetchOrders();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Une erreur est survenue.");
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const myOrders = orders.filter(o => o.livreur_id === livreurId && o.status !== 'delivered');

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#FFD000] rounded-2xl flex items-center justify-center rotate-3">
            <Bike className="text-black" size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic">F-QUICK DELIVERY</h1>
            <p className="text-gray-500 text-xs font-black tracking-widest uppercase">Bonjour, {livreurName}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all group"
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      </header>

      <main className="max-w-4xl mx-auto space-y-12">
        {/* Mes Livraisons en cours */}
        {myOrders.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-8 bg-[#FFD000] rounded-full" />
              <h2 className="text-xl font-black tracking-tight uppercase italic">MES LIVRAISONS EN COURS</h2>
              <span className="bg-[#FFD000] text-black px-2 py-0.5 rounded text-[10px] font-black">{myOrders.length}</span>
            </div>
            <div className="grid gap-4">
              {myOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isMyOrder={true}
                  onUpdateStatus={updateOrderStatus}
                />
              ))}
            </div>
          </section>
        )}

        {/* Commandes Disponibles */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-white/20 rounded-full" />
            <h2 className="text-xl font-black tracking-tight uppercase italic">COMMANDES DISPONIBLES</h2>
            <span className="bg-white/10 text-white px-2 py-0.5 rounded text-[10px] font-black">{pendingOrders.length}</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#FFD000] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="bg-[#111] border border-dashed border-white/10 rounded-[40px] p-12 text-center">
              <Package size={48} className="text-gray-800 mx-auto mb-4" />
              <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Aucune commande disponible</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingOrders.map(order => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  isMyOrder={false}
                  onUpdateStatus={updateOrderStatus}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

const OrderCard: React.FC<{ 
  order: OrderWithItems, 
  isMyOrder: boolean,
  onUpdateStatus: (id: string, status: string) => void | Promise<void>
}> = ({ order, isMyOrder, onUpdateStatus }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-[#111] border ${isMyOrder ? 'border-[#FFD000]/30' : 'border-white/10'} rounded-[32px] overflow-hidden shadow-xl`}
    >
      <div className="p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-xl">
                <Clock size={16} className="text-[#FFD000]" />
              </div>
              <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                {format(new Date(order.created_at), "HH:mm", { locale: fr })}
              </span>
            </div>
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              order.status === 'pending' ? 'bg-blue-500/10 text-blue-500' :
              order.status === 'accepted' ? 'bg-[#FFD000]/10 text-[#FFD000]' :
              'bg-orange-500/10 text-orange-500'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <h3 className="text-xl font-black mb-1">{order.customer_name}</h3>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin size={14} />
              <span className="text-xs font-bold">Localisation GPS partagée</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {order.order_items.map((item, i) => (
              <span key={i} className="bg-white/5 px-3 py-1 rounded-lg text-[10px] font-bold">
                {item.quantity}x {item.product_name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 md:w-48">
          <div className="text-right">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
            <p className="text-2xl font-black text-[#FFD000]">{order.total.toFixed(2)} MAD</p>
          </div>

          <div className="space-y-2">
            {!isMyOrder ? (
              <button 
                onClick={() => onUpdateStatus(order.id, 'accepted')}
                className="w-full bg-[#FFD000] text-black py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                ACCEPTER <ArrowRight size={16} />
              </button>
            ) : (
              <>
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'en_livraison')}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    EN LIVRAISON <Bike size={16} />
                  </button>
                )}
                {order.status === 'en_livraison' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'delivered')}
                    className="w-full bg-green-500 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    LIVRÉ <CheckCircle2 size={16} />
                  </button>
                )}
                <div className="flex gap-2">
                  <a 
                    href={`tel:${order.customer_phone}`}
                    className="flex-1 bg-white/5 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <Phone size={16} />
                  </a>
                  <a 
                    href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white/5 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
