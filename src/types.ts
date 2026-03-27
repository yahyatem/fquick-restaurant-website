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
  name: string;
  phone: string;
  latitude?: number;
  longitude?: number;
  status: 'pending' | 'accepted' | 'delivered' | 'cancelled';
  livreurId?: string;
  livreurName?: string;
  createdAt: string;
}

export interface Analytics {
  totalRevenue: number;
  orderCount: number;
  bestSellers: { name: string; count: number }[];
  topClients: { name: string; phone: string; total: number }[];
  topLivreurs: { name: string; count: number }[];
}
