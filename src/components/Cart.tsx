import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Plus, Minus, Send, ShoppingBag, MapPin, Sparkles } from "lucide-react";
import { CartItem, MenuItem, ProductSize } from "../types";
import { BUSINESS_INFO } from "../constants";
import { supabase } from "../lib/supabase";

const SUGGESTIONS: MenuItem[] = [
  { 
    id: 'upsell-frites', 
    name: 'Frites Croustillantes', 
    category_id: 'upsell', 
    sizes: [{ id: 's1', product_id: 'upsell-frites', size_name: 'Portion', price: 15, is_default: true }] 
  },
  { 
    id: 'upsell-coca', 
    name: 'Coca-Cola 33cl', 
    category_id: 'upsell', 
    sizes: [{ id: 's2', product_id: 'upsell-coca', size_name: '33cl', price: 10, is_default: true }] 
  },
  { 
    id: 'upsell-sauce', 
    name: 'Sauce Algérienne', 
    category_id: 'upsell', 
    sizes: [{ id: 's3', product_id: 'upsell-sauce', size_name: 'Pot', price: 5, is_default: true }] 
  },
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
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const deliveryFee = settings.delivery_fee || 0;
  const minOrder = settings.min_order || 0;
  const isOpen = settings.is_open !== false;

  const captureLocation = () => {
    setIsCapturing(true);
    setLocationError(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsCapturing(false);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          let msg = "Erreur de localisation. Veuillez autoriser l'accès.";
          if (error.code === error.PERMISSION_DENIED) {
            msg = "Accès à la localisation refusé. Veuillez l'activer dans vos paramètres.";
          }
          setLocationError(msg);
          setIsCapturing(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      setIsCapturing(false);
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    // 4. Validate data before insert
    if (!name || !phone || !location) {
      alert("Veuillez remplir tous les champs et partager votre localisation.");
      return;
    }

    if (items.length === 0) {
      alert("Votre panier est vide.");
      return;
    }

    if (subtotal < minOrder) {
      alert(`Le montant minimum de commande est de ${minOrder} MAD.`);
      return;
    }

    if (!isOpen) {
      alert(settings.closed_message || "Le restaurant est actuellement fermé.");
      return;
    }

    setIsOrdering(true);
    setError(null);

    try {
      // 1. Fix client handling: Check if a client exists in `clients` by phone
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (clientError) {
        console.error("Supabase Client Lookup Error:", clientError); // 5. Debugging
        throw clientError;
      }

      let clientId = clientData?.id;

      // If not, insert a new client
      if (!clientId) {
        const { data: newClient, error: createClientError } = await supabase
          .from('clients')
          .insert([{ full_name: name, phone }])
          .select()
          .single();
        
        if (createClientError) {
          console.error("Supabase Client Creation Error:", createClientError); // 5. Debugging
          throw createClientError;
        }
        clientId = newClient.id;
      }

      // 2. Fix order insert: Insert into `orders` using ONLY valid fields
      const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          client_id: clientId,
          customer_name: name,
          customer_phone: phone,
          latitude: location.lat,
          longitude: location.lng,
          total: total,
          status: 'pending',
          tracking_code: trackingCode
        }])
        .select()
        .single();

      if (orderError) {
        console.error("Supabase Order Insert Error:", orderError); // 5. Debugging
        throw orderError;
      }

      // 3. Fix order_items insert
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.name,
        size_name: item.size_name,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        item_type: item.item_type
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error("Supabase Order Items Insert Error:", itemsError); // 5. Debugging
        throw itemsError;
      }

      // 6. Success behavior
      setIsSuccess(true);
      onClearCart(); // clear cart
      
      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        onClose();
        navigate(`/tracking/${order.id}`); // redirect user
      }, 2000);
    } catch (err: any) {
      // 5. Debugging: Show real error
      console.error("FULL ERROR OBJECT:", err);
      setError(err.message || "Erreur inconnue");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-[#0A0A0A] h-full flex flex-col shadow-2xl border-l border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFD000] p-2 rounded-xl text-black">
              <ShoppingBag size={20} />
            </div>
            <h2 className="text-xl font-black">VOTRE PANIER</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <ShoppingBag size={64} strokeWidth={1} />
              <p className="font-bold text-lg">Votre panier est vide</p>
              <button 
                onClick={onClose}
                className="text-[#FFD000] font-black underline underline-offset-4"
              >
                Commencer vos achats
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-[#FFD000] transition-colors">
                        {item.name}
                        {item.size_name && (
                          <span className="ml-2 text-xs text-gray-500 font-medium">({item.size_name})</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">{item.price} MAD</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-1 border border-white/10">
                      <button 
                        onClick={() => onUpdateQuantity(item.id, -1)}
                        className="p-1 hover:text-[#FFD000] transition-colors"
                      >
                        <Minus size={16} strokeWidth={3} />
                      </button>
                      <span className="font-black w-4 text-center text-sm">{item.quantity}</span>
                      <button 
                        onClick={() => onUpdateQuantity(item.id, 1)}
                        className="p-1 hover:text-[#FFD000] transition-colors"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upsell Suggestions */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-[#FFD000]" size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Complétez votre repas</h4>
                </div>
                <div className="grid gap-3">
                  {SUGGESTIONS.filter(s => !items.find(i => i.id === s.id)).map(suggestion => (
                    <button
                      key={suggestion.id}
                      onClick={() => onAddToCart(suggestion, suggestion.sizes[0])}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">{suggestion.name}</p>
                        <p className="text-xs text-[#FFD000] font-black">{suggestion.sizes[0]?.price || 0} MAD</p>
                      </div>
                      <Plus className="text-gray-500 group-hover:text-[#FFD000]" size={18} />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white/5 border-t border-white/10 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-400 font-bold">
                <span>SOUS-TOTAL</span>
                <span>{subtotal} MAD</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-400 font-bold">
                <span>LIVRAISON</span>
                <span>{deliveryFee} MAD</span>
              </div>
              <div className="flex items-center justify-between text-xl font-black pt-2 border-t border-white/5">
                <span>TOTAL</span>
                <span className="text-[#FFD000]">{total} MAD</span>
              </div>
            </div>
            
            {subtotal < minOrder && (
              <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-center">
                <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest">
                  Minimum de commande: {minOrder} MAD
                </p>
              </div>
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              disabled={subtotal < minOrder || !isOpen}
              className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {!isOpen ? "RESTAURANT FERMÉ" : "COMMANDER"} <Send size={20} />
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => !isOrdering && setIsModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md bg-[#0A0A0A] rounded-3xl p-8 border border-white/10 shadow-2xl space-y-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black">FINALISER LA COMMANDE</h3>
                <p className="text-gray-500 font-medium text-sm">Veuillez entrer vos informations de livraison</p>
              </div>

              {isSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-[#FFD000] rounded-full flex items-center justify-center mx-auto text-black">
                    <Sparkles size={40} />
                  </div>
                  <h4 className="text-xl font-black">COMMANDE RÉUSSIE !</h4>
                  <p className="text-gray-500">Votre commande a été enregistrée avec succès.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">NOM COMPLET</label>
                      <input 
                        type="text" 
                        placeholder="Votre nom..."
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">TÉLÉPHONE</label>
                      <input 
                        type="tel" 
                        placeholder="06..."
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">LOCALISATION</label>
                      <button
                        type="button"
                        onClick={captureLocation}
                        disabled={isCapturing}
                        className={`w-full flex items-center justify-center gap-3 px-4 py-4 rounded-xl border font-bold transition-all ${
                          location 
                            ? "bg-green-500/10 border-green-500/50 text-green-500" 
                            : locationError
                            ? "bg-red-500/10 border-red-500/50 text-red-500"
                            : "bg-black border-white/10 text-white hover:border-[#FFD000]"
                        }`}
                      >
                        <MapPin size={20} className={isCapturing ? "animate-bounce" : ""} />
                        {isCapturing 
                          ? "RECHERCHE..." 
                          : location 
                          ? "LOCALISATION CAPTURÉE" 
                          : "PARTAGER MA LOCALISATION"}
                      </button>
                      {location && (
                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mt-2 text-center">
                          Localisation capturée avec succès
                        </p>
                      )}
                      {locationError && (
                        <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 text-center">
                          {locationError}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleCheckout}
                      disabled={isOrdering || !name || !phone || !location}
                      className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                      {isOrdering ? "CHARGEMENT..." : "CONFIRMER LA COMMANDE"}
                    </button>
                    {error && (
                      <p className="text-red-500 text-xs font-bold text-center animate-pulse">
                        {error}
                      </p>
                    )}
                    <button
                      onClick={() => setIsModalOpen(false)}
                      disabled={isOrdering}
                      className="w-full text-gray-500 font-black text-sm hover:text-white transition-colors"
                    >
                      ANNULER
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
