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
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  createdAt: string;
}

export interface Analytics {
  totalRevenue: number;
  orderCount: number;
  bestSellers: { name: string; count: number }[];
}
