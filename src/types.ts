export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  customer_name: string;
  customer_phone: string;
  latitude?: number;
  longitude?: number;
  status: 'pending' | 'accepted' | 'en livraison' | 'delivered' | 'cancelled';
  livreur_id?: string;
  livreur_name?: string;
  created_at: string;
}

export interface Livreur {
  id: string;
  name: string;
  phone: string;
  password?: string;
  status: 'available' | 'busy';
  created_at: string;
}

export interface Analytics {
  totalRevenue: number;
  orderCount: number;
  bestSellers: { name: string; count: number }[];
  topClients: { name: string; phone: string; total: number }[];
  topLivreurs: { name: string; count: number }[];
}
