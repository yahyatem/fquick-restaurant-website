import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  ArrowRight, 
  Clock, 
  Loader2, 
  LogOut, 
  User, 
  ShoppingBag,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Order, Livreur, OrderItem } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "../lib/utils";

export default function LivreurPage() {
  const [activeTab, setActiveTab] = useState<'available' | 'my-orders' | 'profile'>('available');
  const [orders, setOrders] = useState<Order[]>([]);
  const [livreur, setLivreur] = useState<Livreur | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    const livreurData = localStorage.getItem('livreur_data');
    if (livreurData) {
      setLivreur(JSON.parse(livreurData));
    }
    fetchOrders();

    // Real-time subscription
    const subscription = supabase
      .channel('livreur-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, livreurs(full_name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Erreur lors du chargement des commandes");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    if (!livreur) return;
    setIsActionLoading(true);

    try {
      // 1. Check if order is still available
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('status, livreur_id')
        .eq('id', orderId)
        .single();

      if (currentOrder?.status !== 'pending' || currentOrder?.livreur_id) {
        toast.error("Cette commande a déjà été acceptée par un autre livreur");
        fetchOrders();
        return;
      }

      // 2. Accept order
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'accepted', 
          livreur_id: livreur.id 
        })
        .eq('id', orderId);

      if (error) throw error;
      toast.success("Commande acceptée !");
      setActiveTab('my-orders');
      fetchOrders();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setIsActionLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Statut mis à jour: ${newStatus === 'delivering' ? 'En livraison' : 'Livrée'}`);
      fetchOrders();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('livreur_authenticated');
    localStorage.removeItem('livreur_data');
    window.location.href = '/';
  };

  const fetchOrderItems = async (orderId: string) => {
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (data) setOrderItems(data);
  };

  const availableOrders = orders.filter(o => o.status === 'pending');
  const myOrders = orders.filter(o => o.livreur_id === livreur?.id && o.status !== 'completed');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#FFD000] animate-spin" />
          <div className="absolute inset-0 blur-2xl bg-[#FFD000]/20 animate-pulse" />
        </div>
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Chargement des commandes...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD000] rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#FFD000]/20">
              <Truck className="text-black" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic">LIVREUR</h1>
              <p className="text-[10px] font-black text-[#FFD000] tracking-widest uppercase">{livreur?.full_name}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="p-3 hover:bg-red-500/10 rounded-2xl transition-colors text-gray-500 hover:text-red-500"
          >
            <LogOut size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-6 flex gap-2 pb-4">
          {[
            { id: 'available', label: 'Disponibles', count: availableOrders.length },
            { id: 'my-orders', label: 'Mes Livraisons', count: myOrders.length },
            { id: 'profile', label: 'Profil', count: null }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border",
                activeTab === tab.id 
                  ? "bg-[#FFD000] text-black border-[#FFD000] shadow-lg shadow-[#FFD000]/10" 
                  : "bg-white/5 text-gray-500 border-white/5 hover:bg-white/10"
              )}
            >
              {tab.label} {tab.count !== null && `(${tab.count})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === 'available' && (
            <motion.div 
              key="available"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {availableOrders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Aucune commande disponible</p>
                </div>
              ) : (
                availableOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onAction={() => handleAcceptOrder(order.id)}
                    actionLabel="ACCEPTER LA COMMANDE"
                    isLoading={isActionLoading}
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'my-orders' && (
            <motion.div 
              key="my-orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {myOrders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Package size={32} className="text-gray-700" />
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Vous n'avez pas de livraisons en cours</p>
                </div>
              ) : (
                myOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onAction={() => {
                      if (order.status === 'accepted') handleUpdateStatus(order.id, 'delivering');
                      else if (order.status === 'delivering') handleUpdateStatus(order.id, 'completed');
                    }}
                    actionLabel={order.status === 'accepted' ? "COMMENCER LA LIVRAISON" : "MARQUER COMME LIVRÉE"}
                    isLoading={isActionLoading}
                    isMyOrder
                  />
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'profile' && livreur && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-white/5 rounded-[40px] p-8 border border-white/5 text-center">
                <div className="w-24 h-24 bg-[#FFD000] rounded-[32px] flex items-center justify-center text-black mx-auto mb-6 rotate-6 shadow-xl shadow-[#FFD000]/20">
                  <User size={48} />
                </div>
                <h2 className="text-3xl font-black tracking-tighter uppercase italic mb-2">{livreur.full_name}</h2>
                <p className="text-[#FFD000] font-black text-xs tracking-widest uppercase mb-8">Livreur Partenaire</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">TÉLÉPHONE</p>
                    <p className="font-bold">{livreur.phone}</p>
                  </div>
                  <div className="bg-black/40 p-6 rounded-3xl border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">STATUT</p>
                    <p className="font-bold text-green-500">ACTIF</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-[40px] p-8 border border-white/5">
                <h3 className="text-xl font-black tracking-tighter uppercase italic mb-6 flex items-center gap-3">
                  <div className="w-2 h-6 bg-[#FFD000] rounded-full" />
                  STATISTIQUES
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-4 border-b border-white/5">
                    <span className="text-gray-400 font-bold">Livraisons terminées</span>
                    <span className="font-black text-[#FFD000]">--</span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-white/5">
                    <span className="text-gray-400 font-bold">Note moyenne</span>
                    <span className="font-black text-[#FFD000]">5.0 ★</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, actionLabel, isLoading, isMyOrder }: any) {
  return (
    <motion.div 
      layout
      className="bg-white/5 rounded-[40px] p-8 border border-white/5 hover:border-white/10 transition-all"
    >
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center rotate-3 shadow-lg",
            order.status === 'pending' ? "bg-blue-500/10 text-blue-500" :
            order.status === 'accepted' ? "bg-yellow-500/10 text-yellow-500" :
            "bg-orange-500/10 text-orange-500"
          )}>
            <Package size={28} />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tighter uppercase italic">{order.customer_name}</h3>
            <p className="text-[10px] font-black text-[#FFD000] tracking-widest uppercase">{order.tracking_code}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">TOTAL</p>
          <p className="text-2xl font-black text-[#FFD000] tracking-tighter">{order.total} MAD</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
              <Phone size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">TÉLÉPHONE</p>
              <a href={`tel:${order.customer_phone}`} className="font-bold hover:text-[#FFD000] transition-colors">{order.customer_phone}</a>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
              <Clock size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">REÇUE À</p>
              <p className="font-bold">{format(new Date(order.created_at), "HH:mm", { locale: fr })}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
              <MapPin size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DESTINATION</p>
              <a 
                href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FFD000] font-bold text-sm flex items-center gap-1 hover:underline"
              >
                Voir sur Maps <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={onAction}
        disabled={isLoading}
        className={cn(
          "w-full py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl",
          order.status === 'pending' 
            ? "bg-[#FFD000] text-black shadow-[#FFD000]/20 hover:scale-[1.02]" 
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
          <>
            {actionLabel}
            <ArrowRight size={20} />
          </>
        )}
      </button>
    </motion.div>
  );
}
