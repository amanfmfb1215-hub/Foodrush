/**
 * FoodRush Type Definitions
 */

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isPopular?: boolean;
  isAvailable: boolean;
  allergens?: string[];
  preparationTime?: number; // in minutes
}

export interface Review {
  id: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  avatar?: string;
  reply?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  image: string;
  bannerImage: string;
  cuisine: string[];
  rating: number;
  deliveryTime: number; // in minutes
  deliveryFee: number;
  minOrder: number;
  address: string;
  phoneNumber: string;
  isOpen: boolean;
  hours: string;
  menu: MenuItem[];
  reviews: Review[];
  isVerified: boolean;
  featured?: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'accepted' // by restaurant
  | 'preparing'
  | 'ready'
  | 'dispatched' // rider is heading to restaurant
  | 'picked_up' // rider has food and is heading to customer
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderTimeline {
  status: OrderStatus;
  timestamp: string;
  note: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  tip: number;
  total: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: string;
  status: OrderStatus;
  timeline: OrderTimeline[];
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderAvatar?: string;
  createdAt: string;
  updatedAt: string;
  deliveryNote?: string;
  prepTimeRemaining?: number; // in mins
  rating?: number; // 1-5
}

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'customer' | 'rider' | 'restaurant' | 'system';
  message: string;
  timestamp: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  vehicle: string;
  plateNumber: string;
  status: 'idle' | 'delivering' | 'offline';
  currentOrderId?: string;
  location: {
    lat: number; // 0 to 100 on our animated grid
    lng: number; // 0 to 100 on our animated grid
  };
  rating: number;
  earnings: number;
  earningsHistory: { date: string; amount: number; count: number }[];
}

export interface PlatformAnalytics {
  totalSales: number;
  totalOrders: number;
  commissionEarned: number;
  totalCustomers: number;
  totalRiders: number;
  totalRestaurants: number;
  salesData: { date: string; sales: number; orders: number }[];
  cuisinePopularity: { name: string; value: number }[];
}
