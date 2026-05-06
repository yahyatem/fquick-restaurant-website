import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Plus,
  Minus,
  Send,
  ShoppingBag,
  MapPin,
  Sparkles,
  CreditCard,
  Wallet,
  ChevronRight,
  Landmark
} from "lucide-react";
import { CartItem, MenuItem, ProductSize } from "../types";
import { supabase } from "../lib/supabase";

const SUGGESTIONS: MenuItem[] = [
  {
    id: "upsell-frites",
    name: "Frites Croustillantes",
    category_id: "upsell",
    sizes: [{ id: "s1", product_id: "upsell-frites", size_name: "Portion", price: 15, is_default: true }]
  },
  {
    id: "upsell-coca",
    name: "Coca-Cola 33cl",
    category_id: "upsell",
    sizes: [{ id: "s2", product_id: "upsell-coca", size_name: "33cl", price: 10, is_default: true }]
  },
  {
    id: "upsell-sauce",
    name: "Sauce Algérienne",
    category_id: "upsell",
    sizes: [{ id: "s3", product_id: "upsell-sauce", size_name: "Pot", price: 5, is_default: true }]
  }
];

const DEFAULT_RESTAURANT_LAT = 34.0331;
const DEFAULT_RESTAURANT_LNG = -5.0003;

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Distance-based delivery (MAD) per project spec */
function deliveryFeeFromDistanceKm(
  d: number,
  pricing: {
    fee_0_2: number;
    fee_2_3_5: number;
    fee_3_5_4_9: number;
    fee_5_6: number;
    fee_gt_6: number;
  }
): number {
  if (d <= 2) return pricing.fee_0_2;
  if (d <= 3.5) return pricing.fee_2_3_5;
  if (d <= 4.9) return pricing.fee_3_5_4_9;
  if (d <= 6) return pricing.fee_5_6;
  return pricing.fee_gt_6;
}

const getDeliveryPricing = (settings: any) => ({
  fee_0_2: Number(settings?.delivery_fee_0_2 ?? 10),
  fee_2_3_5: Number(settings?.delivery_fee_2_3_5 ?? 12),
  fee_3_5_4_9: Number(settings?.delivery_fee_3_5_4_9 ?? 15),
  fee_5_6: Number(settings?.delivery_fee_5_6 ?? 20),
  fee_gt_6: Number(settings?.delivery_fee_gt_6 ?? 25)
});

function getDefaultDeliveryFee(settings: any): number {
  const pricing = getDeliveryPricing(settings);
  // Default to first band when no distance is available yet.
  return pricing.fee_0_2;
}

const MOROCCAN_BANKS = [
  "Attijariwafa Bank",
  "Banque Populaire",
  "BMCE Bank of Africa",
  "CIH Bank",
  "Crédit du Maroc",
  "Société Générale Maroc",
  "CFG Bank",
  "Al Barid Bank",
  "Bank Assafa",
  "Umnia Bank",
  "Bank Al Yousr",
  "Dar Al Amane"
];

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onClearCart: () => void;
  onAddToCart: (product: MenuItem, size: ProductSize) => void;
  settings: any;
}

type PaymentMethod = "cash_on_delivery" | "online";
type ManualLocationMethod = "address" | "maps_link" | "coords";

export default function Cart({
  items,
  onClose,
  onUpdateQuantity,
  onClearCart,
  onAddToCart,
  settings
}: CartProps) {
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
  const [locationMode, setLocationMode] = useState<"none" | "gps" | "manual">("none");
  const [manualMethod, setManualMethod] = useState<ManualLocationMethod>("address");
  const [manualAddress, setManualAddress] = useState("");
  const [mapsLinkInput, setMapsLinkInput] = useState("");
  const [coordsInput, setCoordsInput] = useState("");
  const [resolvedManualLocationText, setResolvedManualLocationText] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [selectedBank, setSelectedBank] = useState("");

  const settingsDeliveryFallback = getDefaultDeliveryFee(settings);
  const deliveryFee =
    calculatedDeliveryFee !== null ? calculatedDeliveryFee : settingsDeliveryFallback;
  const minOrder = settings?.min_order || 0;
  const isOpen = settings?.is_open !== false;

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;

  const getRestaurantCoords = () => {
    const lat = Number(
      settings?.restaurant_latitude ??
        settings?.restaurant_lat ??
        settings?.latitude ??
        DEFAULT_RESTAURANT_LAT
    );
    const lng = Number(
      settings?.restaurant_longitude ??
        settings?.restaurant_lng ??
        settings?.longitude ??
        DEFAULT_RESTAURANT_LNG
    );
    return { lat, lng };
  };

  const applyCoordsAndFee = (lat: number, lng: number) => {
    const { lat: rLat, lng: rLng } = getRestaurantCoords();
    const km = haversineKm(rLat, rLng, lat, lng);
    const fee = deliveryFeeFromDistanceKm(km, getDeliveryPricing(settings));
    setLocation({ lat, lng });
    setDeliveryDistanceKm(km);
    setCalculatedDeliveryFee(fee);
    setLocationError(null);
    setGeocodeError(null);
  };

  const clearLocationPricing = () => {
    setLocation(null);
    setDeliveryDistanceKm(null);
    setCalculatedDeliveryFee(null);
  };

  const whatsappNumber =
    settings?.whatsapp_number ||
    settings?.restaurant_whatsapp ||
    settings?.whatsapp ||
    "212600000000";

  const startGpsLocation = () => {
    setLocationMode("gps");
    clearLocationPricing();
    setGeocodeError(null);
    setManualAddress("");
    setMapsLinkInput("");
    setCoordsInput("");
    setResolvedManualLocationText("");
    setIsCapturing(true);
    setLocationError(null);

    if (!("geolocation" in navigator)) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      setIsCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCoordsAndFee(position.coords.latitude, position.coords.longitude);
        setIsCapturing(false);
      },
      (geoError) => {
        console.warn("Geolocation error:", geoError);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setLocationError(
            "Localisation refusée. Veuillez entrer votre adresse manuellement."
          );
        } else {
          setLocationError("Erreur de localisation. Veuillez réessayer ou saisir votre adresse.");
        }
        setIsCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const geocodeManualAddress = async () => {
    setGeocodeError(null);
    const trimmed = manualAddress.trim();
    if (!trimmed) return;

    setIsGeocoding(true);
    try {
      const lowered = trimmed.toLowerCase();
      const hasCity = lowered.includes("fès") || lowered.includes("fes");
      const hasCountry = lowered.includes("morocco") || lowered.includes("maroc");
      const normalizedAddress =
        hasCity || hasCountry ? trimmed : `${trimmed}, Fès, Morocco`;
      console.log("Normalized geocode query:", normalizedAddress);

      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        normalizedAddress
      )}`;
      const res = await fetch(url);
      if (!res.ok) {
        setGeocodeError("Erreur de localisation");
        return;
      }
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        setGeocodeError("Adresse introuvable");
        return;
      }

      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setGeocodeError("Adresse introuvable");
        return;
      }

      setLocationMode("manual");
      setResolvedManualLocationText(normalizedAddress);
      applyCoordsAndFee(lat, lng);
    } catch (e) {
      console.error("Geocoding failed:", e);
      setGeocodeError("Erreur de localisation");
    } finally {
      setIsGeocoding(false);
    }
  };

  const extractCoordsFromGoogleMapsLink = (link: string) => {
    const trimmed = link.trim();
    if (!trimmed) return null;

    const atMatch = trimmed.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
    if (atMatch) {
      return { lat: Number(atMatch[1]), lng: Number(atMatch[3]) };
    }

    const qMatch = trimmed.match(/[?&]q=(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
    if (qMatch) {
      return { lat: Number(qMatch[1]), lng: Number(qMatch[3]) };
    }

    return null;
  };

  const useGoogleMapsLink = () => {
    setGeocodeError(null);
    const coords = extractCoordsFromGoogleMapsLink(mapsLinkInput);
    if (!coords || Number.isNaN(coords.lat) || Number.isNaN(coords.lng)) {
      setGeocodeError("Adresse introuvable");
      return;
    }

    setLocationMode("manual");
    setResolvedManualLocationText(mapsLinkInput.trim());
    applyCoordsAndFee(coords.lat, coords.lng);
  };

  const useLatLngInput = () => {
    setGeocodeError(null);
    const trimmed = coordsInput.trim();
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length !== 2) {
      setGeocodeError("Adresse introuvable");
      return;
    }

    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setGeocodeError("Adresse introuvable");
      return;
    }

    setLocationMode("manual");
    setResolvedManualLocationText(trimmed);
    applyCoordsAndFee(lat, lng);
  };

  const resetCheckoutState = () => {
    setCheckoutStep(1);
    setPaymentMethod("cash_on_delivery");
    setSelectedBank("");
    setError(null);
    setLocationMode("none");
    setManualMethod("address");
    setManualAddress("");
    setMapsLinkInput("");
    setCoordsInput("");
    setResolvedManualLocationText("");
    setGeocodeError(null);
    setIsGeocoding(false);
    clearLocationPricing();
    setLocationError(null);
    setIsCapturing(false);
  };

  const goToPaymentStep = () => {
    if (!name || !phone || !location || calculatedDeliveryFee === null || deliveryDistanceKm === null) {
      alert(
        "Veuillez remplir tous les champs, définir votre localisation et attendre le calcul des frais de livraison."
      );
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
      alert(settings?.closed_message || "Le restaurant est actuellement fermé.");
      return;
    }

    setCheckoutStep(2);
  };

  const buildWhatsAppMessage = () => {
    const itemsText = items
      .map(
        (item, index) =>
          `${index + 1}- ${item.name}${item.size_name ? ` (${item.size_name})` : ""} x${item.quantity} = ${
            item.price * item.quantity
          } MAD`
      )
      .join("\n");

    const paymentLabel =
      paymentMethod === "online" ? "Paiement en ligne" : "Cache à la livraison";

    const bankLine =
      paymentMethod === "online" && selectedBank
        ? `\n🏦 Banque: ${selectedBank}`
        : "";

    const locationLine = location
      ? `\n📍 Localisation: https://www.google.com/maps?q=${location.lat},${location.lng}`
      : "";

    return `🍔 *NOUVELLE COMMANDE F-QUICK*

👤 Nom: ${name}
📞 Téléphone: ${phone}
💳 Méthode de paiement: ${paymentLabel}${bankLine}

🛒 *Commande:*
${itemsText}

💰 Sous-total: ${subtotal} MAD
🚚 Livraison: ${deliveryFee} MAD
✅ Total: ${total} MAD${locationLine}`;
  };

  const openWhatsApp = () => {
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleCheckout = async () => {
    if (!name || !phone || !location || calculatedDeliveryFee === null || deliveryDistanceKm === null) {
      alert(
        "Veuillez remplir tous les champs, définir votre localisation et attendre le calcul des frais de livraison."
      );
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
      alert(settings?.closed_message || "Le restaurant est actuellement fermé.");
      return;
    }

    if (paymentMethod === "online" && !selectedBank) {
      alert("Veuillez sélectionner votre banque.");
      return;
    }

    setIsOrdering(true);
    setError(null);

    try {
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

      if (clientError) throw clientError;

      let clientId = clientData?.id;

      if (!clientId) {
        const { data: newClient, error: createClientError } = await supabase
          .from("clients")
          .insert([{ full_name: name, phone }])
          .select()
          .single();

        if (createClientError) throw createClientError;
        clientId = newClient.id;
      }

      const trackingCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      const orderTotal = subtotal + calculatedDeliveryFee;

      const ordersInsertPayload: any = {
        client_id: clientId,
        customer_name: name,
        customer_phone: phone,
        latitude: location.lat,
        longitude: location.lng,
        total: orderTotal,
        delivery_fee: calculatedDeliveryFee,
        delivery_distance_km: deliveryDistanceKm,
        manual_address:
          locationMode === "manual"
            ? resolvedManualLocationText || manualAddress.trim() || mapsLinkInput.trim() || coordsInput.trim() || null
            : null,
        status: "pending",
        tracking_code: trackingCode,
        payment_method: paymentMethod,
        payment_status: "pending",
        payment_bank: paymentMethod === "online" ? selectedBank : null
      };

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([ordersInsertPayload])
        .select()
        .single();

      let createdOrder = order;

      if (orderError) {
        console.error(
          "Order insert failed (delivery fields). Retrying without them:",
          orderError
        );

        const safeOrdersInsertPayload: any = {
          client_id: clientId,
          customer_name: name,
          customer_phone: phone,
          latitude: location.lat,
          longitude: location.lng,
          total: orderTotal,
          status: "pending",
          tracking_code: trackingCode,
          payment_method: paymentMethod,
          payment_status: "pending",
          payment_bank: paymentMethod === "online" ? selectedBank : null
        };

        const { data: retryOrder, error: retryOrderError } = await supabase
          .from("orders")
          .insert([safeOrdersInsertPayload])
          .select()
          .single();

        if (retryOrderError) throw retryOrderError;
        createdOrder = retryOrder;
      }

      if (!createdOrder) throw new Error("Order creation returned no data.");
      console.log("Created order:", createdOrder);

      const orderItems = items.map((item) => ({
        order_id: createdOrder.id,
        product_id: item.product_id,
        product_name: item.name,
        size_name: item.size_name,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        item_type: item.item_type
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create an admin notification entry without blocking checkout flow.
      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .insert([
          {
            title: "Nouvelle commande",
            message: `Nouvelle commande reçue - Commande #${createdOrder.id}`,
            type: "new_order",
            is_read: false,
            order_id: createdOrder.id
          }
        ])
        .select();

      console.log("Notification insert result:", notificationData, notificationError);

      if (notificationError) {
        console.error("Notification insert failed:", notificationError);
      }

      if (paymentMethod === "online") {
        openWhatsApp();
      }

      setIsSuccess(true);
      onClearCart();

      setTimeout(() => {
        setIsSuccess(false);
        setIsModalOpen(false);
        resetCheckoutState();
        onClose();
        navigate(`/tracking/${createdOrder.id}`);
      }, 1500);
    } catch (err: any) {
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
        onClick={(e) => e.stopPropagation()}
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
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 group">
                    <div className="flex-1">
                      <h4 className="font-bold text-white group-hover:text-[#FFD000] transition-colors">
                        {item.name}
                        {item.size_name && (
                          <span className="ml-2 text-xs text-gray-500 font-medium">
                            ({item.size_name})
                          </span>
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

              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-[#FFD000]" size={16} />
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
                    Complétez votre repas
                  </h4>
                </div>

                <div className="grid gap-3">
                  {SUGGESTIONS.filter((s) => !items.find((i) => i.id === s.id)).map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => onAddToCart(suggestion, suggestion.sizes[0])}
                      className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                    >
                      <div className="text-left">
                        <p className="text-sm font-bold">{suggestion.name}</p>
                        <p className="text-xs text-[#FFD000] font-black">
                          {suggestion.sizes[0]?.price || 0} MAD
                        </p>
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
              onClick={() => {
                resetCheckoutState();
                setIsModalOpen(true);
              }}
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
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black">
                  {checkoutStep === 1 ? "FINALISER LA COMMANDE" : "MODE DE PAIEMENT"}
                </h3>
                <p className="text-gray-500 font-medium text-sm">
                  {checkoutStep === 1
                    ? "Veuillez entrer vos informations de livraison"
                    : "Choisissez votre méthode de paiement"}
                </p>
              </div>

              {isSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-[#FFD000] rounded-full flex items-center justify-center mx-auto text-black">
                    <Sparkles size={40} />
                  </div>
                  <h4 className="text-xl font-black">COMMANDE RÉUSSIE !</h4>
                  <p className="text-gray-500">
                    {paymentMethod === "online"
                      ? "Redirection WhatsApp en cours..."
                      : "Votre commande a été enregistrée avec succès."}
                  </p>
                </div>
              ) : (
                <>
                  {checkoutStep === 1 && (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            NOM COMPLET
                          </label>
                          <input
                            type="text"
                            placeholder="Votre nom..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            TÉLÉPHONE
                          </label>
                          <input
                            type="tel"
                            placeholder="06..."
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">
                            LOCALISATION
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                              type="button"
                              onClick={startGpsLocation}
                              disabled={isCapturing}
                              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border font-bold transition-all text-sm ${
                                locationMode === "gps" && location
                                  ? "bg-green-500/10 border-green-500/50 text-green-500"
                                  : "bg-black border-white/10 text-white hover:border-[#FFD000]"
                              }`}
                            >
                              <MapPin size={18} className={isCapturing ? "animate-bounce" : ""} />
                              {isCapturing ? "RECHERCHE..." : "Partager ma localisation"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLocationMode("manual");
                                clearLocationPricing();
                                setLocationError(null);
                                setGeocodeError(null);
                                setResolvedManualLocationText("");
                              }}
                              className={`flex items-center justify-center gap-2 px-4 py-4 rounded-xl border font-bold transition-all text-sm ${
                                locationMode === "manual"
                                  ? "bg-[#FFD000]/10 border-[#FFD000]/50 text-[#FFD000]"
                                  : "bg-black border-white/10 text-white hover:border-[#FFD000]"
                              }`}
                            >
                              Entrer adresse manuellement
                            </button>
                          </div>

                          {locationMode === "manual" && (
                            <div className="mt-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualMethod("address");
                                    setGeocodeError(null);
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                                    manualMethod === "address"
                                      ? "bg-[#FFD000]/10 border-[#FFD000]/50 text-[#FFD000]"
                                      : "bg-black border-white/10 text-white"
                                  }`}
                                >
                                  Adresse
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualMethod("maps_link");
                                    setGeocodeError(null);
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                                    manualMethod === "maps_link"
                                      ? "bg-[#FFD000]/10 border-[#FFD000]/50 text-[#FFD000]"
                                      : "bg-black border-white/10 text-white"
                                  }`}
                                >
                                  Lien Google Maps
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualMethod("coords");
                                    setGeocodeError(null);
                                  }}
                                  className={`px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                                    manualMethod === "coords"
                                      ? "bg-[#FFD000]/10 border-[#FFD000]/50 text-[#FFD000]"
                                      : "bg-black border-white/10 text-white"
                                  }`}
                                >
                                  Lat/Lng
                                </button>
                              </div>

                              {manualMethod === "address" && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Votre adresse complète..."
                                    value={manualAddress}
                                    onChange={(e) => setManualAddress(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      void geocodeManualAddress();
                                    }}
                                    disabled={isGeocoding || !manualAddress.trim()}
                                    className="w-full bg-white/10 border border-white/10 text-white py-3 rounded-xl font-black text-sm hover:border-[#FFD000] transition-all disabled:opacity-40"
                                  >
                                    {isGeocoding ? "RECHERCHE..." : "Valider l'adresse"}
                                  </button>
                                </>
                              )}

                              {manualMethod === "maps_link" && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Collez le lien Google Maps..."
                                    value={mapsLinkInput}
                                    onChange={(e) => setMapsLinkInput(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={useGoogleMapsLink}
                                    disabled={!mapsLinkInput.trim()}
                                    className="w-full bg-white/10 border border-white/10 text-white py-3 rounded-xl font-black text-sm hover:border-[#FFD000] transition-all disabled:opacity-40"
                                  >
                                    Valider le lien
                                  </button>
                                </>
                              )}

                              {manualMethod === "coords" && (
                                <>
                                  <input
                                    type="text"
                                    placeholder="Ex: 34.0331,-5.0003"
                                    value={coordsInput}
                                    onChange={(e) => setCoordsInput(e.target.value)}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:border-[#FFD000] outline-none transition-all font-bold text-sm"
                                  />
                                  <button
                                    type="button"
                                    onClick={useLatLngInput}
                                    disabled={!coordsInput.trim()}
                                    className="w-full bg-white/10 border border-white/10 text-white py-3 rounded-xl font-black text-sm hover:border-[#FFD000] transition-all disabled:opacity-40"
                                  >
                                    Valider les coordonnées
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {calculatedDeliveryFee !== null &&
                            deliveryDistanceKm !== null &&
                            location && (
                              <div className="mt-4 space-y-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                <p className="text-sm font-black text-white">
                                  Distance: {deliveryDistanceKm.toFixed(2)} km
                                </p>
                                <p className="text-sm font-black text-[#FFD000]">
                                  Livraison: {calculatedDeliveryFee} MAD
                                </p>
                              </div>
                            )}

                          {locationError && (
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 text-center">
                              {locationError}
                            </p>
                          )}
                          {geocodeError && (
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 text-center">
                              {geocodeError}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <button
                          onClick={goToPaymentStep}
                          disabled={
                            !name ||
                            !phone ||
                            !location ||
                            calculatedDeliveryFee === null ||
                            deliveryDistanceKm === null
                          }
                          className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                          CONTINUER <ChevronRight size={20} />
                        </button>

                        <button
                          onClick={() => {
                            setIsModalOpen(false);
                            resetCheckoutState();
                          }}
                          disabled={isOrdering}
                          className="w-full text-gray-500 font-black text-sm hover:text-white transition-colors"
                        >
                          ANNULER
                        </button>
                      </div>
                    </>
                  )}

                  {checkoutStep === 2 && (
                    <>
                      <div className="space-y-4">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("cash_on_delivery")}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            paymentMethod === "cash_on_delivery"
                              ? "border-[#FFD000] bg-[#FFD000]/10"
                              : "border-white/10 bg-black hover:border-[#FFD000]/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                              <Wallet size={20} className="text-[#FFD000]" />
                            </div>
                            <div>
                              <p className="font-black">Cache à la livraison</p>
                              <p className="text-xs text-gray-500 font-bold">
                                Le client paie à la réception
                              </p>
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentMethod("online")}
                          className={`w-full text-left p-4 rounded-2xl border transition-all ${
                            paymentMethod === "online"
                              ? "border-[#FFD000] bg-[#FFD000]/10"
                              : "border-white/10 bg-black hover:border-[#FFD000]/40"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center">
                              <CreditCard size={20} className="text-[#FFD000]" />
                            </div>
                            <div>
                              <p className="font-black">Paiement en ligne</p>
                              <p className="text-xs text-gray-500 font-bold">
                                WhatsApp avec banque sélectionnée
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>

                      {paymentMethod === "online" && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Landmark size={16} className="text-[#FFD000]" />
                            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              Choisissez votre banque
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1">
                            {MOROCCAN_BANKS.map((bank) => (
                              <button
                                key={bank}
                                type="button"
                                onClick={() => setSelectedBank(bank)}
                                className={`p-3 rounded-2xl border text-left transition-all text-sm font-black ${
                                  selectedBank === bank
                                    ? "border-[#FFD000] bg-[#FFD000] text-black"
                                    : "border-white/10 bg-black hover:border-[#FFD000]/40 text-white"
                                }`}
                              >
                                {bank}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-400">
                          <span>Total commande</span>
                          <span>{total} MAD</span>
                        </div>
                        <div className="flex items-center justify-between text-sm font-bold text-gray-400">
                          <span>Méthode</span>
                          <span className="text-white">
                            {paymentMethod === "cash_on_delivery"
                              ? "Cash à la livraison"
                              : "Paiement en ligne"}
                          </span>
                        </div>
                        {paymentMethod === "online" && selectedBank && (
                          <div className="flex items-center justify-between text-sm font-bold text-gray-400">
                            <span>Banque</span>
                            <span className="text-white">{selectedBank}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <button
                          onClick={handleCheckout}
                          disabled={isOrdering || (paymentMethod === "online" && !selectedBank)}
                          className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100"
                        >
                          {isOrdering
                            ? "CHARGEMENT..."
                            : paymentMethod === "online"
                            ? "ENVOYER SUR WHATSAPP"
                            : "VALIDER LA COMMANDE"}
                        </button>

                        {error && (
                          <p className="text-red-500 text-xs font-bold text-center animate-pulse">
                            {error}
                          </p>
                        )}

                        <button
                          onClick={() => setCheckoutStep(1)}
                          disabled={isOrdering}
                          className="w-full text-gray-500 font-black text-sm hover:text-white transition-colors"
                        >
                          RETOUR
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}