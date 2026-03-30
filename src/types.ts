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
  product_id: string | null;
  name: string;
  size_name: string;
  price: number;
  quantity: number;
  item_type: 'product' | 'extra';
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
  livreurs?: { full_name: string };
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  size_name?: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  item_type: 'product' | 'extra';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  value: string;
  is_active: boolean;
  created_at: string;
}

export interface Settings {
  id: string;
  key: string;
  value: any;
  updated_at: string;
}
