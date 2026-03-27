import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { ShoppingCart, Menu as MenuIcon, X, Phone, MapPin, LayoutDashboard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem, MenuItem } from "./types";
import { BUSINESS_INFO } from "./constants";
import Hero from "./components/Hero";
import Menu from "./components/Menu";
import Cart from "./components/Cart";
import Contact from "./components/Contact";
import AdminLogin from "./components/AdminLogin";
import AdminDashboard from "./components/AdminDashboard";
import LivreurLogin from "./components/LivreurLogin";
import LivreurRegistration from "./components/LivreurRegistration";
import LivreurPage from "./components/LivreurPage";
import TrackingPage from "./components/TrackingPage";
import { cn } from "./lib/utils";

function Navbar({ cartCount, onOpenCart }: { cartCount: number; onOpenCart: () => void }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith("/admin");
  const isLivreurPage = location.pathname.startsWith("/livreur");
  const isTrackingPage = location.pathname.startsWith("/tracking");

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isAdminPage || isLivreurPage || isTrackingPage) return null;

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-4",
      isScrolled ? "bg-black/90 backdrop-blur-md py-3 shadow-lg" : "bg-transparent"
    )}>
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-black text-[#FFD000] tracking-tighter">
          F-QUICK
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#menu" className="text-white hover:text-[#FFD000] font-bold transition-colors">MENU</a>
          <a href="#contact" className="text-white hover:text-[#FFD000] font-bold transition-colors">CONTACT</a>
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-white hover:text-[#FFD000] transition-colors"
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FFD000] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile Nav Toggle */}
        <div className="flex md:hidden items-center gap-4">
          <button 
            onClick={onOpenCart}
            className="relative p-2 text-white"
          >
            <ShoppingCart size={24} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FFD000] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-black">
                {cartCount}
              </span>
            )}
          </button>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
            {isMobileMenuOpen ? <X size={28} /> : <MenuIcon size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-black border-t border-white/10 p-6 flex flex-col gap-6 md:hidden"
          >
            <a href="#menu" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-black text-white">MENU</a>
            <a href="#contact" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-black text-white">CONTACT</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <footer className="bg-black text-white py-12 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h3 className="text-2xl font-black text-[#FFD000] mb-4">F-QUICK</h3>
          <p className="text-gray-400 font-medium">Le goût de la rapidité et de la qualité à Fès.</p>
        </div>
        <div>
          <h4 className="font-bold mb-4 text-[#FFD000]">CONTACT</h4>
          <div className="space-y-2 text-gray-400">
            <p className="flex items-center gap-2"><MapPin size={16} /> {BUSINESS_INFO.address}</p>
            <p className="flex items-center gap-2"><Phone size={16} /> {BUSINESS_INFO.phone}</p>
          </div>
        </div>
        <div>
          <h4 className="font-bold mb-4 text-[#FFD000]">HORAIRES</h4>
          <p className="text-gray-400">Ouvert 7j/7 de 11:00 à 00:00</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} F-Quick. Tous droits réservés.
      </div>
    </footer>
  );
}

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const addToCart = (product: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearCart = () => setCart([]);

  return (
    <Router>
      <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#FFD000] selection:text-black">
        <Navbar cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} onOpenCart={() => setIsCartOpen(true)} />
        
        <Routes>
          <Route path="/" element={
            <main>
              <Hero />
              <Menu onAddToCart={addToCart} />
              <Contact />
            </main>
          } />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/livreur/login" element={<LivreurLogin />} />
          <Route path="/livreur/register" element={<LivreurRegistration />} />
          <Route path="/livreur" element={<LivreurPage />} />
          <Route path="/tracking/:id" element={<TrackingPage />} />
        </Routes>

        <Footer />

        <AnimatePresence>
          {isCartOpen && (
            <Cart 
              items={cart} 
              onClose={() => setIsCartOpen(false)} 
              onUpdateQuantity={updateQuantity}
              onClearCart={clearCart}
              onAddToCart={addToCart}
            />
          )}
        </AnimatePresence>
      </div>
    </Router>
  );
}
