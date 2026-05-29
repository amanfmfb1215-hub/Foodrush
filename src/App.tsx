import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Clock,
  Award,
  ShoppingBag,
  ChefHat,
  Bike,
  Building,
  Search,
  Sparkles,
  TrendingUp,
  Plus,
  Minus,
  Trash2,
  Star,
  Send,
  MessageSquare,
  MapPin,
  User,
  CheckCircle,
  X,
  CreditCard,
  Wallet,
  Percent,
  ClipboardList,
  ShieldCheck,
  Activity,
  ArrowRight,
  ThumbsUp,
  ChevronRight,
  Check,
  Phone
} from 'lucide-react';
import { MenuItem, Restaurant, Order, OrderStatus, ChatMessage, Rider, PlatformAnalytics, Review, OrderItem } from './types';
import AppFooter from './components/AppFooter';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

const translateGridToLatLng = (gridLat: number, gridLng: number): { lat: number; lng: number } => {
  const minLat = 47.5950;
  const maxLat = 47.6250;
  const minLng = -122.3550;
  const maxLng = -122.3200;

  // Let's map grid (0, 0) to top-left (maxLat, minLng)
  // Grid Lat maps progress from 0% (maxLat) to 100% (minLat)
  const realLat = maxLat - (gridLat / 100) * (maxLat - minLat);
  // Grid Lng maps progress from 0% (minLng) to 100% (maxLng)
  const realLng = minLng + (gridLng / 100) * (maxLng - minLng);

  return { lat: realLat, lng: realLng };
};

export default function App() {
  // Roles toggle: Customer, Restaurant, Rider, Admin
  const [currentRole, setCurrentRole] = useState<'customer' | 'restaurant' | 'rider' | 'admin'>('customer');

  // Core synchronized states
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  // Loading and helper state
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [showOrderHistory, setShowOrderHistory] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Cart & checkout process
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; restaurantId: string }[]>(() => {
    try {
      const cached = localStorage.getItem('foodrush_cart');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [checkoutAddress, setCheckoutAddress] = useState<string>(() => localStorage.getItem('foodrush_address') || 'Suite 404, 82 Central Dr, Food District');
  const [checkoutPhone, setCheckoutPhone] = useState<string>(() => localStorage.getItem('foodrush_phone') || '+1 (555) 333-2222');
  const [driverTip, setDriverTip] = useState<number>(3);
  const [deliveryNote, setDeliveryNote] = useState<string>('Leave at the apartment lobby table.');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'jazzcash' | 'easypaisa' | 'bank'>('cod');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // AI & Chatbots state
  const [chatbotOpen, setChatbotOpen] = useState<boolean>(false);
  const [aiMessageInput, setAiMessageInput] = useState<string>('');
  const [aiChatHistory, setAiChatHistory] = useState<{ sender: 'customer' | 'ai'; message: string }[]>([]);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  
  // Custom Reviews state
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Delivery Chat (in order track view)
  const [deliveryChatInput, setDeliveryChatInput] = useState<string>('');
  const [deliveryMessages, setDeliveryMessages] = useState<ChatMessage[]>([]);

  // Admin Tab selector
  const [selectedAdminTab, setSelectedAdminTab] = useState<'restaurants' | 'live-orders' | 'analytics'>('analytics');

  // Restaurant Partner selected workspace
  const [partnerRestId, setPartnerRestId] = useState<string>('rest-1');
  const [newFoodName, setNewFoodName] = useState<string>('');
  const [newFoodPrice, setNewFoodPrice] = useState<string>('');
  const [newFoodDesc, setNewFoodDesc] = useState<string>('');
  const [newFoodCat, setNewFoodCat] = useState<string>('Burgers');
  const [newFoodImage, setNewFoodImage] = useState<string>('');

  // Auto poll data loop to capture status updates or live rider positions
  useEffect(() => {
    localStorage.setItem('foodrush_address', checkoutAddress);
  }, [checkoutAddress]);

  useEffect(() => {
    localStorage.setItem('foodrush_phone', checkoutPhone);
  }, [checkoutPhone]);

  useEffect(() => {
    localStorage.setItem('foodrush_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      silentSyncData();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Fetch contextual chats whenever a customer view is tracing a specific order
  useEffect(() => {
    if (activeOrderId) {
      fetchOrderChat(activeOrderId);
    }
  }, [activeOrderId]);

  const safeJson = async (res: Response) => {
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Non-JSON content: ${contentType || 'blank'}`);
    }
    return res.json();
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Load from localStorage first to handle weak connections
      try {
        const cachedRestaurants = localStorage.getItem('foodrush_restaurants');
        const cachedOrders = localStorage.getItem('foodrush_orders');
        const cachedRiders = localStorage.getItem('foodrush_riders');
        const cachedAnalytics = localStorage.getItem('foodrush_analytics');

        if (cachedRestaurants) setRestaurants(JSON.parse(cachedRestaurants));
        if (cachedOrders) setOrders(JSON.parse(cachedOrders));
        if (cachedRiders) setRiders(JSON.parse(cachedRiders));
        if (cachedAnalytics) setAnalytics(JSON.parse(cachedAnalytics));
      } catch (e) {
        console.warn('Failed to parse cached data', e);
      }

      const [restRes, ordersRes, ridersRes, analyticsRes] = await Promise.all([
        fetch('/api/restaurants'),
        fetch('/api/orders'),
        fetch('/api/riders'),
        fetch('/api/admin/analytics')
      ]);
      const restData = await safeJson(restRes);
      const ordersData = await safeJson(ordersRes);
      const ridersData = await safeJson(ridersRes);
      const analyticsData = await safeJson(analyticsRes);

      setRestaurants(restData);
      setOrders(ordersData);
      setRiders(ridersData);
      setAnalytics(analyticsData);

      // Update cache
      localStorage.setItem('foodrush_restaurants', JSON.stringify(restData));
      localStorage.setItem('foodrush_orders', JSON.stringify(ordersData));
      localStorage.setItem('foodrush_riders', JSON.stringify(ridersData));
      localStorage.setItem('foodrush_analytics', JSON.stringify(analyticsData));
    } catch (e) {
      console.warn('Error loading API seeds, waiting for server...', e);
    } finally {
      setLoading(false);
    }
  };

  const silentSyncData = async () => {
    try {
      const [restRes, ordersRes, ridersRes, analyticsRes] = await Promise.all([
        fetch('/api/restaurants'),
        fetch('/api/orders'),
        fetch('/api/riders'),
        fetch('/api/admin/analytics')
      ]);
      const restData = await safeJson(restRes);
      const ordersData = await safeJson(ordersRes);
      const ridersData = await safeJson(ridersRes);
      const analyticsData = await safeJson(analyticsRes);

      setRestaurants(restData);
      setOrders(ordersData);
      setRiders(ridersData);
      setAnalytics(analyticsData);

      // Silently update cache
      localStorage.setItem('foodrush_restaurants', JSON.stringify(restData));
      localStorage.setItem('foodrush_orders', JSON.stringify(ordersData));
      localStorage.setItem('foodrush_riders', JSON.stringify(ridersData));
      localStorage.setItem('foodrush_analytics', JSON.stringify(analyticsData));
    } catch (e) {
      // Gracefully silent during minor reloads
    }
  };

  const fetchOrderChat = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/chat`);
      if (res.ok) {
        setDeliveryMessages(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem, restaurantId: string) => {
    setCart((prev) => {
      // Prevent cross restaurant carts
      const hasDifferent = prev.some(c => c.restaurantId !== restaurantId);
      if (hasDifferent) {
        if (!confirm('You are ordering from a new restaurant! Clear current cart items?')) {
          return prev;
        }
        return [{ item, quantity: 1, restaurantId }];
      }
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1, restaurantId }];
    });
  };

  const updateCartQty = (itemId: string, diff: number) => {
    setCart((prev) => {
      return prev.map(c => {
        if (c.item.id === itemId) {
          const newQty = c.quantity + diff;
          return newQty <= 0 ? null : { ...c, quantity: newQty };
        }
        return c;
      }).filter((c): c is typeof prev[number] => c !== null);
    });
  };

  const clearCart = () => setCart([]);

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
    const activeRest = restaurants.find(r => r.id === cart[0]?.restaurantId);
    const deliveryFee = activeRest ? activeRest.deliveryFee : 0;
    const tax = subtotal * 0.09;
    const discount = promoApplied ? subtotal * 0.5 : 0; // 50% discount codes!
    const grandTotal = Math.max(0, subtotal + deliveryFee + tax + driverTip - discount);
    return { subtotal, deliveryFee, tax, discount, grandTotal };
  };

  const handleApplyPromo = () => {
    if (promoCode.trim().toLowerCase() === 'rush50') {
      setPromoApplied(true);
    } else {
      alert('Invalid promo! Try using code "RUSH50" for 50% discount.');
    }
  };

  // Order submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setIsPlacingOrder(true);
    const totals = getCartTotals();
    const orderBody = {
      restaurantId: cart[0].restaurantId,
      items: cart.map(c => ({
        id: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity
      })),
      customerName: 'Aman Ahmed',
      customerAddress: checkoutAddress,
      customerPhone: checkoutPhone,
      paymentMethod: paymentMethod === 'easypaisa' ? 'EasyPaisa' : paymentMethod === 'jazzcash' ? 'JazzCash' : paymentMethod === 'bank' ? `Bank Transfer (${selectedBank || 'Bank'})` : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Stripe Instant Checkout',
      tip: driverTip,
      deliveryNote: deliveryNote
    };

    try {
      // Add slight delay to highlight loading state (only for the requested subtle effect)
      await new Promise(resolve => setTimeout(resolve, 750));
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody)
      });
      if (res.ok) {
        const newlyCreated: Order = await res.json();
        // Insert and sync instantly
        setOrders(orig => [newlyCreated, ...orig]);
        setActiveOrderId(newlyCreated.id);
        clearCart();
        setCheckoutStep(false);
        setActiveRestaurantId(null);
        // Switch to Customer tracking
        alert(`Order ${newlyCreated.id} successfully placed! We've automatically notified the Chef!`);
      }
    } catch (e) {
      alert('Failed placing order.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // State drivers
  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus, riderId?: string, note?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, riderId, note })
      });
      if (res.ok) {
        const updated: Order = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        if (activeOrderId === orderId) {
          fetchOrderChat(orderId);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Chat dispatch messenger
  const handleSendChatMessage = async (orderId: string, sender: 'customer' | 'rider' | 'restaurant', msgText: string) => {
    if (!msgText.trim()) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, message: msgText })
      });
      if (res.ok) {
        const created: ChatMessage = await res.json();
        setDeliveryMessages(prev => [...prev, created]);
        if (sender === 'customer') setDeliveryChatInput('');
        if (sender === 'rider') setDeliveryChatInput('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Restaurant Partner: adding dish item
  const handleAddDish = async () => {
    if (!newFoodName || !newFoodPrice) {
      alert('Please fill out name and price.');
      return;
    }
    try {
      const res = await fetch(`/api/restaurants/${partnerRestId}/menu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFoodName,
          price: parseFloat(newFoodPrice),
          description: newFoodDesc || 'Sleek premium food item specialty.',
          category: newFoodCat,
          image: newFoodImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
          isPopular: false,
          allergens: ['Dairy'],
          preparationTime: 12
        })
      });
      if (res.ok) {
        alert('Food menu item added successfully!');
        setNewFoodName('');
        setNewFoodPrice('');
        setNewFoodDesc('');
        setNewFoodImage('');
        silentSyncData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle Restaurant verification (Admin Hub action)
  const handleVerifyRestaurantToggle = async (id: string, currentlyVerified: boolean) => {
    try {
      const res = await fetch(`/api/restaurants/${id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVerified: !currentlyVerified })
      });
      if (res.ok) {
        silentSyncData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Restaurant review
  const handleAddReview = async (restaurantId: string) => {
    if (!reviewComment.trim() || !reviewName.trim()) {
      alert('Please leave your name and comment!');
      return;
    }
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: reviewName,
          rating: reviewRating,
          comment: reviewComment
        })
      });
      if (res.ok) {
        setReviewSubmitted(true);
        setReviewComment('');
        setReviewName('');
        setReviewRating(5);
        silentSyncData();
        setTimeout(() => setReviewSubmitted(false), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Gemini Chat agent utility
  const handleAskAI = async () => {
    if (!aiMessageInput.trim()) return;
    const savedMsg = aiMessageInput;
    setAiChatHistory(prev => [...prev, { sender: 'customer', message: savedMsg }]);
    setAiMessageInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: savedMsg,
          chatHistory: aiChatHistory.map(h => ({
            sender: h.sender === 'customer' ? 'customer' : 'system',
            message: h.message
          }))
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiChatHistory(prev => [...prev, { sender: 'ai', message: data.text }]);
      } else {
        setAiChatHistory(prev => [...prev, { sender: 'ai', message: 'Demo offline response: Sorry, I experienced an online routing failure. Setup actual keys for complete execution.' }]);
      }
    } catch (e) {
      setAiChatHistory(prev => [...prev, { sender: 'ai', message: 'Could not resolve backend AI. Check status and try again.' }]);
    } finally {
      setAiLoading(false);
    }
  };

  // AI Instant food recommendation generator (Home Page widget)
  const handleFetchQuickPredict = async (pref: string) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preference: pref })
      });
      const data = await res.json();
      alert(`🍕 FoodRush AI Predictor:\n\n${data.reason}`);
    } catch (e) {
      alert('Failure fetching AI predictions.');
    } finally {
      setAiLoading(false);
    }
  };

  // Filtering restaurant cards list
  const filteredRestaurants = restaurants.filter(r => {
    const matchCategory = !selectedCategory || r.cuisine.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
    const matchSearch = !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.cuisine.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div id="foodrush-app-container" className="min-h-screen bg-zinc-50 flex flex-col font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      
      {/* GLOBAL BANNER SIMULATORS SWITCHER: Elegant interactive tool belt */}
      <div id="role-switcher" className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 text-white py-2.5 px-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[10px] font-bold">R</div>
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-400">Environment Sandbox Workspace</span>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1 border border-zinc-700">
          <button
            onClick={() => { setCurrentRole('customer'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${currentRole === 'customer' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Compass className="w-3.5 h-3.5" /> Customer View
          </button>
          <button
            onClick={() => { setCurrentRole('restaurant'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${currentRole === 'restaurant' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <ChefHat className="w-3.5 h-3.5" /> Restaurant Panel
          </button>
          <button
            onClick={() => { setCurrentRole('rider'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${currentRole === 'rider' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Bike className="w-3.5 h-3.5" /> Delivery Rider App
          </button>
          <button
            onClick={() => { setCurrentRole('admin'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${currentRole === 'admin' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Building className="w-3.5 h-3.5" /> Admin Dashboard
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Node Service Online (Port 3000)</span>
        </div>
      </div>

      {/* SLEEK MAIN PREMIUM FRAMEWORK */}
      <div className="flex-1 flex flex-col">
        
        {/* PREMIUM SHARED HEADER ELEMENT */}
        <header id="app-header" className="h-20 bg-white border-b border-zinc-200 px-6 flex items-center justify-between flex-none">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="FoodRush" className="w-10 h-10 rounded-xl object-cover" />
<span className="text-2xl font-black tracking-tighter text-orange-600">FoodRush</span>
            
            {/* Real Address locator display matching Sleek style */}
            <div className="hidden md:flex items-center bg-zinc-100 rounded-full px-4 py-1.5 gap-2 border border-zinc-200">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-zinc-800">Seattle HQ • 4th Avenue</span>
              <span className="text-[10px] text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-200">Suite 404</span>
           </div>
          <div className="flex-1 max-w-sm mx-8 hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search dishes, tacos, burger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-orange-500/20 text-slate-900"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 w-4 h-4 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              id="ai-assistant-toggle"
              onClick={() => setChatbotOpen(true)}
              className="flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-3 py-1 text-xs font-bold hover:bg-orange-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>Ask AI Chatbot</span>
            </button>

            {/* Micro layout cart pointer trigger */}
            <button 
              onClick={() => { setCurrentRole('customer'); setIsCartOpen(!isCartOpen); }}
              className="relative p-2 text-zinc-600 bg-zinc-100 rounded-full hover:bg-zinc-200/80 transition-all"
            >
              <ShoppingBag className="w-5 h-5 text-zinc-700" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-black">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </button>

            <div className="w-9 h-9 rounded-full bg-orange-100 border-2 border-orange-200 overflow-hidden flex items-center justify-center text-xs font-bold text-orange-700">
              U
            </div>
          </div>
        </div>
        {/* ==========================================
            ROLE VIEW PORTALS (Customer, Restaurant, Rider, Admin)
            ========================================== */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* CUSTOMER PORTAL */}
          {currentRole === 'customer' && (
            <div id="customer-portal-view" className="flex-1 flex overflow-hidden relative">
              
              {/* Left sidebar nav matching theme */}
              <aside className="w-60 border-r border-zinc-200 bg-white p-5 flex flex-col gap-6 flex-none hidden lg:flex">
                <nav className="flex flex-col gap-1.5">
                  <button
                    onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(false); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${!activeRestaurantId && !activeOrderId && !showOrderHistory ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Compass className="w-4 h-4" /> Discover Restaurants
                  </button>
                  <button
                    onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(true); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${showOrderHistory ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Clock className="w-4 h-4" /> Order History
                  </button>

                  <div className="text-[10px] font-black tracking-wider uppercase text-zinc-400 mt-4 px-4">Your Recent Orders</div>
                  
                  {orders.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 px-4 py-2 italic">No order sessions created yet.</div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {orders.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => { setActiveOrderId(order.id); setActiveRestaurantId(null); setShowOrderHistory(false); }}
                          className={`flex flex-col text-left px-4 py-2 rounded-xl border transition-all ${activeOrderId === order.id ? 'bg-orange-100/55 border-orange-200 text-orange-950 font-semibold' : 'border-transparent text-zinc-600 hover:bg-zinc-50'}`}
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[11px] font-mono font-bold text-zinc-500 uppercase">#{order.id}</span>
                            <span className="text-[9px] bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-700 uppercase">{order.status}</span>
                          </div>
                          <span className="text-xs truncate font-medium mt-0.5">{order.restaurantName}</span>
                          <span className="text-[10px] text-zinc-400">Total: ${order.total.toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </nav>

                <div className="mt-auto p-4 bg-zinc-900 rounded-2xl text-white">
                  <div className="flex items-center gap-1 bg-white/10 w-fit text-[9px] px-1.5 py-0.5 rounded font-black mb-2 select-none text-orange-400">ACTIVE CAMPAIGN</div>
                  <h5 className="font-bold text-xs">Unlock 50% Off!</h5>
                  <p className="text-[11px] text-zinc-300 mt-1 mb-2 leading-relaxed">Apply code <span className="font-mono bg-zinc-800 text-yellow-300 px-1 py-0.5 rounded">RUSH50</span> on your draft cart checkout!</p>
                  <button 
                    onClick={() => { setPromoCode('RUSH50'); }}
                    className="text-[10px] w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-1.5 rounded-lg transition-colors"
                  >
                    Activate Coupon
                  </button>
                </div>
              </aside>

              {/* Central Panel Area */}
              <main className="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* 1. Discover List View */}
                {!activeRestaurantId && !activeOrderId && !showOrderHistory && (
                  <>
                    {/* Sleek Gradient Banner */}
                    <section id="promo-banner" className="h-44 bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-6.5 flex justify-between items-center text-white relative overflow-hidden flex-none shadow-sm">
                      <div className="z-10 max-w-md relative">
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold mb-3.5 backdrop-blur-md uppercase tracking-wider">AI Recommendation & Smart Delivery</span>
                        <h2 className="text-3xl font-black mb-1.5 leading-tight tracking-tight">FoodRush Lightning Speeds</h2>
                        <p className="text-xs text-orange-100 mb-3 font-medium">Enjoy secure contactless handshakes, full GPS navigation, and customized chef recommendations.</p>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleFetchQuickPredict('healthy')}
                            className="bg-white/10 hover:bg-white/20 transition px-3 py-1 text-[11px] rounded-lg font-bold border border-white/20"
                          >
                            ☘️ Healthy Acai Bowl Suggestions
                          </button>
                          <button
                            onClick={() => handleFetchQuickPredict('indulgent')}
                            className="bg-white/10 hover:bg-white/20 transition px-3 py-1 text-[11px] rounded-lg font-bold border border-white/20"
                          >
                            🍔 Truffle Cheeseburger Matcher
                          </button>
                        </div>
                      </div>
                      <div className="absolute right-[-10px] top-[-10px] w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="z-10 bg-white/15 backdrop-blur-xl p-4 rounded-2xl border border-white/20 text-white hidden md:block">
                        <p className="text-[10px] opacity-90 uppercase tracking-widest font-black">Trending Spot</p>
                        <p className="font-extrabold text-sm">BurgerBite Co.</p>
                        <div className="flex items-center gap-1 mt-1 text-yellow-300">
                          <Star className="w-3.5 h-3.5 fill-current text-yellow-300" />
                          <span className="text-xs font-bold text-white">4.8 Rating</span>
                        </div>
                      </div>
                    </section>

                    {/* Category Carousel filter */}
                    <section id="categories-sec" className="flex-none">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base font-bold text-slate-800">Explore Cuisines & Snacks</h3>
                        {selectedCategory && (
                          <button onClick={() => setSelectedCategory(null)} className="text-xs text-orange-600 hover:text-orange-700 font-bold">Clear Filters</button>
                        )}
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {[
                          { emoji: '🇵🇰', name: 'Pakistani' },
                          { emoji: '🍚', name: 'Biryani' },
                          { emoji: '🍢', name: 'Kebab' },
                          { emoji: '🍔', name: 'Burgers' },
                          { emoji: '🥗', name: 'Salads' },
                          { emoji: '🍣', name: 'Sushi' },
                          { emoji: '🍟', name: 'Sides' },
                          { emoji: '🌱', name: 'Vegan' },
                          { emoji: '🍝', name: 'Pasta' },
                          { emoji: '🍵', name: 'Drinks' }
                        ].map((cat) => (
                          <button
                            key={cat.name}
                            onClick={() => {
                              setSelectedCategory(selectedCategory === cat.name ? null : cat.name);
                            }}
                            className={`flex flex-1 min-w-[110px] p-3 rounded-2xl border transition-all items-center gap-3 cursor-pointer text-left ${selectedCategory === cat.name ? 'bg-orange-600 border-orange-600 text-white shadow-md shadow-orange-600/10' : 'bg-white border-zinc-200 hover:border-orange-300'}`}
                          >
                            <span className="text-2xl">{cat.emoji}</span>
                            <span className="font-bold text-xs truncate">{cat.name}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    {/* Restaurants List matching Design spec */}
                    <section id="restaurants-sec" className="flex-1 min-h-0">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-base font-bold text-slate-800">
                          {selectedCategory ? `${selectedCategory} Specialty Spots` : 'Popular Spots Near You'} ({filteredRestaurants.length})
                        </h3>
                        <span className="text-xs text-zinc-400 font-medium">Standard Delivery Rates Apply</span>
                      </div>

                      {filteredRestaurants.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500 italic">
                          No restaurants found matching your active cuisine or search keys.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
                          {filteredRestaurants.map((rest) => (
                            <div
                              key={rest.id}
                              onClick={() => { setActiveRestaurantId(rest.id); }}
                              className="bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group"
                            >
                              <div className="h-40 bg-zinc-100 relative overflow-hidden">
                                <img
                                  src={rest.image}
                                  alt={rest.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-sm text-slate-900 border border-zinc-200">
                                  <Star className="w-3.5 h-3.5 text-orange-500 fill-current" />
                                  {rest.rating}
                                </div>
                                {!rest.isVerified && (
                                  <div className="absolute top-3 left-3 bg-zinc-900/90 text-[10px] text-zinc-300 font-bold px-2 py-1 rounded-lg">
                                    PENDING APPROVAL
                                  </div>
                                )}
                                {rest.featured && (
                                  <div className="absolute bottom-3 left-3 bg-orange-600 text-[10px] text-white font-extrabold px-2 py-0.5 rounded-lg">
                                    FEATURED BESTSELLER
                                  </div>
                                )}
                              </div>
                              <div className="p-4.5 flex flex-col gap-1.5 bg-white">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-orange-600 transition-colors flex items-center gap-1.5">
                                    {rest.name}
                                    {rest.isVerified && (
                                      <span className="w-4 h-4 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-[10px]" title="Chef Verified Spot">✓</span>
                                    )}
                                  </h4>
                                  <span className="text-xs text-zinc-500 font-bold bg-zinc-100 px-2.5 py-0.5 rounded-full">{rest.deliveryTime} mins</span>
                                </div>
                                <p className="text-xs text-zinc-400 italic font-medium">{rest.cuisine.join(' • ')}</p>
                                <div className="text-[11px] text-zinc-500">{rest.address}</div>
                                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                                  <span className="text-[10px] bg-green-50 text-green-700 font-black px-2 py-0.5 rounded-md">FREE DELIVERY</span>
                                  <span className="text-[10px] bg-zinc-100 text-slate-700 font-bold px-2 py-0.5 rounded text-zinc-600 uppercase">Min ${rest.minOrder}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  </>
                )}

                {/* 1.5 Order History View */}
                {showOrderHistory && !activeRestaurantId && !activeOrderId && (
                  <div className="flex flex-col gap-6">
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
                        <h2 className="text-xl font-black text-slate-800">Order History</h2>
                      </div>
                      
                      {orders.length === 0 ? (
                        <div className="text-center py-10 text-zinc-400">
                          <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p className="font-semibold text-zinc-600">No past orders found.</p>
                          <p className="text-xs">Explore restaurants and place your first order!</p>
                          <button
                            onClick={() => setShowOrderHistory(false)}
                            className="mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-6 rounded-xl transition-colors text-xs"
                          >
                            Explore Restaurants
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          {[...orders].reverse().map((order) => {
                            const rest = restaurants.find(r => r.id === order.restaurantId);
                            return (
                              <div key={order.id} className="border border-zinc-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:border-zinc-200 hover:shadow-xs transition-all">
                                <div className="flex items-start gap-4">
                                  {rest && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-none bg-zinc-100">
                                      <img src={rest.image} alt={rest.name} className="w-full h-full object-cover" />
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-extrabold text-slate-800">{order.restaurantName}</h3>
                                      <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded uppercase font-bold">{new Date(order.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 font-medium">Order #{order.id}</p>
                                    <p className="text-xs text-zinc-600 mt-1">
                                      {order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Stage:</span>
                                      {(() => {
                                        switch (order.status) {
                                          case 'placed':
                                          case 'accepted':
                                            return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">Processing</span>;
                                          case 'preparing':
                                            return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">Preparing</span>;
                                          case 'ready':
                                            return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200">Prepared</span>;
                                          case 'dispatched':
                                          case 'picked_up':
                                            return <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-200">In Transit</span>;
                                          case 'delivered':
                                            return <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-200">Arrived</span>;
                                          case 'cancelled':
                                            return <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-red-200">Cancelled</span>;
                                          default:
                                            return <span className="bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-200">{order.status}</span>;
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                  <span className="font-black text-lg text-slate-800">${order.total.toFixed(2)}</span>
                                  <button
                                    onClick={() => {
                                      if (rest) {
                                        if (rest.isOpen) {
                                          setCart(order.items.map(i => ({ item: rest.menu.find(m => m.name === i.name)!, quantity: i.quantity, restaurantId: rest.id })).filter(i => i.item));
                                          setActiveRestaurantId(rest.id);
                                          setShowOrderHistory(false);
                                          setIsCartOpen(true);
                                        } else {
                                          alert('Sorry, this restaurant is currently closed. Please try ordering again during their operating hours.');
                                        }
                                      } else {
                                        alert('Restaurant no longer available.');
                                      }
                                    }}
                                    className="bg-zinc-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs w-full sm:w-auto transition-colors"
                                  >
                                    Reorder
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* 2. Restaurant Detail view */}
                {activeRestaurantId && (
                  <div id="rest-details-view" className="flex flex-col gap-6">
                    {/* Return link */}
                    <button
                      onClick={() => setActiveRestaurantId(null)}
                      className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold cursor-pointer group self-start"
                    >
                      ← Back to Discover list
                    </button>

                    {(() => {
                      const rest = restaurants.find(r => r.id === activeRestaurantId);
                      if (!rest) return <p>Selected restaurant missing.</p>;
                      return (
                        <>
                          {/* JUMBO HERO BANNER */}
                          <div className="rounded-3xl overflow-hidden border border-zinc-200 relative h-56 shadow-sm">
                            <img src={rest.bannerImage} className="w-full h-full object-cover filter brightness-75" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex flex-col justify-end p-6 text-white">
                              <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-black">{rest.name}</h1>
                                {rest.isVerified && (
                                  <span className="bg-orange-600 text-white rounded-full p-1 text-[10px] font-bold" title="Verified Chef Spot">✓ Verified</span>
                                )}
                              </div>
                              <p className="text-xs text-zinc-300 italic mt-0.5">{rest.cuisine.join(', ')}</p>
                              <div className="flex gap-4 items-center text-xs text-zinc-200 mt-2">
                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-orange-400" /> {rest.hours}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-300" /> {rest.address}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-300" /> {rest.phoneNumber}</span>
                              </div>
                            </div>
                          </div>

                          {/* Menu Catalog Section */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            
                            {/* Items Catalogue grid */}
                            <div className="lg:col-span-2 flex flex-col gap-6">
                              <h3 className="text-base font-extrabold text-slate-900 border-b border-zinc-200 pb-2">Chef Specialists Menu</h3>
                              
                              <div className="flex flex-col gap-4">
                                {rest.menu.map((food) => (
                                  <div
                                    key={food.id}
                                    className={`bg-white p-4 rounded-2xl border flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${food.isAvailable ? 'border-zinc-200' : 'border-zinc-100 opacity-60 bg-zinc-55'}`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <img src={food.image} className="w-16 h-16 rounded-xl object-cover flex-none bg-zinc-100" />
                                      <div>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <h4 className="font-bold text-slate-900 text-sm">{food.name}</h4>
                                          {food.isPopular && (
                                            <span className="text-[9px] bg-amber-100 text-amber-700 font-black px-1.5 py-0.5 rounded">POPULAR CHOICE</span>
                                          )}
                                          {food.allergens && food.allergens.length > 0 && (
                                            <span className="text-[9px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded">Allergen: {food.allergens.join(', ')}</span>
                                          )}
                                        </div>
                                        <p className="text-xs text-zinc-500 max-w-sm font-medium mt-1">{food.description}</p>
                                        <p className="text-[10px] text-zinc-400 mt-1">Est. Preparation: {food.preparationTime || 12} mins</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3.5 justify-between sm:justify-end w-full sm:w-auto">
                                      <span className="text-sm font-bold text-slate-950">${food.price.toFixed(2)}</span>
                                      {food.isAvailable ? (
                                        <button
                                          onClick={() => addToCart(food, rest.id)}
                                          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-black px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-colors"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Add to Cart
                                        </button>
                                      ) : (
                                        <span className="text-xs font-semibold text-zinc-400 bg-zinc-100 px-2.5 py-1 rounded">Out of Stock</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Review and feedback drawer */}
                            <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm flex flex-col gap-4 self-start">
                              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Restaurant Feedback</h3>
                              
                              <div className="flex flex-col gap-3 max-h-56 overflow-y-auto pr-1">
                                {rest.reviews.length === 0 ? (
                                  <p className="text-xs text-zinc-400 italic">No reviews yet. Be the first to leave one after delivery!</p>
                                ) : (
                                  rest.reviews.map((rev) => (
                                    <div key={rev.id} className="text-xs border-b border-zinc-100 pb-2 flex flex-col gap-0.5">
                                      <div className="flex justify-between items-center">
                                        <span className="font-bold text-zinc-800">{rev.userName}</span>
                                        <span className="text-amber-500 font-semibold flex items-center">{'★'.repeat(rev.rating)}</span>
                                      </div>
                                      <p className="text-zinc-500 font-medium">{rev.comment}</p>
                                      <span className="text-[9px] text-zinc-400">{new Date(rev.date).toLocaleDateString()}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2.5">
                                <h4 className="text-xs font-bold text-slate-800">Add Diner Review Comment</h4>
                                {reviewSubmitted ? (
                                  <div className="bg-green-50 text-green-700 text-xs p-2 rounded-lg text-center font-bold">Review submitted! Recalculating scores...</div>
                                ) : (
                                  <div className="flex flex-col gap-2">
                                    <input
                                      type="text"
                                      placeholder="Your Name"
                                      value={reviewName}
                                      onChange={(e) => setReviewName(e.target.value)}
                                      className="w-full bg-zinc-50 border border-zinc-200 text-xs rounded-xl p-2"
                                    />
                                    <div className="flex items-center gap-1.5 justify-between">
                                      <span className="text-[11px] text-zinc-400">Score Rating:</span>
                                      <div className="flex gap-1 text-amber-400">
                                        {[1, 2, 3, 4, 5].map((num) => (
                                          <button
                                            key={num}
                                            onClick={() => setReviewRating(num)}
                                            className="text-lg focus:outline-none"
                                          >
                                            {num <= reviewRating ? '★' : '☆'}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <textarea
                                      placeholder="Share your dining thoughts..."
                                      value={reviewComment}
                                      onChange={(e) => setReviewComment(e.target.value)}
                                      className="w-full bg-zinc-50 border border-zinc-200 text-xs rounded-xl p-2 h-14 resize-none"
                                    />
                                    <button
                                      onClick={() => handleAddReview(rest.id)}
                                      className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
                                    >
                                      Submit Review
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* 3. Real-Time Order Tracking View */}
                {activeOrderId && (
                  <div id="order-tracking-panel" className="flex flex-col gap-6">
                    <button
                      onClick={() => setActiveOrderId(null)}
                      className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold self-start cursor-pointer"
                    >
                      ← Back to Discover list
                    </button>

                    {(() => {
                      const order = orders.find(o => o.id === activeOrderId);
                      if (!order) return <p>Could not locate active order data.</p>;
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Live delivery status timeline */}
                          <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                            <div className="flex justify-between items-start border-b border-zinc-100 pb-3 flex-wrap gap-2">
                              <div>
                                <span className="text-[9px] bg-orange-100 text-orange-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none">GPS Live Tracking Ready</span>
                                <h2 className="text-xl font-black text-slate-900 mt-1">Tracing Delivery #{order.id}</h2>
                                <p className="text-xs text-zinc-400">From <strong>{order.restaurantName}</strong></p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-zinc-400">Total Charged</p>
                                <p className="text-lg font-black text-orange-600">${order.total.toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-400 italic">via {order.paymentMethod}</p>
                              </div>
                            </div>

                            {/* GOOGLE MAPS PANEL OR DETAILED FALLBACK */}
                            <div className="border border-zinc-200 rounded-3xl overflow-hidden bg-zinc-950 relative h-80 shadow-md">
                              {hasValidKey ? (
                                <APIProvider apiKey={API_KEY} version="weekly">
                                  <Map
                                    defaultCenter={translateGridToLatLng(60, 58)}
                                    defaultZoom={14}
                                    mapId="DEMO_MAP_ID"
                                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                                    style={{ width: '100%', height: '100%' }}
                                    disableDefaultUI={true}
                                    zoomControl={true}
                                  >
                                    {/* 1. Restaurant Marker */}
                                    {(() => {
                                      const restCoords = translateGridToLatLng(40, 40);
                                      return (
                                        <AdvancedMarker position={restCoords} title={order.restaurantName}>
                                          <Pin background="#ea580c" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                                            <div className="text-xs p-1 font-black">🍳</div>
                                          </Pin>
                                        </AdvancedMarker>
                                      );
                                    })()}

                                    {/* 2. Customer Address Marker */}
                                    {(() => {
                                      const custCoords = translateGridToLatLng(80, 75);
                                      return (
                                        <AdvancedMarker position={custCoords} title="My Address">
                                          <Pin background="#16a34a" borderColor="#fff" glyphColor="#fff" scale={1.1}>
                                            <div className="text-xs p-1 font-black">🏠</div>
                                          </Pin>
                                        </AdvancedMarker>
                                      );
                                    })()}

                                    {/* 3. Live Rider Marker */}
                                    {(() => {
                                      const riderObj = riders.find(r => r.id === order.riderId || 'rider-1');
                                      const riderPos = riderObj ? riderObj.location : { lat: 25, lng: 30 };
                                      const realRiderCoords = translateGridToLatLng(riderPos.lat, riderPos.lng);
                                      return (
                                        <AdvancedMarker position={realRiderCoords} title={order.riderName || 'Rider'}>
                                          <div className="relative flex flex-col items-center">
                                            {/* Pulse effect wrapper */}
                                            <div className="absolute top-0 w-10 h-10 bg-orange-500/30 rounded-full animate-ping pointer-events-none font-sans"></div>
                                            <div className="bg-orange-600 text-white w-9 h-9 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                                              <Bike className="w-5 h-5 text-white" />
                                            </div>
                                            <div className="bg-zinc-900/95 text-[9px] text-zinc-100 px-2 py-0.5 rounded shadow mt-1.5 whitespace-nowrap border border-zinc-800 font-extrabold font-sans">
                                              🚚 {order.riderName || 'Zack'}
                                            </div>
                                          </div>
                                        </AdvancedMarker>
                                      );
                                    })()}
                                  </Map>
                                </APIProvider>
                              ) : (
                                <div className="absolute inset-0 p-5 flex flex-col justify-between text-white relative">
                                  {/* Backing ambient gradient */}
                                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 to-zinc-900 pointer-events-none z-0"></div>
                                  
                                  {/* Map background placeholder grid */}
                                  <div className="absolute inset-0 opacity-10 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>

                                  <div className="z-10 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] bg-orange-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">SIMULATED COORDINATES DISPLAY</span>
                                      <span className="text-[10px] text-zinc-400 font-bold">Google Maps Mode Offline</span>
                                    </div>
                                    
                                    <h4 className="text-sm font-black text-white mt-1">Want to trace with live, interactive Google Maps?</h4>
                                    <p className="text-[11px] text-zinc-400 max-w-md leading-relaxed">
                                      Paste your <strong className="text-orange-400 font-bold">GOOGLE_MAPS_PLATFORM_KEY</strong> in the <strong className="font-extrabold text-white">Settings (⚙️) &rarr; Secrets</strong> panel of AI Studio to visualize real-time Seattle routes and interactive courier locations.
                                    </p>
                                  </div>

                                  {/* Simulated routing trace for offline resilience */}
                                  <div className="z-10 bg-zinc-900/40 border border-zinc-800 rounded-2xl p-3 my-2 flex items-center justify-center min-h-[100px]">
                                    {(() => {
                                      const riderObj = riders.find(r => r.id === order.riderId || 'rider-1');
                                      const riderPos = riderObj ? riderObj.location : { lat: 25, lng: 30 };
                                      const restX = 40;
                                      const restY = 40;
                                      const custX = 80;
                                      const custY = 75;
                                      return (
                                        <svg className="w-full h-24" xmlns="http://www.w3.org/2000/svg">
                                          <line x1={`${restX}%`} y1={`${restY}%`} x2={`${custX}%`} y2={`${custY}%`} stroke="#f97316" strokeWidth="2" strokeDasharray="4,4" className="animate-pulse" />
                                          <circle cx={`${restX}%`} cy={`${restY}%`} r="6" fill="#ea580c" />
                                          <text x={`${restX}%`} y={`${restY - 5}%`} fill="#ea580c" fontSize="8" fontWeight="bold" textAnchor="middle">Shop</text>
                                          
                                          <circle cx={`${custX}%`} cy={`${custY}%`} r="6" fill="#16a34a" />
                                          <text x={`${custX}%`} y={`${custY + 12}%`} fill="#16a34a" fontSize="8" fontWeight="bold" textAnchor="middle">Home</text>

                                          <circle cx={`${riderPos.lat}%`} cy={`${riderPos.lng}%`} r="4" fill="#3b82f6" className="animate-ping" />
                                          <circle cx={`${riderPos.lat}%`} cy={`${riderPos.lng}%`} r="5" fill="#2563eb" />
                                          <text x={`${riderPos.lat}%`} y={`${riderPos.lng - 6}%`} fill="#60a5fa" fontSize="8" fontWeight="bold" textAnchor="middle">🚚 {order.riderName || 'Zack'}</text>
                                        </svg>
                                      );
                                    })()}
                                  </div>

                                  <div className="z-10 bg-zinc-900/90 px-3 py-1.5 rounded-xl text-[11px] flex justify-between items-center text-zinc-400 border border-zinc-800">
                                    <span className="flex items-center gap-1"><Bike className="w-3.5 h-3.5 text-orange-500" /> Active rider: {order.riderName || 'Assigning soon'}</span>
                                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-[9px] font-bold font-sans">12 Mins remaining</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Order Timeline steps */}
                            <div className="flex flex-col gap-4">
                              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#242424] px-1">Order Life Cycle Step Logs</h3>
                              <div className="border-l-2 border-zinc-200 pl-4.5 py-1 flex flex-col gap-5 text-xs">
                                {order.timeline.map((step, idx) => (
                                  <div key={idx} className="relative flex gap-3 items-start">
                                    <span className="absolute -left-7 w-4.5 h-4.5 bg-orange-600 rounded-full border-4 border-white flex items-center justify-center text-white"></span>
                                    <div>
                                      <p className="font-extrabold text-slate-900 uppercase">{step.status}</p>
                                      <p className="text-zinc-500 mt-0.5 font-medium">{step.note}</p>
                                      <span className="text-[10px] text-zinc-400">{new Date(step.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Customer & driver messaging portal */}
                          <div className="flex flex-col gap-4 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm self-start">
                            <div>
                              <h3 className="font-extrabold text-sm text-slate-950">Active Deliver Courier Chat</h3>
                              <p className="text-[11px] text-zinc-400">Direct interface to courier and server updates.</p>
                            </div>

                            <div className="border border-zinc-150 rounded-xl p-3 bg-zinc-50 h-56 overflow-y-auto flex flex-col gap-2.5">
                              {deliveryMessages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`p-2.5 rounded-xl text-xs max-w-[85%] ${msg.sender === 'customer' ? 'bg-orange-600 text-white self-end rounded-tr-none' : msg.sender === 'system' ? 'bg-zinc-200/85 text-zinc-800 text-center mx-auto tracking-wide text-[10px] font-semibold' : 'bg-white text-zinc-900 self-start rounded-tl-none border border-zinc-200'}`}
                                >
                                  {msg.sender !== 'system' && (
                                    <div className="text-[9px] opacity-75 uppercase tracking-wider font-extrabold mb-0.5">
                                      {msg.sender === 'customer' ? 'You' : msg.sender}
                                    </div>
                                  )}
                                  <p className="font-medium leading-relaxed">{msg.message}</p>
                                  <span className="text-[8px] block mt-1 opacity-70 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              ))}
                            </div>

                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Write message to Zack..."
                                value={deliveryChatInput}
                                onChange={(e) => setDeliveryChatInput(e.target.value)}
                                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSendChatMessage(order.id, 'customer', deliveryChatInput); }}
                              />
                              <button
                                onClick={() => handleSendChatMessage(order.id, 'customer', deliveryChatInput)}
                                className="bg-orange-600 hover:bg-orange-700 text-white p-2.5 rounded-xl text-xs font-black shadow-sm transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="bg-zinc-100 p-3 rounded-xl border border-zinc-200">
                              <p className="text-[10px] text-zinc-400 mb-1 font-bold">SIMULATION ACTION PANEL</p>
                              <p className="text-[11px] text-zinc-600 mb-2">Simulate a response check from Zack:</p>
                              <button
                                onClick={() => {
                                  handleSendChatMessage(order.id, 'rider', 'Hello client! I’m leaving the store now. Safe delivery path calculated.');
                                }}
                                className="w-full bg-zinc-950 text-white text-[10px] font-bold py-1 px-2 rounded hover:bg-zinc-800 transition"
                              >
                                Zack: "Leaving store" response
                              </button>
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Premium Brand Footer */}
                <div className="pt-12 mt-auto">
                  <AppFooter
                    currentRole={currentRole}
                    onChangeRole={setCurrentRole}
                    onSelectRestaurant={(id) => {
                      setActiveRestaurantId(id);
                      setActiveOrderId(null);
                    }}
                    onNavigateHome={() => {
                      setActiveRestaurantId(null);
                      setActiveOrderId(null);
                    }}
                    onNavigateTracking={() => {
                      const activeOr = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
                      if (activeOr) {
                        setActiveOrderId(activeOr.id);
                        setActiveRestaurantId(null);
                      } else if (orders.length > 0) {
                        setActiveOrderId(orders[orders.length - 1].id);
                        setActiveRestaurantId(null);
                      }
                    }}
                    onOpenAssistant={() => setChatbotOpen(true)}
                    hasActiveOrder={orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled')}
                    hasItemsInCart={cart.length > 0}
                  />
                </div>

              </main>

                {/* Mobile Cart Overlay Background */}
                {isCartOpen && (
                  <div className="fixed inset-0 bg-black/50 z-40 xl:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)} />
                )}
                {/* Shopping Cart Drawer */}
                <aside className={`w-80 border-l border-zinc-200 bg-white p-5 flex flex-col gap-5 flex-none fixed inset-y-0 right-0 z-50 xl:relative xl:z-0 xl:translate-x-0 transition-transform duration-300 ${isCartOpen ? 'translate-x-0 shadow-2xl xl:shadow-none' : 'translate-x-full xl:translate-x-0'}`}>
                  <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-orange-600" />
                      <h3 className="font-extrabold text-slate-900 text-sm">Shopping Cart Box</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={clearCart} className="text-zinc-400 hover:text-red-500 text-xs font-semibold">Clear All</button>
                      <button onClick={() => setIsCartOpen(false)} className="text-zinc-400 hover:text-zinc-900 xl:hidden">
                        ✕
                      </button>
                    </div>
                  </div>

                {cart.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-zinc-400 p-4 gap-2">
                    <span className="text-4xl">🛒</span>
                    <p className="text-xs font-bold">Your cart is completely empty</p>
                    <p className="text-[11px] text-zinc-400 italic">Add tasty combo items from menus to start drafting your order.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
                      {cart.map((c) => (
                        <div key={c.item.id} className="flex justify-between items-center bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 text-xs">
                          <div className="flex-1 pr-2">
                            <h4 className="font-extrabold text-zinc-900 truncate">{c.item.name}</h4>
                            <span className="text-zinc-400 block">${c.item.price.toFixed(2)} each</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-none">
                            <button onClick={() => updateCartQty(c.item.id, -1)} className="p-1 bg-white hover:bg-zinc-100 rounded border border-zinc-200">
                              <Minus className="w-3 h-3 text-zinc-600" />
                            </button>
                            <span className="font-bold px-1">{c.quantity}</span>
                            <button onClick={() => updateCartQty(c.item.id, 1)} className="p-1 bg-white hover:bg-zinc-100 rounded border border-zinc-200">
                              <Plus className="w-3 h-3 text-zinc-600" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-zinc-100 pt-4 flex flex-col gap-2.5">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Promo coupon code..."
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          className="flex-1 bg-zinc-50 border border-zinc-200 text-xs rounded-xl p-2.5 focus:outline-none"
                        />
                        <button
                          onClick={handleApplyPromo}
                          className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl"
                        >
                          Apply
                        </button>
                      </div>
                      {promoApplied && (
                        <div className="bg-green-50 text-green-700 text-[10px] p-1.5 rounded-lg font-black text-center">
                          ✓ PROMO CODE RUSH50 COMMITTED! 50% SAVED!
                        </div>
                      )}

                      {/* Summary calculations */}
                      {(() => {
                        const { subtotal, deliveryFee, tax, discount, grandTotal } = getCartTotals();
                        return (
                          <div className="text-xs text-zinc-500 flex flex-col gap-2 pt-2 border-t border-zinc-100">
                            <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span></div>
                            {discount > 0 && <div className="flex justify-between text-green-600"><span>Rush50 Discount:</span><span>-${discount.toFixed(2)}</span></div>}
                            <div className="flex justify-between"><span>Delivery:</span><span className="font-bold text-slate-800">${deliveryFee.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Taxes:</span><span className="font-bold text-slate-800">${tax.toFixed(2)}</span></div>
                            <div className="flex justify-between items-center pt-2 border-t border-zinc-150">
                              <span className="font-black text-slate-900 text-sm">Grand Total value:</span>
                              <span className="font-black text-orange-600 text-lg">${grandTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}

                      {!checkoutStep ? (
                        <button
                          onClick={() => setCheckoutStep(true)}
                          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm tracking-wide mt-2 transition-colors uppercase"
                        >
                          Proceed toward checkout
                        </button>
                      ) : (
                        <div className="bg-zinc-50 p-3 rounded-2xl border border-zinc-200 flex flex-col gap-3 mt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800">Checkout Guidelines</span>
                            <button onClick={() => setCheckoutStep(false)} className="text-zinc-400 hover:text-zinc-600">✕ Close</button>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                            <label className="text-[10px] text-zinc-400 uppercase font-black">Ship to Delivery Address:</label>
                            <input
                              type="text"
                              value={checkoutAddress}
                              onChange={(e) => setCheckoutAddress(e.target.value)}
                              className="bg-white border text-xs p-2 rounded-lg text-slate-900 font-medium"
                            />
                            
                            <label className="text-[10px] text-zinc-400 uppercase font-black">Courier Instructions:</label>
                            <input
                              type="text"
                              value={deliveryNote}
                              onChange={(e) => setDeliveryNote(e.target.value)}
                              className="bg-white border text-xs p-2 rounded-lg text-slate-900 font-medium"
                            />

                            <label className="text-[10px] text-zinc-400 uppercase font-black">Courier Gratuitous Tip ($):</label>
                            <div className="flex gap-2">
                              {[2, 3, 5, 8].map((val) => (
                                <button
                                  key={val}
                                  onClick={() => setDriverTip(val)}
                                  className={`flex-1 text-xs py-1 rounded-md font-bold border transition ${driverTip === val ? 'bg-orange-600 text-white' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-slate-800'}`}
                                >
                                  ${val}
                                </button>
                              ))}
                            </div>

                            <label className="text-[10px] text-zinc-400 uppercase font-black border-t border-zinc-200 pt-3 mt-1">Payment Method:</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'cod', label: 'Cash on Delivery', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2855/2855018.png', icon: '💵' },
                                { id: 'card', label: 'Credit Card', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg', icon: '💳' },
                                { id: 'easypaisa', label: 'EasyPaisa', imageUrl: 'https://plain-eeur-prod-public.komododecks.com/202605/28/rPpWlM20xmxdNEvKK46K/image.jpg', icon: '🟢' },
                                { id: 'jazzcash', label: 'JazzCash', imageUrl: 'https://plain-eeur-prod-public.komododecks.com/202605/28/nL9HP7ecOENYxBNKXZvg/image.png', icon: '🔴' },
                                { id: 'bank', label: 'Bank Transfer', imageUrl: 'https://cdn-icons-png.flaticon.com/512/2830/2830284.png', icon: '🏦' }
                              ].map((method) => (
                                <button
                                  key={method.id}
                                  onClick={() => setPaymentMethod(method.id as any)}
                                  className={`flex items-center gap-2 flex-1 text-[11px] py-1.5 px-2 rounded-md font-bold border transition text-left ${paymentMethod === method.id ? 'bg-orange-600 text-white border-orange-600 shadow-inner' : 'bg-white border-zinc-200 hover:bg-zinc-50 text-slate-800'}`}
                                >
                                  {method.imageUrl.includes('wikipedia') || method.imageUrl.includes('flaticon') || method.imageUrl.includes('komododecks.com') ? (
                                    <img src={method.imageUrl} referrerPolicy="no-referrer" alt={method.label} className={method.id === 'visa' || method.id === 'card' || method.id === 'easypaisa' || method.id === 'jazzcash' ? "h-4" : "h-5 w-5 object-contain"} style={{ filter: paymentMethod === method.id && !method.imageUrl.includes('flaticon') ? 'brightness(0) invert(1)' : 'none' }} />
                                  ) : (
                                    <span className="text-base">{method.icon}</span>
                                  )}
                                  {method.label}
                                </button>
                              ))}
                            </div>
                            
                            {paymentMethod === 'bank' && (
                              <div className="flex flex-col gap-2 mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                <label className="text-[10px] text-zinc-400 uppercase font-black text-center">Select Partner Bank</label>
                                <div className="grid grid-cols-3 gap-2">
                                  {[
                                  { id: 'HBL', name: 'HBL', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/eqoB2lmRhOImubHZWWjF/image.png' },
                                  { id: 'Meezan Bank', name: 'Meezan', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/EpmsfeQFibzbgtVVRdNg/image.png' },
                                  { id: 'UBL', name: 'UBL', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/qzvieLpnKlRqyPy8blpm/image.png' },
                                  { id: 'MCB', name: 'MCB', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/Q97lU30isU90YpxSiEk3/image.png' },
                                  { id: 'Allied Bank', name: 'Allied Bank', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/MrX43DkVF2nEwH0RzePu/image.png' },
                                  { id: 'Bank Alfalah', name: 'Alfalah', logo: 'https://plain-eeur-prod-public.komododecks.com/202605/28/YecBMF8T32GYj7Sdd0sP/image.png' },
                                ].map(bank => (
                                    <button
                                      key={bank.id}
                                      onClick={() => setSelectedBank(bank.id)}
                                      className={`flex flex-col items-center justify-center p-2 rounded-lg border bg-white hover:bg-zinc-50 transition-all ${selectedBank === bank.id ? 'border-orange-500 shadow-md ring-1 ring-orange-500' : 'border-zinc-200'}`}
                                    >
                                      <img src={bank.logo} referrerPolicy="no-referrer" alt={bank.name} className="h-6 w-auto object-contain mb-1" />
                                      <span className="text-[9px] font-bold text-slate-600 text-center">{bank.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {paymentMethod === 'card' && (
                              <div className="flex flex-col gap-1 mt-1 p-2 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center">
                                <span className="text-[10px] text-slate-500 italic text-center">Card payments will redirect to secure Stripe instant checkout portal directly after pressing order.</span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={handlePlaceOrder}
                            disabled={isPlacingOrder}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-2.5 rounded-xl shadow-sm mt-1 transition-colors uppercase disabled:bg-orange-400 disabled:cursor-wait flex items-center justify-center gap-2"
                          >
                            {isPlacingOrder ? (
                              <>
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent border-t-2"></span>
                                Placing Order...
                              </>
                            ) : (
                              'Place Order Securely'
                            )}
                          </button>
                        </div>
                      )}

                    </div>
                  </>
                )}
              </aside>

            </div>
          )}

          {/* RESTAURANT PARTNER PANELS */}
          {currentRole === 'restaurant' && (
            <div id="rest-portal-view" className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-zinc-200 pb-4 flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-black text-[#1a1a1a]">Restaurant Partner Center</h1>
                  <p className="text-xs text-zinc-500">Add food items, update availability checkboxes, and manage customer orders.</p>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-slate-800">Workspace Shop Selector:</span>
                  <select
                    value={partnerRestId}
                    onChange={(e) => setPartnerRestId(e.target.value)}
                    className="p-2 border border-zinc-200 bg-white text-xs rounded-xl font-bold"
                  >
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi grid controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Menu Management Form */}
                <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm flex flex-col gap-5 self-start">
                  <div>
                    <h3 className="font-extrabold text-[#222] text-sm uppercase tracking-wide">Add Custom Culinary Platters</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">Define new food dishes to be added live instantly.</p>
                  </div>

                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600">Platter Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Avocado Toast Combo"
                        value={newFoodName}
                        onChange={(e) => setNewFoodName(e.target.value)}
                        className="p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600">Price ($)</label>
                      <input
                        type="number"
                        placeholder="e.g. 12.99"
                        value={newFoodPrice}
                        onChange={(e) => setNewFoodPrice(e.target.value)}
                        className="p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600">Category</label>
                      <select
                        value={newFoodCat}
                        onChange={(e) => setNewFoodCat(e.target.value)}
                        className="p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 font-medium"
                      >
                        <option value="Burgers">Burgers</option>
                        <option value="Salads">Salads</option>
                        <option value="Sushi">Sushi</option>
                        <option value="Sides">Sides</option>
                        <option value="Pasta">Pasta</option>
                        <option value="Drinks">Drinks</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600">Unsplash Food Image Link</label>
                      <input
                        type="text"
                        placeholder="Leave blank for signature smart fallback mockup"
                        value={newFoodImage}
                        onChange={(e) => setNewFoodImage(e.target.value)}
                        className="p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none placeholder:text-zinc-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-600">Ingredients Description</label>
                      <textarea
                        placeholder="Add ingredients and special diet tags..."
                        value={newFoodDesc}
                        onChange={(e) => setNewFoodDesc(e.target.value)}
                        className="p-2.5 border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none h-16 resize-none"
                      />
                    </div>
                    
                    <button
                      onClick={handleAddDish}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm mt-2 transition-colors uppercase"
                    >
                      Onboard Platter Menu
                    </button>
                  </div>
                </div>

                {/* 2. Incoming Orders Queue */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-widest">Workspace Kitchen Incoming order line</h3>
                    <span className="text-[10px] bg-sky-100 text-sky-800 font-black px-2 py-0.5 rounded-full uppercase">Real-Time Awaiting Chef Line</span>
                  </div>

                  {orders.filter(o => o.restaurantId === partnerRestId).length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 text-center italic text-zinc-400 border border-zinc-200">
                      No active customer orders placed for this restaurant workspace yet. Create dynamic client items as a Customer first!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {orders.filter(o => o.restaurantId === partnerRestId).map((order) => (
                        <div key={order.id} className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs flex flex-col gap-4">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-mono font-black text-slate-500 uppercase">ORDER ID: #{order.id}</span>
                                <span className="text-[9px] bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg font-black uppercase tracking-wider">{order.status}</span>
                              </div>
                              <p className="text-[11px] text-zinc-400 mt-1">Diner: <strong>{order.customerName}</strong> ({order.customerPhone})</p>
                              <p className="text-[11px] text-zinc-400">Address: {order.customerAddress}</p>
                              {order.deliveryNote && (
                                <p className="text-[10px] text-amber-600 italic bg-amber-50 p-1 rounded border border-amber-100 mt-1">"Instructions: {order.deliveryNote}"</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-zinc-400">Total Charged</p>
                              <p className="text-base font-black text-slate-950">${order.total.toFixed(2)}</p>
                            </div>
                          </div>

                          {/* Plates List in Order */}
                          <div className="border-t border-b border-zinc-100 py-2">
                            <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-1">Items To Grill & Box:</h4>
                            <div className="flex flex-wrap gap-3 text-xs">
                              {order.items.map((it, idx) => (
                                <span key={idx} className="bg-zinc-100 px-2.5 py-1 rounded-lg text-slate-950 font-semibold border border-zinc-200">
                                  {it.quantity}x {it.name} (${(it.price * it.quantity).toFixed(2)})
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Order Action Status Pipeline triggers */}
                          <div className="flex flex-wrap gap-2">
                            {order.status === 'placed' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'accepted', undefined, 'Our kitchen chief has approved your order!')}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-black px-4 py-2 rounded-xl"
                              >
                                Accept & Validate Order
                              </button>
                            )}
                            
                            {order.status === 'accepted' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'preparing', undefined, 'Patty is griddled on cast iron, sides are crisping!')}
                                className="bg-[#242424] hover:bg-black text-white text-[11px] font-bold px-4 py-2 rounded-xl"
                              >
                                Begin Food Cooking
                              </button>
                            )}

                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'ready', undefined, 'Freshly cooked meal is packed in temperature-controlled bag!')}
                                className="bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-black px-4 py-2 rounded-xl"
                              >
                                Mark Meal Packed & Ready
                              </button>
                            )}

                            {order.status === 'ready' && (
                              <button
                                onClick={() => {
                                  // Assign rider-1 dynamically
                                  handleUpdateOrderStatus(order.id, 'dispatched', 'rider-1', 'Zack Walker has received order details and is heading to the kitchen!');
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black px-4 py-2 rounded-xl"
                              >
                                Dispatch Rider Zack Walker
                              </button>
                            )}

                            {order.status === 'dispatched' && (
                              <div className="text-xs text-blue-700 font-bold bg-blue-50 p-2 rounded-xl border border-blue-100 w-full flex justify-between items-center">
                                <span>🚚 Driver Zack Walker is currently transit heading to the restaurant...</span>
                                <button
                                  onClick={() => {
                                    handleUpdateOrderStatus(order.id, 'picked_up', 'rider-1', 'Courier departed. Zack is riding towards your destination.');
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2 py-1 rounded font-black tracking-wide"
                                >
                                  Trigger Pick-up
                                </button>
                              </div>
                            )}

                            {order.status === 'picked_up' && (
                              <div className="text-xs text-amber-700 font-bold bg-amber-50 p-2 rounded-xl border border-amber-100 w-full flex justify-between items-center">
                                <span>🚀 Zack Walker picked up the bundle and is heading to the customer doorstep!</span>
                                <button
                                  onClick={() => {
                                    handleUpdateOrderStatus(order.id, 'delivered', 'rider-1', 'RUSH COMPLETE! Order was left at doorstep with SARAH.');
                                  }}
                                  className="bg-green-600 hover:bg-green-700 text-white text-[10px] px-2 py-1 rounded font-black tracking-wide"
                                >
                                  Simulate Safe Delivery
                                </button>
                              </div>
                            )}

                            {order.status === 'delivered' && (
                              <div className="text-xs text-emerald-800 font-black bg-emerald-50 p-2 rounded-xl w-full flex items-center justify-between">
                                <span>✓ THIS RUSH DELIVER TRANSACTION WAS COMPLETED SECURELY.</span>
                                <span className="text-[10px] bg-white border px-2 py-0.5 rounded">Rider Zack credited!</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Restaurant Page Premium Footer */}
                <div className="pt-12 mt-auto">
                  <AppFooter
                    currentRole={currentRole}
                    onChangeRole={setCurrentRole}
                    onSelectRestaurant={(id) => {
                      setActiveRestaurantId(id);
                      setActiveOrderId(null);
                      setCurrentRole('customer');
                    }}
                    onNavigateHome={() => {
                      setActiveRestaurantId(null);
                      setActiveOrderId(null);
                      setCurrentRole('customer');
                    }}
                    onNavigateTracking={() => {
                      const activeOr = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
                      if (activeOr) {
                        setActiveOrderId(activeOr.id);
                        setActiveRestaurantId(null);
                      } else if (orders.length > 0) {
                        setActiveOrderId(orders[orders.length - 1].id);
                        setActiveRestaurantId(null);
                      }
                      setCurrentRole('customer');
                    }}
                    onOpenAssistant={() => {
                      setCurrentRole('customer');
                      setChatbotOpen(true);
                    }}
                    hasActiveOrder={orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled')}
                    hasItemsInCart={cart.length > 0}
                  />
                </div>

              </div>

            </div>
          )}

          {/* RIDER PORTAL APPS */}
          {currentRole === 'rider' && (
            <div id="rider-portal-view" className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
              
              <div className="border-b border-zinc-200 pb-4">
                <h1 className="text-2xl font-black text-slate-950 flex items-center gap-1.5"><Bike className="w-6 h-6 text-orange-600" /> Rider Delivery Workspace</h1>
                <p className="text-xs text-zinc-500">Update status, accept route dispatches, and track daily wallet earnings.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Rider stats overview dashboard */}
                <div className="bg-zinc-900 text-white p-5 rounded-3xl shadow-sm flex flex-col gap-4 self-start">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black">Active Agent Courier</p>
                      <h3 className="text-lg font-black mt-0.5">Zack Walker</h3>
                    </div>
                    <span className="bg-green-500/20 text-green-300 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">ACTIVE ONLINE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
                    <div>
                      <span className="text-[11px] text-zinc-400">Total Balance Earned</span>
                      <p className="text-2xl font-black text-yellow-300 pointer-events-none mt-0.5">$486.00</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-zinc-400 font-semibold">Active Vehicle Class</span>
                      <p className="text-xs text-white font-black mt-0.5 uppercase">E-BIKE-332D</p>
                    </div>
                  </div>

                  {/* Rider micro analytics SVG bar display */}
                  <div className="border-t border-zinc-800 pt-3 flex flex-col gap-2">
                    <span className="text-[10px] text-zinc-400 uppercase">Weekly Dispatch Activity Streak</span>
                    <div className="flex items-end gap-1 px-1 h-14 pt-2">
                      {[
                        { day: 'M', h: '45%' },
                        { day: 'T', h: '60%' },
                        { day: 'W', h: '75%' },
                        { day: 'T', h: '95%' },
                        { day: 'F', h: '20%' }
                      ].map((bar, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-orange-600 rounded-sm" style={{ height: bar.h }}></div>
                          <span className="text-[9px] text-zinc-400 font-bold">{bar.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Dispatch List accepts & controls */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <h3 className="font-extrabold text-[#111] text-sm uppercase tracking-wider">Active Assigned Delivers</h3>
                  
                  {orders.filter(o => o.riderId === 'rider-1' && o.status !== 'delivered').length === 0 ? (
                    <div className="bg-white p-6.5 rounded-3xl border border-zinc-200 text-center italic text-zinc-400">
                      You currently have no active pending orders routed to your Electric Bicycle. 
                      Go to "Customer View", order foods, and dispatch Zack Walker to test live.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {orders.filter(o => o.riderId === 'rider-1' && o.status !== 'delivered').map((order) => (
                        <div key={order.id} className="bg-white border border-zinc-200 rounded-3xl p-5 shadow-xs flex flex-col gap-3.5">
                          <div className="flex justify-between items-center bg-zinc-50 border-b border-zinc-150 p-2.5 rounded-xl">
                            <div>
                              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black">DISPATCH ORDER #{order.id}</span>
                              <p className="text-xs text-[#222] font-semibold mt-1">From: <strong>{order.restaurantName}</strong> ({order.restaurantAddress})</p>
                            </div>
                            <span className="text-xs font-bold text-slate-950 uppercase">{order.status}</span>
                          </div>

                          <div className="text-xs text-zinc-600">
                            <span className="font-extrabold block text-slate-800">Delivery Address:</span>
                            <span className="font-medium">{order.customerAddress} ({order.customerName})</span>
                          </div>

                          {/* Steps toggle tracker triggers for rider */}
                          <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100">
                            <p className="text-[10px] tracking-wide text-zinc-400 uppercase font-black">Rider Interactive Courier Actions:</p>
                            
                            <div className="flex flex-wrap gap-2">
                              {order.status === 'dispatched' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'picked_up', 'rider-1', 'Courier Zack departs restaurant with burger container.')}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition"
                                >
                                  Confirm Box Pickup & Depart Store 🚀
                                </button>
                              )}

                              {order.status === 'picked_up' && (
                                <button
                                  onClick={() => handleUpdateOrderStatus(order.id, 'delivered', 'rider-1', 'Courier Zack confirm verified drop-off completed!')}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2 px-4 rounded-xl shadow-sm transition"
                                >
                                  Complete Delivery Status (Pin Drop OTP 1234) ✓
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rider Page Premium Footer */}
                <div className="pt-12 mt-auto">
                  <AppFooter
                    currentRole={currentRole}
                    onChangeRole={setCurrentRole}
                    onSelectRestaurant={(id) => {
                      setActiveRestaurantId(id);
                      setActiveOrderId(null);
                      setCurrentRole('customer');
                    }}
                    onNavigateHome={() => {
                      setActiveRestaurantId(null);
                      setActiveOrderId(null);
                      setCurrentRole('customer');
                    }}
                    onNavigateTracking={() => {
                      const activeOr = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
                      if (activeOr) {
                        setActiveOrderId(activeOr.id);
                        setActiveRestaurantId(null);
                      } else if (orders.length > 0) {
                        setActiveOrderId(orders[orders.length - 1].id);
                        setActiveRestaurantId(null);
                      }
                      setCurrentRole('customer');
                    }}
                    onOpenAssistant={() => {
                      setCurrentRole('customer');
                      setChatbotOpen(true);
                    }}
                    hasActiveOrder={orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled')}
                    hasItemsInCart={cart.length > 0}
                  />
                </div>

              </div>

            </div>
          )}

          {/* SUPER ADMIN DASHBOARD PANEL */}
          {currentRole === 'admin' && (
            <div id="admin-portal-view" className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
              
              <div className="flex justify-between items-center border-b border-zinc-200 pb-4 flex-wrap gap-2">
                <div>
                  <h1 className="text-2xl font-black text-slate-950 flex items-center gap-1.5"><Building className="w-6 h-6 text-orange-600" /> Platform Super Admin Dashboard</h1>
                  <p className="text-xs text-zinc-500 font-semibold">Verify partners, reconcile service budgets, inspect ledger, and audit live transactional traffic.</p>
                </div>

                {/* Sub Tab selection toggle */}
                <div className="flex gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                  <button
                    onClick={() => setSelectedAdminTab('analytics')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${selectedAdminTab === 'analytics' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                  >
                    Analytics Graphs
                  </button>
                  <button
                    onClick={() => setSelectedAdminTab('restaurants')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${selectedAdminTab === 'restaurants' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                  >
                    Partner KYC Approval ({restaurants.filter(r => !r.isVerified).length})
                  </button>
                  <button
                    onClick={() => setSelectedAdminTab('live-orders')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${selectedAdminTab === 'live-orders' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                  >
                    Transaction Ledger ({orders.length})
                  </button>
                </div>
              </div>

              {/* 1. Analytics interactive charts */}
              {selectedAdminTab === 'analytics' && analytics && (
                <div className="flex flex-col gap-6">
                  
                  {/* Grid blocks */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-4.5 rounded-2xl border border-zinc-200 flex flex-col">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Estimated Sales Volume</span>
                      <p className="text-xl font-mono font-black text-slate-950 mt-1">${analytics.totalSales.toFixed(2)}</p>
                      <span className="text-[9px] text-green-600 mt-0.5">▲ 12.4% vs last week</span>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-zinc-200 flex flex-col">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">FoodRush Tax Income Fee (18%)</span>
                      <p className="text-xl font-mono font-black text-orange-600 mt-1">${analytics.commissionEarned.toFixed(2)}</p>
                      <span className="text-[9px] text-zinc-400 mt-0.5">SaaS Platform Royalty</span>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-zinc-200 flex flex-col">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Registered Spot Owners</span>
                      <p className="text-xl font-mono font-black text-slate-950 mt-1">{analytics.totalRestaurants} outlets</p>
                      <span className="text-[9px] text-[#333] mt-0.5">KyC Cleared Out</span>
                    </div>

                    <div className="bg-white p-4.5 rounded-2xl border border-zinc-200 flex flex-col">
                      <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider">Total Orders Handshake</span>
                      <p className="text-xl font-mono font-black text-teal-600 mt-1">{analytics.totalOrders}</p>
                      <span className="text-[9px] text-zinc-400 mt-0.5">Completed Delivery</span>
                    </div>
                  </div>

                  {/* High fidelity inline responsive SVG graphs and charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm">
                      <h4 className="font-extrabold text-xs uppercase tracking-widest text-[#242424] mb-3">Daily Order Volume Chart</h4>
                      
                      <div className="w-full h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.salesData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 'bold' }} dx={-10} />
                            <Tooltip 
                              cursor={{ stroke: '#f1f5f9', strokeWidth: 2 }}
                              contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }} 
                              itemStyle={{ color: '#ea580c' }} 
                            />
                            <Line type="monotone" dataKey="orders" name="Total Orders" stroke="#ea580c" strokeWidth={3.5} dot={{ r: 4.5, fill: '#f97316', strokeWidth: 0 }} activeDot={{ r: 6, fill: '#ea580c', strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm flex flex-col">
                      <h4 className="font-extrabold text-xs uppercase tracking-widest text-[#242424] mb-4">Cuisine Popularity Distribution</h4>
                      
                      <div className="flex-1 flex items-center justify-around flex-wrap gap-4">
                        <div className="w-28 h-28 relative">
                          {/* Sliced SVG circle */}
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="14" fill="transparent" stroke="#fed7aa" strokeWidth="4" />
                            <circle cx="16" cy="16" r="14" fill="transparent" stroke="#ea580c" strokeWidth="4" strokeDasharray="50 100" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                            <span className="text-base font-black text-slate-950">45%</span>
                            <span className="text-[8px] uppercase font-bold text-zinc-400">Burgers</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 text-xs">
                          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-orange-600 rounded-sm"></span> Burgers (45%)</span>
                          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-zinc-350 rounded-sm"></span> Wood Pizza (25%)</span>
                          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-teal-500 rounded-sm"></span> Sushi Chef Set (20%)</span>
                          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-green-400 rounded-sm"></span> Acai bowl (10%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* 2. KYC Approval table */}
              {selectedAdminTab === 'restaurants' && (
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-150 font-extrabold text-[#111]">
                        <th className="p-4">Restaurant</th>
                        <th className="p-4">Operating Hours</th>
                        <th className="p-4">Contact Phone</th>
                        <th className="p-4">Status Approvals</th>
                        <th className="p-4 text-right">KYC Toggle Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restaurants.map((rest) => (
                        <tr key={rest.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="p-4">
                            <div className="flex items-center gap-2.5">
                              <img src={rest.image} className="w-9 h-9 object-cover rounded-lg bg-zinc-100" />
                              <div>
                                <h4 className="font-extrabold text-slate-950">{rest.name}</h4>
                                <span className="text-[10px] text-zinc-400">{rest.address}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono font-medium">{rest.hours}</td>
                          <td className="p-4 text-zinc-600">{rest.phoneNumber}</td>
                          <td className="p-4">
                            {rest.isVerified ? (
                              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">VERIFIED PARTNER</span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">PENDING AUDIT</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleVerifyRestaurantToggle(rest.id, rest.isVerified)}
                              className={`text-[10px] font-black px-3 py-1 rounded-lg border transition ${rest.isVerified ? 'border-red-200 hover:bg-red-50 text-red-600' : 'border-green-200 hover:bg-green-50 text-green-700'}`}
                            >
                              {rest.isVerified ? 'Revoke Merchant' : 'Verify merchant'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* 3. Transaction Ledger log */}
              {selectedAdminTab === 'live-orders' && (
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-150 font-extrabold text-[#111]">
                        <th className="p-4">ID</th>
                        <th className="p-4">Outlets Spot</th>
                        <th className="p-4">Customer info</th>
                        <th className="p-4">Amount (USD)</th>
                        <th className="p-4">State Timeline</th>
                        <th className="p-4 text-right">Courier Driver</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order.id} className="border-b border-zinc-100 hover:bg-zinc-50/50">
                          <td className="p-4 font-mono text-zinc-500 uppercase">#{order.id}</td>
                          <td className="p-4 font-bold text-slate-950">{order.restaurantName}</td>
                          <td className="p-4">
                            <div className="font-bold text-zinc-800">{order.customerName}</div>
                            <div className="text-[10px] text-zinc-400">{order.customerAddress}</div>
                          </td>
                          <td className="p-4 font-mono font-bold text-orange-600">${order.total.toFixed(2)}</td>
                          <td className="p-4">
                            <span className="bg-orange-50 text-orange-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">{order.status}</span>
                          </td>
                          <td className="p-4 text-right text-zinc-600 font-bold">{order.riderName || 'Awaiting Assign'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Admin Page Premium Footer */}
              <div className="pt-12 mt-auto">
                <AppFooter
                  currentRole={currentRole}
                  onChangeRole={setCurrentRole}
                  onSelectRestaurant={(id) => {
                    setActiveRestaurantId(id);
                    setActiveOrderId(null);
                    setCurrentRole('customer');
                  }}
                  onNavigateHome={() => {
                    setActiveRestaurantId(null);
                    setActiveOrderId(null);
                    setCurrentRole('customer');
                  }}
                  onNavigateTracking={() => {
                    const activeOr = orders.find(o => o.status !== 'delivered' && o.status !== 'cancelled');
                    if (activeOr) {
                      setActiveOrderId(activeOr.id);
                      setActiveRestaurantId(null);
                    } else if (orders.length > 0) {
                      setActiveOrderId(orders[orders.length - 1].id);
                      setActiveRestaurantId(null);
                    }
                    setCurrentRole('customer');
                  }}
                  onOpenAssistant={() => {
                    setCurrentRole('customer');
                    setChatbotOpen(true);
                  }}
                  hasActiveOrder={orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled')}
                  hasItemsInCart={cart.length > 0}
                />
           </div>
          </div>
       )}
        </div>
      </header>
      {/* ==========================================
          INTELLIGENT AI RECOMMENDATION CHAT DRAWER (POPUP)
          ========================================== */}
      {chatbotOpen && (
        <div id="ai-chat-drawer" className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col h-[480px]">
          
          {/* AI Banner head */}
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white flex justify-between items-center flex-none">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
              <div>
                <h4 className="font-extrabold text-sm">FoodRush Assistant</h4>
                <p className="text-[10px] text-orange-100">Smart meal suggestions & orders</p>
              </div>
            </div>
            <button
              onClick={() => setChatbotOpen(false)}
              className="text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 p-4 overflow-y-auto bg-zinc-50 flex flex-col gap-3">
            <div className="bg-white p-3 rounded-2xl border border-zinc-200 text-xs text-zinc-800 leading-relaxed font-semibold">
              <p>👋 Hello Aman! I am your <strong>FoodRush Smart Assistant</strong>.</p>
              <p className="mt-1">I have direct access to our live restaurants catalog. Ask me to recommend dishes or design a custom combination order!</p>
            </div>
            {aiChatHistory.map((hist, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs max-w-[85%] font-medium leading-relaxed ${hist.sender === 'customer' ? 'bg-orange-600 text-white self-end rounded-tr-none' : 'bg-white text-zinc-900 border border-zinc-150 self-start rounded-tl-none shadow-sm'}`}
              >
                <p>{hist.message}</p>
              </div>
            ))}
            {aiLoading && (
              <div className="bg-white p-3 rounded-2xl border border-zinc-150 text-xs text-zinc-400 self-start animate-pulse flex items-center gap-1.5 font-bold">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Thinking of culinary ideas...
              </div>
            )}
          </div>

          {/* Message input bar */}
          <div className="p-3 border-t border-zinc-200 bg-white flex gap-2 flex-none">
            <input
              type="text"
              placeholder="Ask for low calorie acai, burgers..."
              value={aiMessageInput}
              onChange={(e) => setAiMessageInput(e.target.value)}
              className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-1.5 text-xs focus:ring-1 focus:ring-orange-500 text-slate-900 focus:outline-none"
              onKeyDown={(e) => { if (e.key === 'Enter') handleAskAI(); }}
            />
            <button
              onClick={handleAskAI}
              className="bg-orange-600 hover:bg-orange-700 text-white p-2.5 rounded-xl text-xs font-black shadow-sm transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
       </div>
      )}
      </div>
    </div>
  );
}
