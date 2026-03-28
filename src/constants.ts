import { MenuItem } from "./types";

export const BUSINESS_INFO = {
  name: "F-Quick",
  address: "2 Zohour, Avenue Chenguit, Fès, Maroc",
  phone: "0631142525",
  whatsapp: "212631142525", // International format for WhatsApp
};

export const MENU_DATA: MenuItem[] = [
  // Boissons
  { id: "b1", name: "Red Bull", price: 30, category: "Boissons", image_url: "https://placehold.co/600x400/121212/ffffff?text=Red+Bull" },
  { id: "b2", name: "Pepsi", price: 15, category: "Boissons", image_url: "https://placehold.co/600x400/121212/ffffff?text=Pepsi" },
  { id: "b3", name: "Coca Cola (25cl)", price: 12, category: "Boissons", image_url: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=600" },

  // Tacos
  { id: "t1", name: "Tacos Tex Mex + Frite", price: 49, category: "Tacos", image_url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&q=80&w=600" },
  { id: "t2", name: "Tacos Végétarien + Frite", price: 44, category: "Tacos", image_url: "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?auto=format&fit=crop&q=80&w=600" },
  { id: "t3", name: "Tacos Nuggets + Frite", price: 49, category: "Tacos", image_url: "https://images.unsplash.com/photo-1562059390-a761a084768e?auto=format&fit=crop&q=80&w=600" },
  { id: "t4", name: "Tacos Kebab + Frite", price: 49, category: "Tacos", image_url: "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&q=80&w=600" },
  { id: "t5", name: "Tacos Charcuterie + Frite", price: 49, category: "Tacos", image_url: "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&q=80&w=600" },
  { id: "t6", name: "Tacos Cordon Bleu + Frite", price: 49, category: "Tacos", image_url: "https://images.unsplash.com/photo-1599974579688-8dbdd335c77f?auto=format&fit=crop&q=80&w=600" },

  // Chawarma
  { id: "c1", name: "Chawarma Grand", price: 59, category: "Chawarma", image_url: "https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&q=80&w=600" },

  // Poutine
  { id: "p1", name: "Poutine", price: 59, category: "Poutine", image_url: "https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&q=80&w=600" },

  // Sandwich
  { id: "s1", name: "Sandwich Américain", price: 49, category: "Sandwich", image_url: "https://images.unsplash.com/photo-1509722747041-619f382b73b0?auto=format&fit=crop&q=80&w=600" },
  { id: "s2", name: "Sandwich Poulet Crispy", price: 48, category: "Sandwich", image_url: "https://images.unsplash.com/photo-1550507992-eb63ffee0847?auto=format&fit=crop&q=80&w=600" },
  { id: "s3", name: "Kebab Sandwich", price: 48, category: "Sandwich", image_url: "https://images.unsplash.com/photo-1633383718081-22ac93e3dbf1?auto=format&fit=crop&q=80&w=600" },

  // Pizza
  { id: "pz1", name: "Pizza Viande Hachée", price: 49, category: "Pizza", image_url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600" },
  { id: "pz2", name: "Pizza Thon", price: 45, category: "Pizza", image_url: "https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?auto=format&fit=crop&q=80&w=600" },
  { id: "pz3", name: "Pizza Quatre Saisons", price: 60, category: "Pizza", image_url: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&q=80&w=600" },
  { id: "pz4", name: "Pizza Quatre Fromages", price: 49, category: "Pizza", image_url: "https://images.unsplash.com/photo-1548365328-8c6db3220e4c?auto=format&fit=crop&q=80&w=600" },
  { id: "pz5", name: "Pizza Fruits de Mer", price: 60, category: "Pizza", image_url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600" },
  { id: "pz6", name: "Pizza Margherita", price: 40, category: "Pizza", image_url: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?auto=format&fit=crop&q=80&w=600" },
  { id: "pz7", name: "Pizza Végétarienne", price: 45, category: "Pizza", image_url: "https://images.unsplash.com/photo-1511688855354-1261f6124509?auto=format&fit=crop&q=80&w=600" },

  // Pasticcio
  { id: "pa1", name: "Pasticcio Dinde Fumée", price: 45, category: "Pasticcio", image_url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600" },
  { id: "pa2", name: "Pasticcio Viande Hachée", price: 45, category: "Pasticcio", image_url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=600" },
  { id: "pa3", name: "Pasticcio Charcuterie", price: 45, category: "Pasticcio", image_url: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600" },
  { id: "pa4", name: "Pasticcio Poulet", price: 45, category: "Pasticcio", image_url: "https://images.unsplash.com/photo-1559058789-672da06263d8?auto=format&fit=crop&q=80&w=600" },
  { id: "pa5", name: "Pasticcio Mixte", price: 49, category: "Pasticcio", image_url: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&q=80&w=600" },
];

export const CATEGORIES = [
  "Boissons",
  "Tacos",
  "Chawarma",
  "Poutine",
  "Sandwich",
  "Pizza",
  "Pasticcio",
];
