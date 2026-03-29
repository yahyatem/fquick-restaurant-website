export interface ProductSize {
  id: string;
  product_id: string;
  size_name: string;
  price: number;
  is_default: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  category?: Category;
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  sizes: ProductSize[];
}

export interface CartItem {
  id: string;
  product_id: string;
  name: string;
  size_name: string;
  price: number;
  quantity: number;
}

export interface Client {
  id: string;
  full_name: string;
  phone: string;
  created_at: string;
}

export interface Livreur {
  id: string;
  full_name: string;
  phone: string;
  password?: string;
  status: 'available' | 'busy';
  created_at: string;
}

export interface Order {
  id: string;
  client_id?: string;
  livreur_id?: string;
  customer_name: string;
  customer_phone: string;
  latitude: number;
  longitude: number;
  total: number;
  status: 'pending' | 'accepted' | 'en_livraison' | 'delivered' | 'cancelled';
  tracking_code: string;
  notes?: string;
  created_at: string;
  accepted_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  size_name?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  value: string;
  is_active: boolean;
  created_at: string;
}

export interface Analytics {
  totalRevenue: number;
  orderCount: number;
  totalClients: number;
  totalLivreurs: number;
  bestSellers: { name: string; count: number }[];
  topClients: { name: string; phone: string; total: number }[];
  topLivreurs: { name: string; count: number }[];
  revenueOverTime: { date: string; revenue: number }[];
  ordersPerDay: { date: string; count: number }[];
  statusDistribution: { name: string; value: number }[];
}

export interface Settings {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}
