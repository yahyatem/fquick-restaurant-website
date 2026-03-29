import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Bike, MapPin, Phone, Package, LogOut, CheckCircle2, Clock, ExternalLink, ArrowRight, History, User as UserIcon, Navigation, Truck } from "lucide-react";
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
  const [livreur, setLivreur] = useState<any>(null);
  const [livreurId, setLivreurId] = useState("");
  const [activeTab, setActiveTab] = useState<'active' | 'history' | 'profile'>('active');
  const navigate = useNavigate();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("livreur_authenticated");
    if (!isAuthenticated) {
      navigate("/livreur/login");
      return;
    }
    const id = localStorage.getItem("livreur_id") || "";
    setLivreurId(id);
    fetchOrders();
    fetchLivreur(id);

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

  const fetchLivreur = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('livreurs')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setLivreur(data);
    } catch (err) {
      console.error(err);
    }
  };

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
  const myOrders = orders.filter(o => o.livreur_id === livreurId && o.status !== 'delivered' && o.status !== 'cancelled');
  const historyOrders = orders.filter(o => o.livreur_id === livreurId && (o.status === 'delivered' || o.status === 'cancelled'));

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 pb-32">
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8 sm:mb-12">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFD000] rounded-xl sm:rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#FFD000]/20">
            <Truck className="text-black" size={20} sm:size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tighter uppercase italic">F-QUICK DELIVERY</h1>
            <p className="text-gray-500 text-[8px] sm:text-[10px] font-black tracking-widest uppercase">Bonjour, {livreur?.full_name || "Livreur"}</p>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2.5 sm:p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-xl sm:rounded-2xl transition-all group"
        >
          <LogOut size={18} sm:size={20} className="group-hover:-translate-x-1 transition-transform" />
        </button>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="flex gap-2 mb-8 sm:mb-12 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabButton 
            active={activeTab === 'active'} 
            onClick={() => setActiveTab('active')} 
            icon={<Clock size={18} />} 
            label="En cours" 
            count={myOrders.length + pendingOrders.length}
          />
          <TabButton 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            icon={<History size={18} />} 
            label="Historique" 
            count={historyOrders.length}
          />
          <TabButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<UserIcon size={18} />} 
            label="Profil" 
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'active' && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {myOrders.length > 0 && (
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-[#FFD000] rounded-full" />
                    <h2 className="text-xl font-black tracking-tight uppercase italic">MES LIVRAISONS</h2>
                  </div>
                  <div className="grid gap-6">
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

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-8 bg-white/20 rounded-full" />
                  <h2 className="text-xl font-black tracking-tight uppercase italic">COMMANDES DISPONIBLES</h2>
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
                  <div className="grid gap-6">
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
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-8 bg-white/20 rounded-full" />
                <h2 className="text-xl font-black tracking-tight uppercase italic">HISTORIQUE DES LIVRAISONS</h2>
              </div>
              <div className="grid gap-4">
                {historyOrders.map(order => (
                  <div key={order.id} className="bg-[#111] border border-white/10 rounded-[32px] p-6 opacity-60 grayscale hover:grayscale-0 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-lg">{order.customer_name}</h3>
                        <p className="text-gray-500 font-bold text-xs">{format(new Date(order.created_at), "dd MMMM yyyy", { locale: fr })}</p>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                      )}>
                        {order.status === 'delivered' ? "LIVRÉE" : "ANNULÉE"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {order.order_items.map((item, i) => (
                        <span key={i} className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold">
                          {item.quantity}x {item.product_name}
                        </span>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="font-black text-[#FFD000]">{order.total.toFixed(2)} MAD</span>
                      <span className="text-[10px] font-bold text-gray-600">ID: #{order.id.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
                {historyOrders.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                    <p className="text-gray-500 font-bold">Aucun historique de livraison</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto"
            >
              <div className="bg-[#111] border border-white/10 rounded-[32px] sm:rounded-[40px] p-6 sm:p-10 text-center shadow-2xl">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[#FFD000] rounded-[28px] sm:rounded-[32px] flex items-center justify-center text-black mx-auto mb-6 sm:mb-8 rotate-6 shadow-xl shadow-[#FFD000]/20">
                  <UserIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-2 uppercase italic">{livreur?.full_name}</h2>
                <p className="text-[#FFD000] font-black tracking-widest text-xs sm:text-sm mb-8 sm:mb-10 uppercase">{livreur?.phone}</p>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
                  <div className="bg-black/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/5">
                    <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase mb-1 sm:mb-2">Total Livraisons</p>
                    <p className="text-2xl sm:text-3xl font-black text-white">{historyOrders.filter(o => o.status === 'delivered').length}</p>
                  </div>
                  <div className="bg-black/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-white/5">
                    <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase mb-1 sm:mb-2">Statut</p>
                    <p className="text-[10px] sm:text-xs font-black text-green-500 uppercase">En Service</p>
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-4 sm:p-5 bg-black/40 rounded-xl sm:rounded-2xl border border-white/5">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">Membre depuis</span>
                    <span className="text-[10px] sm:text-xs font-black">{livreur ? format(new Date(livreur.created_at), "dd/MM/yyyy") : "-"}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 sm:p-5 bg-black/40 rounded-xl sm:rounded-2xl border border-white/5">
                    <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest">ID Livreur</span>
                    <span className="text-[10px] sm:text-xs font-black">#{livreur?.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm transition-all whitespace-nowrap",
        active ? "bg-[#FFD000] text-black shadow-lg shadow-[#FFD000]/20" : "bg-white/5 text-gray-500 hover:text-white hover:bg-white/10"
      )}
    >
      {icon} {label}
      {count !== undefined && (
        <span className={cn(
          "px-1.5 sm:px-2 py-0.5 rounded-lg text-[8px] sm:text-[10px] font-black",
          active ? "bg-black/20" : "bg-white/10"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
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
      className={`bg-[#111] border ${isMyOrder ? 'border-[#FFD000]/30' : 'border-white/10'} rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-xl`}
    >
      <div className="p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6">
        <div className="flex-1 space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-white/5 rounded-lg sm:rounded-xl">
                <Clock size={14} sm:size={16} className="text-[#FFD000]" />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">
                {format(new Date(order.created_at), "HH:mm", { locale: fr })}
              </span>
            </div>
            <span className={`px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[10px] font-black uppercase tracking-widest ${
              order.status === 'pending' ? 'bg-blue-500/10 text-blue-500' :
              order.status === 'accepted' ? 'bg-[#FFD000]/10 text-[#FFD000]' :
              'bg-orange-500/10 text-orange-500'
            }`}>
              {order.status.replace('_', ' ')}
            </span>
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-black mb-1">{order.customer_name}</h3>
            <div className="flex items-center gap-2 text-gray-500">
              <MapPin size={12} sm:size={14} />
              <span className="text-[10px] sm:text-xs font-bold">Localisation GPS partagée</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {order.order_items.map((item, i) => (
              <span key={i} className="bg-white/5 px-2 sm:px-3 py-1 rounded-lg text-[8px] sm:text-[10px] font-bold">
                {item.quantity}x {item.product_name}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 md:w-48 border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
          <div className="flex md:block justify-between items-center">
            <p className="text-[8px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</p>
            <p className="text-xl sm:text-2xl font-black text-[#FFD000]">{order.total.toFixed(2)} MAD</p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {!isMyOrder ? (
              <button 
                onClick={() => onUpdateStatus(order.id, 'accepted')}
                className="w-full bg-[#FFD000] text-black py-3.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
              >
                ACCEPTER <ArrowRight size={16} />
              </button>
            ) : (
              <>
                {order.status === 'accepted' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'en_livraison')}
                    className="w-full bg-orange-500 text-white py-3.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    EN LIVRAISON <Bike size={16} />
                  </button>
                )}
                {order.status === 'en_livraison' && (
                  <button 
                    onClick={() => onUpdateStatus(order.id, 'delivered')}
                    className="w-full bg-green-500 text-white py-3.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                  >
                    LIVRÉ <CheckCircle2 size={16} />
                  </button>
                )}
                <div className="flex gap-2">
                  <a 
                    href={`tel:${order.customer_phone}`}
                    className="flex-1 bg-white/5 text-white py-3.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
                  >
                    <Phone size={16} />
                  </a>
                  <a 
                    href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-white/5 text-white py-3.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
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
