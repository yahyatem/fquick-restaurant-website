import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Info, ShoppingBag, Loader2, Search, ChevronRight } from "lucide-react";
import { MenuItem, Category, ProductSize } from "../types";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

interface MenuProps {
  onAddToCart: (product: MenuItem, size: ProductSize) => void;
}

export default function Menu({ onAddToCart }: MenuProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          supabase.from('categories').select('*').order('order_index'),
          supabase.from('products').select('*').eq('is_active', true)
        ]);

        if (catRes.data) {
          setCategories(catRes.data);
          if (catRes.data.length > 0) setSelectedCategory(catRes.data[0].id);
        }
        if (prodRes.data) setProducts(prodRes.data);
      } catch (error) {
        console.error("Error fetching menu:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory ? p.category_id === selectedCategory : true;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-[#FFD000] animate-spin" />
          <div className="absolute inset-0 blur-xl bg-[#FFD000]/20 animate-pulse" />
        </div>
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Chargement du menu...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Search & Categories */}
      <div className="sticky top-20 z-30 bg-[#0A0A0A]/80 backdrop-blur-xl py-6 -mx-4 px-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-[#FFD000] focus:ring-1 focus:ring-[#FFD000] transition-all font-bold text-sm"
            />
          </div>

          {/* Categories Scroll */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest whitespace-nowrap transition-all border",
                  selectedCategory === cat.id
                    ? "bg-[#FFD000] text-black border-[#FFD000] shadow-lg shadow-[#FFD000]/20 scale-105"
                    : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <motion.div
              layout
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group bg-white/5 rounded-[40px] overflow-hidden border border-white/5 hover:border-[#FFD000]/30 transition-all flex flex-col h-full"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-60" />
                
                {/* Price Tag */}
                <div className="absolute bottom-6 left-6">
                  <div className="bg-[#FFD000] text-black px-4 py-2 rounded-xl font-black text-lg shadow-xl rotate-[-2deg]">
                    {product.sizes?.[0]?.price || 0} <span className="text-xs">MAD</span>
                  </div>
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-black tracking-tighter uppercase italic group-hover:text-[#FFD000] transition-colors">
                    {product.name}
                  </h3>
                  <button className="p-2 text-gray-500 hover:text-white transition-colors">
                    <Info size={20} />
                  </button>
                </div>
                
                <p className="text-gray-400 text-sm font-medium leading-relaxed mb-8 flex-1">
                  {product.description}
                </p>

                <div className="space-y-4 mt-auto">
                  {product.sizes && product.sizes.length > 1 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {product.sizes.map((size) => (
                        <button
                          key={size.size_name}
                          onClick={() => onAddToCart(product, size)}
                          className="flex flex-col items-center gap-1 p-3 bg-black/40 rounded-2xl border border-white/5 hover:border-[#FFD000] transition-all group/btn"
                        >
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/btn:text-[#FFD000]">{size.size_name}</span>
                          <span className="font-black text-sm">{size.price} MAD</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => product.sizes?.[0] && onAddToCart(product, product.sizes[0])}
                      className="w-full bg-white/5 hover:bg-[#FFD000] text-white hover:text-black py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-3 transition-all group/main shadow-xl hover:shadow-[#FFD000]/20"
                    >
                      AJOUTER AU PANIER
                      <div className="w-8 h-8 bg-white/10 group-hover/main:bg-black/10 rounded-xl flex items-center justify-center transition-colors">
                        <Plus size={18} />
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search size={32} className="text-gray-700" />
          </div>
          <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Aucun résultat trouvé</p>
        </div>
      )}
    </div>
  );
}
