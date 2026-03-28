import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "adminFquik@3") {
      localStorage.setItem("admin_token", "authenticated");
      navigate("/admin");
    } else {
      setError("Mot de passe incorrect");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#0A0A0A]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white/5 border border-white/10 rounded-[40px] p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-[#FFD000] p-4 rounded-3xl text-black mb-6">
            <Lock size={32} strokeWidth={3} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter mb-2">ADMINISTRATION</h1>
          <p className="text-gray-500 font-medium">Veuillez vous connecter pour accéder au tableau de bord.</p>
        </div>

        {isExpired && (
          <div className="bg-orange-500/10 border border-orange-500/50 text-orange-500 p-4 rounded-2xl text-xs font-black text-center uppercase tracking-widest mb-6">
            Session expirée, veuillez vous reconnecter
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">MOT DE PASSE</label>
            <input 
              type="password" 
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 focus:border-[#FFD000] outline-none transition-all font-bold text-center text-xl tracking-widest"
              autoFocus
            />
            {error && <p className="text-red-500 text-sm font-bold mt-2 text-center">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#FFD000] text-black py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-95"
          >
            SE CONNECTER <ArrowRight size={20} />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
