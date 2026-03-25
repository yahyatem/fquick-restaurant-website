import { MapPin, Phone, Clock, Instagram, Facebook } from "lucide-react";
import { BUSINESS_INFO } from "../constants";

export default function Contact() {
  return (
    <section id="contact" className="py-24 px-6 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8">NOUS <span className="text-[#FFD000]">TROUVER</span></h2>
            
            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="bg-[#FFD000] p-4 rounded-2xl text-black">
                  <MapPin size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">ADRESSE</h4>
                  <p className="text-gray-400 font-medium">{BUSINESS_INFO.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="bg-[#FFD000] p-4 rounded-2xl text-black">
                  <Phone size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">TÉLÉPHONE</h4>
                  <p className="text-gray-400 font-medium">{BUSINESS_INFO.phone}</p>
                </div>
              </div>

              <div className="flex items-start gap-6">
                <div className="bg-[#FFD000] p-4 rounded-2xl text-black">
                  <Clock size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black mb-1">HORAIRES</h4>
                  <p className="text-gray-400 font-medium">Ouvert tous les jours de 11:00 à 00:00</p>
                </div>
              </div>
            </div>

            <div className="mt-12 flex gap-4">
              <a href="#" className="p-4 bg-white/5 rounded-2xl hover:bg-[#FFD000] hover:text-black transition-all">
                <Instagram size={24} />
              </a>
              <a href="#" className="p-4 bg-white/5 rounded-2xl hover:bg-[#FFD000] hover:text-black transition-all">
                <Facebook size={24} />
              </a>
            </div>
          </div>

          <div className="relative aspect-square md:aspect-video lg:aspect-square rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-[#FFD000]/5">
            <iframe 
              src="https://www.google.com/maps?q=F-Quick%2C%202%20Zohour%2C%20Avenue%20Chenguit%2C%20Fes%2C%20Morocco&output=embed"
              width="100%" 
              height="100%" 
              style={{ border: 0 }} 
              allowFullScreen={true}
              loading="lazy"
              title="F-Quick Location"
              className="grayscale invert contrast-125 opacity-80 hover:opacity-100 transition-opacity"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
