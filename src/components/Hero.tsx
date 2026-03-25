import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&q=80&w=2000" 
          alt="Fast Food" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-2xl"
        >
          <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tighter mb-6">
            LE GOÛT DE LA <br />
            <span className="text-[#FFD000]">RAPIDITÉ.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 font-medium mb-10 max-w-lg">
            Découvrez nos Tacos, Pizzas et Pasticcios préparés avec passion à Fès.
          </p>
          <div className="flex flex-wrap gap-4">
            <a 
              href="#menu"
              className="bg-[#FFD000] text-black px-8 py-4 rounded-full font-black text-lg flex items-center gap-2 hover:scale-105 transition-transform"
            >
              COMMANDER MAINTENANT <ArrowRight size={20} />
            </a>
            <a 
              href="#contact"
              className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-4 rounded-full font-black text-lg hover:bg-white/20 transition-all"
            >
              NOUS TROUVER
            </a>
          </div>
        </motion.div>
      </div>

      {/* Decorative elements */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
        className="absolute -bottom-20 -right-20 w-96 h-96 bg-[#FFD000] rounded-full blur-3xl z-0"
      />
    </section>
  );
}
