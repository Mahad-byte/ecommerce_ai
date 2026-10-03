export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface PaginatedProducts {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: number;
  image_url: string;
  category: Category;
  created_at: string;
}

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  line_total: string;
}

export interface Cart {
  id: number;
  items: CartItem[];
  total_price: string;
  total_items: number;
}

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  unit_price: string;
  line_total: string;
}

export type OrderStatus = "pending" | "paid" | "cancelled";

export interface Order {
  id: number;
  status: OrderStatus;
  total: string;
  created_at: string;
  items: OrderItem[];
}

export interface ChatResponse {
  reply: string;
  products: Product[];
}

export interface RegisterResponse {
  user: {
    id: number;
    username: string;
    email: string;
  };
  access: string;
  refresh: string;
}
