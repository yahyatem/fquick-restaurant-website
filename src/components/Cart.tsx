import { useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Minus, Send, ShoppingBag } from "lucide-react";
import { CartItem } from "../types";
import { BUSINESS_INFO } from "../constants";

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
}

export default function Cart({ items, onClose, onUpdateQuantity, onClearCart }: CartProps) {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (!phone || !address) {
      alert("Veuillez entrer votre téléphone et votre adresse.");
      return;
    }

    setIsOrdering(true);

    const orderData = {
      items,
      total,
      customerPhone: phone,
      customerAddress: address,
    };

    try {
      // Save order to backend
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error("Failed to save order");

      // Generate WhatsApp Message
      const message = `*NOUVELLE COMMANDE F-QUICK*%0A%0A` +
        `*Client:* ${phone}%0A` +
        `*Adresse:* ${address}%0A%0A` +
        `*Articles:*%0A` +
        items.map(item => `- ${item.name} x${item.quantity} (${item.price * item.quantity} MAD)`).join("%0A") +
        `%0A%0A*TOTAL: ${total} MAD*`;

      const whatsappUrl = `https://wa.me/${BUSINESS_INFO.whatsapp}?text=${message}`;
      
      onClearCart();
      onClose();
      window.open(whatsappUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Une erreur est survenue lors de la commande.");
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
            items.map(item => (
              <div key={item.id} className="flex items-center gap-4 group">
                <div className="flex-1">
                  <h4 className="font-bold text-white group-hover:text-[#FFD000] transition-colors">{item.name}</h4>
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
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 bg-white/5 border-t border-white/10 space-y-6">
            <div className="space-y-4">
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
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">ADRESSE DE LIVRAISON</label>
                <textarea 
                  placeholder="Votre adresse complète..."
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold h-24 resize-none"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between text-xl font-black">
                <span>TOTAL</span>
                <span className="text-[#FFD000]">{total} MAD</span>
              </div>
              <button
                onClick={handleCheckout}
                disabled={isOrdering}
                className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
              >
                {isOrdering ? "CHARGEMENT..." : (
                  <>COMMANDER VIA WHATSAPP <Send size={20} /></>
                )}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
