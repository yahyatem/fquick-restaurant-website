import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Plus, Star } from "lucide-react";
import { CATEGORIES } from "../constants";
import { MenuItem } from "../types";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

// Image optimization helper
const optimizeImageUrl = (url: string) => {
  if (!url || !url.includes('unsplash.com')) return url;
  // If it already has params, don't double up
  if (url.includes('?')) return url;
  return `${url}?auto=format&fit=crop&w=500&q=80`;
};

const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const optimizedSrc = optimizeImageUrl(src);

  return (
    <div className="relative w-full h-full">
      {!isLoaded && <div className="absolute inset-0 skeleton z-10" />}
      <img 
        src={optimizedSrc} 
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        referrerPolicy="no-referrer"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600";
        }}
      />
    </div>
  );
};

export default function Menu({ onAddToCart }: { onAddToCart: (item: MenuItem) => void }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [bestSellers, setBestSellers] = useState<string[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch active products
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('is_active', true);
        
        if (productsError) throw productsError;
        setProducts(productsData || []);

        // Fetch best sellers from order_items
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('product_name');
        
        if (itemsError) throw itemsError;
        
        const productMap: Record<string, number> = {};
        itemsData?.forEach(item => {
          productMap[item.product_name] = (productMap[item.product_name] || 0) + 1;
        });
        
        const bestSellersList = Object.entries(productMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);
        
        setBestSellers(bestSellersList);
      } catch (err) {
        console.error("Error fetching menu data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredMenu = useMemo(() => 
    products.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase()),
    [products, activeCategory]
  );

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFD000] mx-auto"></div>
        <p className="mt-4 text-gray-400 font-bold">Chargement du menu...</p>
      </div>
    );
  }

  return (
    <section id="menu" className="py-24 px-6 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">NOTRE <span className="text-[#FFD000]">MENU</span></h2>
            <p className="text-gray-400 font-medium max-w-md">Sélectionnez vos plats préférés parmi nos catégories variées.</p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all",
                  activeCategory === cat 
                    ? "bg-[#FFD000] text-black" 
                    : "bg-white/5 text-white hover:bg-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredMenu.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ 
                opacity: { delay: index * 0.05 },
                y: { delay: index * 0.05 },
                scale: { duration: 0.2 },
                default: { duration: 0.2 }
              }}
              viewport={{ once: true }}
              className="group bg-white/5 border border-white/10 rounded-[32px] overflow-hidden hover:border-[#FFD000]/50 hover:shadow-[0_20px_40px_rgba(255,208,0,0.1)] transition-all flex flex-col"
            >
              {/* Product Image */}
              <div className="relative h-48 overflow-hidden">
                <ProductImage 
                  src={item.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                  alt={item.name}
                />
                <div className="absolute top-4 left-4 z-20">
                  <div className="bg-black/60 backdrop-blur-md text-[#FFD000] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider border border-white/10">
                    {item.category}
                  </div>
                </div>
                {bestSellers.includes(item.name) && (
                  <div className="absolute top-4 right-4 bg-[#FFD000] text-black p-2 rounded-full shadow-lg z-20">
                    <Star size={14} fill="currentColor" />
                  </div>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <div className="mb-4">
                  <h3 className="text-xl font-black mb-2 group-hover:text-[#FFD000] transition-colors line-clamp-1">{item.name}</h3>
                  <p className="text-gray-500 text-sm font-medium line-clamp-2">
                    Préparé avec des ingrédients frais et locaux pour un goût authentique.
                  </p>
                </div>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                  <span className="text-2xl font-black text-[#FFD000]">{item.price} <span className="text-xs">MAD</span></span>
                  <button
                    onClick={() => onAddToCart(item)}
                    className="bg-[#FFD000] text-black p-3 rounded-2xl hover:bg-white transition-all active:scale-95 shadow-lg shadow-[#FFD000]/10"
                  >
                    <Plus size={20} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
