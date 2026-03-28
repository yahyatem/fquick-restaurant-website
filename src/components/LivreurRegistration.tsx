import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Bike, User, Phone, Lock, ArrowRight, ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function LivreurRegistration() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!fullName || !phone || !password) {
      setError("Veuillez remplir tous les champs.");
      setIsLoading(false);
      return;
    }

    try {
      const { data: existingLivreur, error: checkError } = await supabase
        .from('livreurs')
        .select('id')
        .eq('phone', phone)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingLivreur) {
        setError("Ce numéro de téléphone est déjà utilisé.");
        setIsLoading(false);
        return;
      }

      const { data: newLivreur, error: insertError } = await supabase
        .from('livreurs')
        .insert([{
          full_name: fullName,
          phone,
          password,
          status: 'available'
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Automatically log in after registration
      localStorage.setItem("livreur_authenticated", "true");
      localStorage.setItem("livreur_phone", phone);
      localStorage.setItem("livreur_name", fullName);
      localStorage.setItem("livreur_id", newLivreur.id);
      
      navigate("/livreur");
    } catch (err) {
      console.error("Registration error:", err);
      setError("Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-4">
          <Link to="/livreur/login" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm font-black mb-4">
            <ChevronLeft size={16} /> RETOUR AU LOGIN
          </Link>
          <div className="w-20 h-20 bg-[#FFD000] rounded-3xl flex items-center justify-center mx-auto rotate-6 shadow-2xl shadow-[#FFD000]/20">
            <Bike className="text-black" size={40} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-black tracking-tighter">DEVENIR LIVREUR</h1>
          <p className="text-gray-500 font-medium">Rejoignez l'équipe F-QUICK et commencez à livrer.</p>
        </div>

        <form onSubmit={handleRegister} className="bg-[#111] border border-white/10 rounded-[40px] p-8 space-y-6 shadow-2xl">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-2xl text-xs font-black text-center uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">NOM COMPLET</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FFD000] transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Votre nom..."
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">TÉLÉPHONE</label>
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FFD000] transition-colors" size={20} />
                <input 
                  type="tel" 
                  placeholder="06..."
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">MOT DE PASSE</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#FFD000] transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-4 py-4 focus:border-[#FFD000] outline-none transition-all font-bold"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FFD000] text-black py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-xl shadow-[#FFD000]/20"
          >
            {isLoading ? "INSCRIPTION..." : "S'INSCRIRE"} <ArrowRight size={20} />
          </button>
        </form>

        <p className="text-center text-gray-500 text-sm font-bold">
          Déjà un compte ? <Link to="/livreur/login" className="text-[#FFD000] hover:underline">Se connecter</Link>
        </p>
      </motion.div>
    </div>
  );
}
