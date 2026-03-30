import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, MapPin, Phone, User, Loader2, CheckCircle2 } from "lucide-react";
import { CartItem, MenuItem, ProductSize } from "../types";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const SUGGESTIONS: MenuItem[] = [
  {
    id: "upsell-frites",
    name: "Frites Croustillantes",
    description: "Portion généreuse de frites dorées",
    category_id: "upsell",
    image_url: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877",
    is_active: true,
    sizes: [{ id: "size-frites", product_id: "upsell-frites", size_name: "Standard", price: 15, is_default: true }]
  },
  {
    id: "upsell-coca",
    name: "Coca-Cola 33cl",
    description: "Boisson rafraîchissante",
    category_id: "upsell",
    image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97",
    is_active: true,
    sizes: [{ id: "size-coca", product_id: "upsell-coca", size_name: "Standard", price: 10, is_default: true }]
  }
];

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onAddToCart: (product: MenuItem, size: ProductSize) => void;
  settings: any;
}

export default function Cart({ items, onClose, onUpdateQuantity, onClearCart, onAddToCart, settings }: CartProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!customerName.trim()) {
      newErrors.name = "Le nom est requis";
    } else if (customerName.trim().length < 3) {
      newErrors.name = "Le nom doit contenir au moins 3 caractères";
    }

    const phoneRegex = /^(06|07)\d{8}$/;
    if (!customerPhone.trim()) {
      newErrors.phone = "Le numéro de téléphone est requis";
    } else if (!phoneRegex.test(customerPhone.trim())) {
      newErrors.phone = "Format invalide (ex: 0612345678)";
    }

    if (!location) {
      newErrors.location = "Veuillez partager votre position pour la livraison";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const requestLocation = () => {
    setIsLocating(true);
    setErrors(prev => ({ ...prev, location: "" }));
    
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
        toast.success("Position capturée avec succès !");
      },
      (err) => {
        console.error(err);
        setIsLocating(false);
        toast.error("Impossible de récupérer votre position. Veuillez réessayer.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleCheckout = async () => {
    if (!validateForm()) return;
    if (items.length === 0) {
      toast.error("Votre panier est vide");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create or get client
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .upsert({ 
          phone: customerPhone.trim(), 
          full_name: customerName.trim() 
        }, { onConflict: 'phone' })
        .select()
        .single();

      if (clientError) throw clientError;

      // 2. Create order with stronger tracking code
      const timestamp = Date.now().toString(36).toUpperCase();
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      const trackingCode = `CMD-${timestamp}-${random}`;

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          client_id: clientData.id,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim(),
          latitude: location?.lat,
          longitude: location?.lng,
          total: total,
          status: 'pending',
          tracking_code: trackingCode
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Create order items
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id, // Will be null for extras
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        item_type: item.item_type || 'product'
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(orderData.id);
      setStep('success');
      onClearCart();
      toast.success("Commande envoyée avec succès !");
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Une erreur est survenue lors de la commande. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-end"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-xl h-full bg-[#0A0A0A] border-l border-white/10 flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-white/10 flex items-center justify-between bg-black/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FFD000] rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-[#FFD000]/20">
              <ShoppingBag className="text-black" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter uppercase italic">VOTRE PANIER</h2>
              <p className="text-gray-500 text-[10px] font-black tracking-widest uppercase">{items.length} ARTICLES</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {step === 'cart' ? (
              <motion.div 
                key="cart"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-12"
              >
                {items.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ShoppingBag size={40} className="text-gray-700" />
                    </div>
                    <p className="text-gray-500 font-black uppercase tracking-widest text-sm mb-8">Votre panier est vide</p>
                    <button 
                      onClick={onClose}
                      className="bg-[#FFD000] text-black px-8 py-4 rounded-2xl font-black text-sm hover:scale-105 transition-transform"
                    >
                      VOIR LE MENU
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {items.map((item) => (
                        <motion.div 
                          layout
                          key={item.id}
                          className="flex items-center gap-6 p-4 bg-white/5 rounded-[32px] border border-white/5 group hover:border-[#FFD000]/30 transition-all"
                        >
                          <div className="flex-1">
                            <h3 className="font-black text-lg mb-1 group-hover:text-[#FFD000] transition-colors uppercase italic">{item.name}</h3>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">{item.size_name}</p>
                            <p className="text-[#FFD000] font-black mt-2">{item.price} MAD</p>
                          </div>
                          <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-white/5">
                            <button 
                              onClick={() => onUpdateQuantity(item.id, -1)}
                              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                            >
                              <Minus size={16} />
                            </button>
                            <span className="font-black w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => onUpdateQuantity(item.id, 1)}
                              className="p-2 hover:bg-white/10 rounded-xl transition-colors text-gray-400 hover:text-white"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Upsell Section */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-[#FFD000] rounded-full" />
                        <h3 className="text-xl font-black tracking-tighter uppercase italic">COMPLÉTEZ VOTRE REPAS</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {SUGGESTIONS.map((product) => (
                          <button
                            key={product.id}
                            onClick={() => onAddToCart(product, product.sizes[0])}
                            className="flex items-center gap-4 p-4 bg-white/5 rounded-[28px] border border-white/5 hover:border-[#FFD000]/50 transition-all text-left group"
                          >
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-black text-xs uppercase italic mb-1">{product.name}</p>
                              <p className="text-[#FFD000] font-black text-sm">+{product.sizes[0].price} MAD</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </motion.div>
            ) : step === 'checkout' ? (
              <motion.div 
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">NOM COMPLET</label>
                    <div className="relative">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type="text" 
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
                        }}
                        placeholder="Votre nom"
                        className={cn(
                          "w-full bg-white/5 border rounded-[24px] pl-14 pr-6 py-5 outline-none transition-all font-bold",
                          errors.name ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#FFD000]"
                        )}
                      />
                    </div>
                    {errors.name && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase tracking-wider">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">TÉLÉPHONE</label>
                    <div className="relative">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                      <input 
                        type="tel" 
                        value={customerPhone}
                        onChange={(e) => {
                          setCustomerPhone(e.target.value);
                          if (errors.phone) setErrors(prev => ({ ...prev, phone: "" }));
                        }}
                        placeholder="06 / 07..."
                        className={cn(
                          "w-full bg-white/5 border rounded-[24px] pl-14 pr-6 py-5 outline-none transition-all font-bold",
                          errors.phone ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-[#FFD000]"
                        )}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase tracking-wider">{errors.phone}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">LIVRAISON</label>
                    <button 
                      onClick={requestLocation}
                      disabled={isLocating}
                      className={cn(
                        "w-full flex items-center justify-center gap-3 py-5 rounded-[24px] font-black text-sm transition-all border",
                        location 
                          ? "bg-green-500/10 border-green-500/50 text-green-500" 
                          : errors.location
                            ? "bg-red-500/5 border-red-500/50 text-red-500"
                            : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                      )}
                    >
                      {isLocating ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          LOCALISATION EN COURS...
                        </>
                      ) : location ? (
                        <>
                          <CheckCircle2 size={20} />
                          POSITION CAPTURÉE
                        </>
                      ) : (
                        <>
                          <MapPin size={20} />
                          PARTAGER MA POSITION
                        </>
                      )}
                    </button>
                    {errors.location && <p className="text-red-500 text-[10px] font-bold ml-4 uppercase tracking-wider">{errors.location}</p>}
                  </div>
                </div>

                <div className="bg-white/5 rounded-[32px] p-6 border border-white/5">
                  <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">RÉSUMÉ DE LA COMMANDE</h4>
                  <div className="space-y-2 mb-4">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm font-bold">
                        <span className="text-gray-400">{item.quantity}x {item.name}</span>
                        <span>{(item.price * item.quantity).toFixed(2)} MAD</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                    <span className="font-black uppercase italic">Total</span>
                    <span className="text-2xl font-black text-[#FFD000]">{total.toFixed(2)} MAD</span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <div className="w-24 h-24 bg-green-500 rounded-[32px] flex items-center justify-center text-black mx-auto mb-8 rotate-6 shadow-xl shadow-green-500/20">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-4xl font-black tracking-tighter mb-4 uppercase italic">MERCI !</h2>
                <p className="text-gray-400 font-bold mb-12">Votre commande a été envoyée avec succès. Vous pouvez suivre son état en temps réel.</p>
                
                <div className="space-y-4">
                  <button 
                    onClick={() => window.location.href = `/tracking/${orderId}`}
                    className="w-full bg-[#FFD000] text-black py-5 rounded-[24px] font-black text-sm hover:scale-105 transition-transform flex items-center justify-center gap-2"
                  >
                    SUIVRE MA COMMANDE <ArrowRight size={20} />
                  </button>
                  <button 
                    onClick={onClose}
                    className="w-full bg-white/5 text-white py-5 rounded-[24px] font-black text-sm hover:bg-white/10 transition-colors"
                  >
                    RETOUR AU MENU
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step !== 'success' && items.length > 0 && (
          <div className="p-6 sm:p-8 border-t border-white/10 bg-black/50 backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total à payer</p>
                <p className="text-3xl font-black text-[#FFD000] tracking-tighter">{total.toFixed(2)} MAD</p>
              </div>
              <button 
                onClick={onClearCart}
                className="p-4 text-gray-500 hover:text-red-500 transition-colors"
                title="Vider le panier"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            {step === 'cart' ? (
              <button 
                onClick={() => setStep('checkout')}
                className="w-full bg-[#FFD000] text-black py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-[#FFD000]/20"
              >
                PASSER À LA CAISSE <ArrowRight size={20} />
              </button>
            ) : (
              <div className="flex gap-4">
                <button 
                  onClick={() => setStep('cart')}
                  disabled={isSubmitting}
                  className="flex-1 bg-white/5 text-white py-5 rounded-[24px] font-black text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  RETOUR
                </button>
                <button 
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="flex-[2] bg-[#FFD000] text-black py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 hover:scale-105 transition-transform shadow-xl shadow-[#FFD000]/20 disabled:opacity-50 disabled:scale-100"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      ENVOI EN COURS...
                    </>
                  ) : (
                    <>
                      CONFIRMER LA COMMANDE <CheckCircle2 size={20} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
