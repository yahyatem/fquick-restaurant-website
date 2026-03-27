import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";
import { ShoppingBag, MapPin, Phone, Clock, ChevronLeft, CheckCircle2, Package, Truck, Bike } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Order } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function TrackingPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (err) {
        console.error("Error fetching order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Real-time subscription for updates
    const subscription = supabase
      .channel(`order_tracking_${id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders',
        filter: `id=eq.${id}`
      }, (payload) => {
        setOrder(payload.new as Order);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#FFD000] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <ShoppingBag size={64} className="text-gray-800 mb-6" />
        <h1 className="text-2xl font-black mb-2">COMMANDE INTROUVABLE</h1>
        <p className="text-gray-500 mb-8">Nous n'avons pas pu trouver les détails de cette commande.</p>
        <Link to="/" className="bg-[#FFD000] text-black px-8 py-4 rounded-2xl font-black flex items-center gap-2">
          <ChevronLeft size={20} /> RETOUR À L'ACCUEIL
        </Link>
      </div>
    );
  }

  const steps = [
    { status: 'pending', label: 'En attente', icon: Clock },
    { status: 'accepted', label: 'Acceptée', icon: CheckCircle2 },
    { status: 'en livraison', label: 'En livraison', icon: Bike },
    { status: 'delivered', label: 'Livrée', icon: Package },
  ];

  const currentStepIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <header className="max-w-2xl mx-auto flex items-center justify-between mb-8">
        <Link to="/" className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-black tracking-tighter">SUIVI DE COMMANDE</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-2xl mx-auto space-y-8">
        {/* Status Stepper */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 shadow-xl">
          <div className="flex justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10 -z-0" />
            <div 
              className="absolute top-5 left-0 h-0.5 bg-[#FFD000] transition-all duration-500 -z-0" 
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.status} className="flex flex-col items-center gap-3 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isActive ? "bg-[#FFD000] text-black scale-110" : "bg-[#222] text-gray-600"
                  } ${isCurrent ? "ring-4 ring-[#FFD000]/20" : ""}`}>
                    <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isActive ? "text-[#FFD000]" : "text-gray-600"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Livreur Info */}
        {order.livreur_name && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#FFD000] text-black rounded-3xl p-6 flex items-center gap-4 shadow-lg"
          >
            <div className="w-16 h-16 bg-black/10 rounded-2xl flex items-center justify-center">
              <Bike size={32} />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase opacity-50 tracking-widest">Votre livreur</p>
              <h3 className="text-xl font-black">{order.livreur_name}</h3>
              <p className="text-sm font-bold opacity-70">En route vers vous !</p>
            </div>
            <a 
              href={`tel:${order.livreur_id}`} // Assuming livreur_id might be phone or we need a separate field
              className="w-12 h-12 bg-black text-[#FFD000] rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
            >
              <Phone size={20} />
            </a>
          </motion.div>
        )}

        {/* Order Details */}
        <div className="bg-[#111] border border-white/10 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Référence</p>
              <h4 className="font-black text-[#FFD000]">#{order.id.slice(0, 8).toUpperCase()}</h4>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</p>
              <p className="font-bold text-sm">{format(new Date(order.created_at), "dd MMMM, HH:mm", { locale: fr })}</p>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-white/5 rounded flex items-center justify-center text-xs font-black text-[#FFD000]">
                    {item.quantity}
                  </span>
                  <span className="font-bold">{item.name}</span>
                </div>
                <span className="text-gray-500 font-bold">{(item.price * item.quantity).toFixed(2)} MAD</span>
              </div>
            ))}
          </div>

          <div className="p-6 bg-white/5 flex justify-between items-center">
            <span className="font-black text-lg">TOTAL</span>
            <span className="text-2xl font-black text-[#FFD000]">{order.total.toFixed(2)} MAD</span>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-[#111] border border-white/10 rounded-3xl p-6 flex items-start gap-4">
          <div className="p-3 bg-white/5 rounded-2xl text-[#FFD000]">
            <MapPin size={24} />
          </div>
          <div>
            <h4 className="font-black mb-1">ADRESSE DE LIVRAISON</h4>
            <p className="text-sm text-gray-500 font-medium">Localisation GPS partagée lors de la commande.</p>
            {order.latitude && order.longitude && (
              <a 
                href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#FFD000] text-xs font-black mt-3 hover:underline"
              >
                VOIR SUR LA CARTE
              </a>
            )}
          </div>
        </div>

        <Link 
          to="/" 
          className="w-full py-4 text-center text-gray-500 font-black text-sm hover:text-white transition-colors block"
        >
          RETOUR À L'ACCUEIL
        </Link>
      </main>
    </div>
  );
}
