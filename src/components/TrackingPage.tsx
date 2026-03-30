import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  MapPin, 
  Phone, 
  ArrowLeft, 
  Clock, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  MessageSquare
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Order, OrderItem } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "../lib/utils";
import { BUSINESS_INFO } from "../constants";

const STATUS_STEPS = [
  { id: 'pending', label: 'Commande Reçue', icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'accepted', label: 'En Préparation', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 'delivering', label: 'En Livraison', icon: Truck, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 'completed', label: 'Livrée', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' }
];

export default function TrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*, livreurs(full_name, phone)')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;
        setOrder(orderData);

        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;
        setItems(itemsData);
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Commande introuvable ou erreur de connexion.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Real-time subscription
    const subscription = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        setOrder(prev => prev ? { ...prev, ...payload.new } : null);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <Loader2 className="w-16 h-16 text-[#FFD000] animate-spin" />
          <div className="absolute inset-0 blur-2xl bg-[#FFD000]/20 animate-pulse" />
        </div>
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Recherche de votre commande...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="text-red-500" size={40} />
        </div>
        <h2 className="text-2xl font-black tracking-tighter uppercase italic mb-2">OUPS !</h2>
        <p className="text-gray-500 font-bold mb-8">{error || "Commande introuvable"}</p>
        <Link 
          to="/"
          className="bg-[#FFD000] text-black px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform flex items-center gap-2"
        >
          <ArrowLeft size={20} /> RETOUR AU MENU
        </Link>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.id === order.status);
  const currentStep = STATUS_STEPS[currentStepIndex];

  return (
    <div className="min-h-screen bg-[#0A0A0A] pb-20">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link to="/" className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-gray-400 hover:text-white">
            <ArrowLeft size={24} />
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-black tracking-tighter uppercase italic">SUIVI DE COMMANDE</h1>
            <p className="text-[10px] font-black text-[#FFD000] tracking-widest uppercase">{order.tracking_code}</p>
          </div>
          <div className="w-12" /> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 mt-12 space-y-8">
        {/* Status Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-[40px] p-8 border border-white/5 relative overflow-hidden"
        >
          <div className={cn("absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20", currentStep.bg)} />
          
          <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 relative">
            <div className={cn("w-24 h-24 rounded-[32px] flex items-center justify-center rotate-6 shadow-2xl", currentStep.bg, currentStep.color)}>
              <currentStep.icon size={48} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ÉTAT ACTUEL</p>
              <h2 className={cn("text-4xl font-black tracking-tighter uppercase italic mb-2", currentStep.color)}>
                {currentStep.label}
              </h2>
              <p className="text-gray-400 font-bold">
                {order.status === 'pending' && "Nous avons bien reçu votre commande."}
                {order.status === 'accepted' && "Le chef prépare votre délicieux repas."}
                {order.status === 'delivering' && "Votre commande est en route vers vous !"}
                {order.status === 'completed' && "Bon appétit ! Commande livrée."}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-12 relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -translate-y-1/2" />
            <div 
              className="absolute top-1/2 left-0 h-1 bg-[#FFD000] -translate-y-1/2 transition-all duration-1000" 
              style={{ width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            />
            <div className="flex justify-between relative">
              {STATUS_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isActive = idx <= currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                
                return (
                  <div key={step.id} className="flex flex-col items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border-2",
                      isActive 
                        ? "bg-[#FFD000] border-[#FFD000] text-black scale-110 shadow-lg shadow-[#FFD000]/20" 
                        : "bg-[#0A0A0A] border-white/10 text-gray-600"
                    )}>
                      <Icon size={18} />
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-widest hidden sm:block",
                      isActive ? "text-[#FFD000]" : "text-gray-600"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Livreur Info */}
        {order.livreurs && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 rounded-[40px] p-8 border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-[#FFD000] rounded-2xl flex items-center justify-center text-black rotate-3">
                <Truck size={32} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">VOTRE LIVREUR</p>
                <h3 className="text-2xl font-black tracking-tighter uppercase italic">{order.livreurs.full_name}</h3>
              </div>
            </div>
            <a 
              href={`tel:${order.livreurs.phone}`}
              className="w-full sm:w-auto bg-white/5 hover:bg-[#FFD000] text-white hover:text-black px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all border border-white/10 hover:border-[#FFD000]"
            >
              <Phone size={20} /> APPELER LE LIVREUR
            </a>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/5 rounded-[40px] p-8 border border-white/5"
          >
            <h3 className="text-xl font-black tracking-tighter uppercase italic mb-6 flex items-center gap-3">
              <div className="w-2 h-6 bg-[#FFD000] rounded-full" />
              DÉTAILS DE LA COMMANDE
            </h3>
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="font-black text-sm uppercase italic">{item.product_name}</p>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Quantité: {item.quantity}</p>
                  </div>
                  <p className="font-black text-[#FFD000]">{item.subtotal} MAD</p>
                </div>
              ))}
              <div className="pt-6 flex justify-between items-center">
                <span className="text-xl font-black uppercase italic">TOTAL</span>
                <span className="text-3xl font-black text-[#FFD000] tracking-tighter">{order.total} MAD</span>
              </div>
            </div>
          </motion.div>

          {/* Customer & Support */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 rounded-[40px] p-8 border border-white/5"
            >
              <h3 className="text-xl font-black tracking-tighter uppercase italic mb-6 flex items-center gap-3">
                <div className="w-2 h-6 bg-[#FFD000] rounded-full" />
                INFORMATIONS CLIENT
              </h3>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">DATE DE COMMANDE</p>
                    <p className="font-bold text-sm">
                      {format(new Date(order.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-400">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">POSITION DE LIVRAISON</p>
                    <a 
                      href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#FFD000] font-bold text-sm flex items-center gap-1 hover:underline"
                    >
                      Voir sur Google Maps <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Support Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[#FFD000] rounded-[40px] p-8 text-black"
            >
              <h3 className="text-xl font-black tracking-tighter uppercase italic mb-2">BESOIN D'AIDE ?</h3>
              <p className="font-bold text-sm mb-6 opacity-80">Notre équipe est disponible pour répondre à vos questions concernant votre commande.</p>
              <div className="grid grid-cols-2 gap-4">
                <a 
                  href={`tel:${BUSINESS_INFO.phone}`}
                  className="bg-black text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <Phone size={16} /> APPELER
                </a>
                <a 
                  href={`https://wa.me/${BUSINESS_INFO.phone.replace(/\s/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                >
                  <MessageSquare size={16} /> WHATSAPP
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
