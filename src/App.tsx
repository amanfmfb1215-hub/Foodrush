import React, { useState, useEffect, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
  InfoWindow,
  useAdvancedMarkerRef
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
  LogOut,
  CheckCircle,
  X,
  CreditCard,
  Wallet,
  Percent,
  ClipboardList,
  ShieldCheck,
  Share2,
  Activity,
  ArrowRight,
  ThumbsUp,
  ChevronRight,
  Check,
  Phone,
  Flame,
  Package,
  Utensils,
  Download,
  Printer,
  Eye
} from 'lucide-react';
import { MenuItem, Restaurant, Order, OrderStatus, ChatMessage, Rider, PlatformAnalytics, Review, OrderItem } from './types';
import AppFooter from './components/AppFooter';
import OrderTimer from './components/OrderTimer';
import CustomerOrderETA from './components/CustomerOrderETA';
import GoogleLoginScreen from './components/GoogleLoginScreen';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { STATIC_FALLBACK_RESTAURANTS, STATIC_FALLBACK_RIDERS, STATIC_FALLBACK_ANALYTICS } from './fallbackData';

const API_KEY =
  (typeof process !== 'undefined' && process.env?.GOOGLE_MAPS_PLATFORM_KEY) ||
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

const PrepCountdown = ({ minutes, status }: { minutes?: number, status: string }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (minutes !== undefined && status !== 'delivered' && status !== 'cancelled') {
       if (secondsRemaining === null) {
          setSecondsRemaining(minutes * 60);
       }
    }
  }, [minutes, status, secondsRemaining]);

  useEffect(() => {
    if (secondsRemaining === null || secondsRemaining <= 0) return;
    const intervalId = setInterval(() => {
      setSecondsRemaining(prev => prev !== null ? prev - 1 : null);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [secondsRemaining]);

  if (status === 'delivered') return <span>Delivered</span>;
  if (status === 'cancelled') return <span>Cancelled</span>;
  if (minutes === undefined) return <span>Calculating ETA...</span>;
  
  if (secondsRemaining !== null && secondsRemaining <= 0) return <span>Ready shortly</span>;

  const m = Math.floor((secondsRemaining || 0) / 60);
  const s = (secondsRemaining || 0) % 60;
  return <span>{m}:{s.toString().padStart(2, '0')}</span>;
};

const RouteDisplay = ({
  origin,
  destination
}: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Clear previous routes/polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: 'DRIVING',
      fields: ['path', 'viewport'],
    })
      .then(({ routes }) => {
        if (routes?.[0]) {
          // Create matching polylines
          const newPolylines = routes[0].createPolylines();
          newPolylines.forEach(p => {
            p.setOptions({
              strokeColor: '#ea580c',
              strokeOpacity: 0.85,
              strokeWeight: 5,
            });
          });

          // Set map and track refs
          newPolylines.forEach(p => p.setMap(map));
          polylinesRef.current = newPolylines;

          // Auto fit map bounds beautifully centered on the route
          if (routes[0].viewport) {
            map.fitBounds(routes[0].viewport);
          } else {
            // Fallback center or zoom if viewport not available
            map.setCenter({
              lat: (origin.lat + destination.lat) / 2,
              lng: (origin.lng + destination.lng) / 2
            });
            map.setZoom(14);
          }
        }
      })
      .catch(err => {
        console.warn('computeRoutes error:', err);
      });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng]);

  return null;
};

const MapMarkerWithInfoWindow = ({
  position,
  title,
  pinColor,
  icon,
  children
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  pinColor: string;
  icon: string;
  children: React.ReactNode;
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)}>
        <Pin background={pinColor} borderColor="#fff" glyphColor="#fff" scale={1.15}>
          <div className="text-sm p-1 font-black leading-none">{icon}</div>
        </Pin>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-2 max-w-[220px] text-zinc-800 font-sans leading-relaxed">
            <h4 className="font-black text-xs text-orange-600 uppercase tracking-wider mb-1">{title}</h4>
            {children}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

const RiderMarkerWithInfoWindow = ({
  position,
  title,
  riderName,
  children
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  riderName: string;
  children: React.ReactNode;
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={position} onClick={() => setOpen(true)}>
        <div className="relative flex flex-col items-center cursor-pointer">
          {/* Pulse effect wrapper */}
          <div className="absolute top-0 w-10 h-10 bg-orange-500/30 rounded-full animate-ping pointer-events-none font-sans"></div>
          <div className="bg-orange-600 text-white w-9.5 h-9.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <div className="bg-zinc-900/95 text-[9px] text-zinc-100 px-2 py-0.5 rounded shadow mt-1.5 whitespace-nowrap border border-zinc-800 font-extrabold font-sans">
            🚚 {riderName}
          </div>
        </div>
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-2 max-w-[220px] text-zinc-800 font-sans leading-relaxed">
            <h4 className="font-black text-xs text-orange-600 uppercase tracking-wider mb-1">{title}</h4>
            {children}
          </div>
        </InfoWindow>
      )}
    </>
  );
};


const safeStorage = {
  getItem: (k: string) => { try { return window.localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { window.localStorage.setItem(k, v); } catch {} },
  removeItem: (k: string) => { try { window.localStorage.removeItem(k); } catch {} }
};

export default function App() {
  // Authenticated user session with Google Auth
  const [userSession, setUserSession] = useState<{
    email: string;
    name: string;
    avatar: string;
    role: 'customer' | 'restaurant' | 'rider' | 'admin';
  } | null>(() => {
    try {
      const cached = safeStorage.getItem('foodrush_session2');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  // Roles toggle: Customer, Restaurant, Rider, Admin (respects local preferences)
  const [currentRole, setCurrentRole] = useState<'customer' | 'restaurant' | 'rider' | 'admin'>(() => {
    try {
      const cached = safeStorage.getItem('foodrush_session2');
      if (cached) {
        return JSON.parse(cached).role;
      }
    } catch {}
    return 'customer';
  });

  // Core synchronized states
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);

  // Loading and helper state
  const [loading, setLoading] = useState<boolean>(true);
  const [activeRestaurantId, setActiveRestaurantId] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const [sharedOrderParam, setSharedOrderParam] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('share') || params.get('sharedOrderId');
    } catch {
      return null;
    }
  });
  const [trackingViewMode, setTrackingViewMode] = useState<'map' | 'summary'>('map');
  const [deliveryRatingValue, setDeliveryRatingValue] = useState<number>(5);
  const [deliveryFeedbackComment, setDeliveryFeedbackComment] = useState<string>('');
  const [showOrderHistory, setShowOrderHistory] = useState<boolean>(false);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeQrOnReceipt, setIncludeQrOnReceipt] = useState<boolean>(true);
  const [pdfLayoutFormat, setPdfLayoutFormat] = useState<'a4' | 'thermal'>('a4');
  const [showPdfPreviewModal, setShowPdfPreviewModal] = useState<boolean>(false);
  const [qrCodePreviewDataUrl, setQrCodePreviewDataUrl] = useState<string>('');

  useEffect(() => {
    if (activeOrderId && includeQrOnReceipt) {
      const order = orders.find(o => o.id === activeOrderId);
      if (order) {
        const qrContent = JSON.stringify({
          foodrush_id: order.id,
          restaurant: order.restaurantName,
          itemsCount: order.items.length,
          totalAmount: `$${order.total.toFixed(2)}`,
          payment: order.paymentMethod || 'PAYPAL',
          verifiedAt: new Date().toISOString()
        });
        QRCode.toDataURL(qrContent, { errorCorrectionLevel: 'M', margin: 1 })
          .then(url => setQrCodePreviewDataUrl(url))
          .catch(err => console.warn('Failed to generate preview QR Code:', err));
      }
    } else {
      setQrCodePreviewDataUrl('');
    }
  }, [activeOrderId, includeQrOnReceipt, orders]);

  // System toasts
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; icon?: React.ReactNode }[]>([]);
  const prevOrdersRef = useRef<Order[]>([]);

  const addToast = (title: string, message: string, icon?: React.ReactNode) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000); // give it a few seconds
  };

  useEffect(() => {
    // Check for 'preparing' to 'ready' status changes
    if (currentRole === 'customer') {
      orders.forEach(currentOrder => {
        const previousOrder = prevOrdersRef.current.find(o => o.id === currentOrder.id);
        if (previousOrder && previousOrder.status === 'preparing' && currentOrder.status === 'ready') {
          addToast(
            'Order is Ready!',
            `Your order #${currentOrder.id} from ${currentOrder.restaurantName} is now ready for pickup by the rider.`,
            <Package className="w-5 h-5 text-orange-600" />
          );
        }
      });
    }
    prevOrdersRef.current = orders;
  }, [orders, currentRole]);

  // Cart & checkout process
  const [reorderDraft, setReorderDraft] = useState<{ orderId: string, restaurantName: string, items: { item: MenuItem; quantity: number; restaurantId: string }[] } | null>(null);
  
  // Loyalty & VIP Program
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(() => {
    try {
      return parseInt(safeStorage.getItem('foodrush_loyalty_points') || '150', 10);
    } catch {
      return 150;
    }
  }); // Start with 150 points
  const [isVip, setIsVip] = useState<boolean>(() => {
    try {
      return safeStorage.getItem('foodrush_vip') === 'true';
    } catch {
      return false;
    }
  });
  const [showLoyalty, setShowLoyalty] = useState<boolean>(false);
  const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);

  useEffect(() => {
    safeStorage.setItem('foodrush_loyalty_points', loyaltyPoints.toString());
  }, [loyaltyPoints]);

  useEffect(() => {
    safeStorage.setItem('foodrush_vip', isVip ? 'true' : 'false');
  }, [isVip]);

  const [cart, setCart] = useState<{ item: MenuItem; quantity: number; restaurantId: string }[]>(() => {
    try {
      const cached = safeStorage.getItem('foodrush_cart');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [checkoutAddress, setCheckoutAddress] = useState<string>(() => {
    try {
      return safeStorage.getItem('foodrush_address') || 'Suite 404, 82 Central Dr, Food District';
    } catch {
      return 'Suite 404, 82 Central Dr, Food District';
    }
  });
  const [checkoutPhone, setCheckoutPhone] = useState<string>(() => {
    try {
      return safeStorage.getItem('foodrush_phone') || '+1 (555) 333-2222';
    } catch {
      return '+1 (555) 333-2222';
    }
  });
  const [driverTip, setDriverTip] = useState<number>(3);
  const [deliveryNote, setDeliveryNote] = useState<string>('Leave at the apartment lobby table.');
  const [promoCode, setPromoCode] = useState<string>('');
  const [promoApplied, setPromoApplied] = useState<boolean>(false);
  const [checkoutStep, setCheckoutStep] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card' | 'jazzcash' | 'easypaisa' | 'bank'>('cod');
  const [selectedBank, setSelectedBank] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // User Profile state
  const [profileOpen, setProfileOpen] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    address: '',
    vehicle: 'Motorcycle',
    restaurantName: 'My Restaurant',
    cuisine: 'American',
    department: 'Super Admin'
  });

  useEffect(() => {
    if (profileOpen && userSession) {
      let safeVehicle = 'Motorcycle';
      let safeRestName = 'My Restaurant';
      let safeCuisine = 'American';
      let safeDept = 'Super Admin';
      try {
        safeVehicle = safeStorage.getItem('foodrush_rider_vehicle') || 'Motorcycle';
        safeRestName = safeStorage.getItem('foodrush_rest_name') || 'My Restaurant';
        safeCuisine = safeStorage.getItem('foodrush_rest_cuisine') || 'American';
        safeDept = safeStorage.getItem('foodrush_admin_dept') || 'Super Admin';
      } catch (e) {
        // ignore
      }
      setProfileForm({
        ...profileForm,
        name: userSession.name || '',
        phone: checkoutPhone,
        address: checkoutAddress,
        vehicle: safeVehicle,
        restaurantName: safeRestName,
        cuisine: safeCuisine,
        department: safeDept
      });
    }
  }, [profileOpen]);

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
    safeStorage.setItem('foodrush_address', checkoutAddress);
  }, [checkoutAddress]);

  useEffect(() => {
    safeStorage.setItem('foodrush_phone', checkoutPhone);
  }, [checkoutPhone]);

  useEffect(() => {
    safeStorage.setItem('foodrush_cart', JSON.stringify(cart));
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
      setDeliveryRatingValue(5);
      setDeliveryFeedbackComment('');
    }
  }, [activeOrderId]);

  // Set shared order automatically on load if param is present
  useEffect(() => {
    if (sharedOrderParam) {
      setActiveOrderId(sharedOrderParam);
      setCurrentRole('customer');
    }
  }, [sharedOrderParam]);

  const handleClearSharedView = () => {
    setActiveOrderId(null);
    setSharedOrderParam(null);
    try {
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleShareTracking = (orderId: string) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/?sharedOrderId=${orderId}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'FoodRush Live Order Status',
        text: `Hey, trace my FoodRush delivery status in real-time!`,
        url: shareUrl,
      }).catch(err => {
        console.log('Error sharing:', err);
        navigator.clipboard.writeText(shareUrl);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 3000);
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 3000);
    }
  };

  const handleDownloadReceipt = (order: Order) => {
    let receiptContent = `======================================\n`;
    receiptContent += `         FOODRUSH RECEIPT\n`;
    receiptContent += `======================================\n\n`;
    receiptContent += `Order ID: #${order.id}\n`;
    receiptContent += `Date: ${new Date(order.createdAt).toLocaleString()}\n`;
    receiptContent += `Restaurant: ${order.restaurantName}\n`;
    receiptContent += `--------------------------------------\n`;
    order.items.forEach(item => {
      receiptContent += `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    receiptContent += `--------------------------------------\n`;
    receiptContent += `Total: $${order.total.toFixed(2)}\n`;
    receiptContent += `Payment Method: ${order.paymentMethod.toUpperCase()}\n\n`;
    receiptContent += `Customer: ${order.customerName}\n`;
    receiptContent += `Delivery To: ${order.customerAddress}\n`;
    if (order.deliveryNote) {
      receiptContent += `Note: ${order.deliveryNote}\n`;
    }
    receiptContent += `\nThank you for ordering with FoodRush!\n`;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdfReceipt = async (order: Order) => {
    try {
      if (pdfLayoutFormat === 'thermal') {
        const thermalHeight = Math.max(150, 115 + (order.items.length * 8) + (order.deliveryNote ? 15 : 0) + (includeQrOnReceipt ? 45 : 0));
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [80, thermalHeight]
        });

        // Add faint, diagonal background watermarks (ensuring text legibility)
        doc.setTextColor(245, 245, 246);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('FoodRush', 40, 50, { align: 'center', angle: 320 });
        doc.text('FoodRush', 40, 100, { align: 'center', angle: 320 });
        if (thermalHeight > 185) {
          doc.text('FoodRush', 40, 155, { align: 'center', angle: 320 });
        }

        // Set standard font
        doc.setFont('helvetica', 'normal');

        // Circular badge top center
        doc.setFillColor(30, 41, 59); // Black-slate
        doc.circle(40, 12, 5, 'F'); // Radius 5mm at X=40, Y=12

        // Monogram FR inside
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('FR', 40, 14.5, { align: 'center' });

        // Header Wordmark
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text('FoodRush Ltd.', 40, 22, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('HYPERLOCAL DELIVERIES & GASTRONOMY', 40, 25.5, { align: 'center' });

        // Dashed divider line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 1.5], 0);
        doc.line(8, 29, 72, 29);
        doc.setLineDashPattern([], 0); // Reset

        // Order Metadata
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ORDER METADATA', 8, 34);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);

        let y = 39;
        doc.text('Order ID:', 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`#${order.id}`, 30, y);

        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Placed Time:', 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(new Date(order.createdAt).toLocaleString(), 30, y);

        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Merchant:', 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(order.restaurantName, 30, y);

        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Payment Mode:', 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(order.paymentMethod ? order.paymentMethod.toUpperCase() : 'DEBIT CARD', 30, y);

        y += 6;
        // Recipient / Dest
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('LOGISTICS DESTINATION', 8, y);
        
        y += 5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text('Recipient:', 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(order.customerName || 'Loyal Customer', 30, y);

        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Address:', 8, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const addressLines = doc.splitTextToSize(order.customerAddress || 'Google AI Studio Workstation', 42);
        doc.text(addressLines, 30, y);

        y += addressLines.length * 3.5 + 1;

        if (order.deliveryNote) {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(100, 116, 139);
          doc.text('Note:', 8, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          const noteLines = doc.splitTextToSize(order.deliveryNote, 42);
          doc.text(noteLines, 30, y);
          y += noteLines.length * 3.5 + 1;
        }

        y += 3;
        // Dashed divider line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 1.5], 0);
        doc.line(8, y, 72, y);
        doc.setLineDashPattern([], 0); // Reset

        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('GASTRONOMY INVENTORY', 8, y);

        y += 5;
        // Table columns headers
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('ITEM', 8, y);
        doc.text('QTY', 48, y, { align: 'center' });
        doc.text('SUBTOTAL', 72, y, { align: 'right' });

        y += 3;
        doc.line(8, y, 72, y);
        
        y += 4;
        let itemsSubtotal = 0;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);

        order.items.forEach((item) => {
          const itemCost = item.price * item.quantity;
          itemsSubtotal += itemCost;

          const itemNameLines = doc.splitTextToSize(item.name, 36);
          const lineY = y;
          doc.text(itemNameLines, 8, lineY);
          
          doc.text(item.quantity.toString(), 48, lineY, { align: 'center' });
          doc.text(`$${itemCost.toFixed(2)}`, 72, lineY, { align: 'right' });

          y += Math.max(itemNameLines.length * 3.5, 5);
        });

        y += 2;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 1.5], 0);
        doc.line(8, y, 72, y);
        doc.setLineDashPattern([], 0); // Reset

        y += 5;
        // Summary pricing
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        
        doc.text('Items Subtotal:', 45, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(`$${itemsSubtotal.toFixed(2)}`, 72, y, { align: 'right' });

        y += 4;
        doc.setTextColor(100, 116, 139);
        const deliveryFeeValue = (order.deliveryFee !== undefined) ? order.deliveryFee : 2.99;
        doc.text('Dispatch Fee:', 45, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(deliveryFeeValue === 0 ? 'FREE' : `$${deliveryFeeValue.toFixed(2)}`, 72, y, { align: 'right' });

        y += 4;
        doc.setTextColor(100, 116, 139);
        const serviceTax = 1.50;
        doc.text('Tax & Surcharge:', 45, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(`$${serviceTax.toFixed(2)}`, 72, y, { align: 'right' });

        const discount = Math.max(0, (itemsSubtotal + deliveryFeeValue + serviceTax) - order.total);
        if (discount > 0) {
          y += 4;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38);
          doc.text('Discount:', 45, y, { align: 'right' });
          doc.text(`-$${discount.toFixed(2)}`, 72, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
        }

        y += 6;
        // Double lines for grand total
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(35, y - 4, 72, y - 4);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text('GRAND TOTAL:', 45, y);
        doc.text(`$${order.total.toFixed(2)}`, 72, y, { align: 'right' });

        doc.line(35, y + 1.5, 72, y + 1.5);

        // 6. QR Code inside thermal
        if (includeQrOnReceipt) {
          try {
            const qrContent = JSON.stringify({
              foodrush_id: order.id,
              restaurant: order.restaurantName,
              itemsCount: order.items.length,
              totalAmount: `$${order.total.toFixed(2)}`,
              payment: order.paymentMethod || 'PAYPAL',
              verifiedAt: new Date().toISOString()
            });

            const qrDataUrl = await QRCode.toDataURL(qrContent, { errorCorrectionLevel: 'M', margin: 1 });
            
            y += 10;
            doc.addImage(qrDataUrl, 'PNG', 28, y, 24, 24);

            y += 28;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(30, 41, 59);
            doc.text('STAFF VERIFICATION GATEWAY', 40, y, { align: 'center' });

            y += 4.5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            const scanHelpLines = doc.splitTextToSize('Staff scan the code above with any terminal to access internal order support and route details instantly.', 64);
            doc.text(scanHelpLines, 40, y, { align: 'center' });
            y += scanHelpLines.length * 3 + 2;
          } catch (qrErr) {
            console.warn('Failed to embed QR Code in thermal PDF:', qrErr);
          }
        } else {
          y += 12;
        }

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text('Seattle, WA • United States', 40, y, { align: 'center' });
        y += 3.5;
        doc.text('Powered by Google AI Studio Build', 40, y, { align: 'center' });

        doc.save(`FoodRush-ThermalReceipt-${order.id}.pdf`);

        addToast(
          'Print Receipt',
          `Your printable POS thermal receipt for Order #${order.id} is downloaded and ready.`,
          <Printer className="w-5 h-5 text-orange-500" />
        );
      } else {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        // Add faint, diagonal background watermarks (ensuring text legibility)
        doc.setTextColor(244, 244, 246);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(54);
        doc.text('FoodRush', 105, 100, { align: 'center', angle: 315 });
        doc.text('FoodRush', 105, 200, { align: 'center', angle: 315 });

        // Set standard font
        doc.setFont('helvetica', 'normal');

        // 1. BRAND HEADER & CUSTOM VECTOR LOGO
        // Brand Bar Highlight Accents
        doc.setFillColor(234, 88, 12); // #ea580c (Orange-600)
        doc.rect(15, 12, 180, 1.5, 'F'); // Top accent strip

        // Elegant circular badge representation of FoodRush brand
        doc.setFillColor(234, 88, 12);
        doc.circle(23, 23, 7, 'F'); // Radius 7mm at center X=23, Y=23

        // Monogram FR inside the circle
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('FR', 23, 26.5, { align: 'center' });

        // Fast-forward delivery dash trails behind the circle to convey motion
        doc.setDrawColor(251, 146, 60); // orange-400
        doc.setLineWidth(1.0);
        doc.line(32, 20.5, 42, 20.5);
        doc.line(32, 23, 38, 23);

        // Main Brand Wordmark next to badge
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('FoodRush', 38, 24);

        // Suffix orange dot marker
        doc.setTextColor(234, 88, 12);
        doc.text('.', 74, 24);

        // On-demand logistics subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('HYPERLOCAL ON-DEMAND DELIVERIES & GASTRONOMY SQUAD', 38, 28);

        // Professional print badge certifying logistical scanning
        doc.setFillColor(254, 243, 199); // amber-100
        doc.rect(138, 16, 57, 10, 'F');
        doc.setDrawColor(251, 191, 36); // amber-400
        doc.setLineWidth(0.35);
        doc.rect(138, 16, 57, 10, 'D');

        doc.setTextColor(180, 83, 9); // amber-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('LOGISTICS SCAN CERTIFIED', 166.5, 22.5, { align: 'center' });

        // Solid dividing line below header banner
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.4);
        doc.line(15, 34, 195, 34);

        // 2. RECEIPT METADATA BLOCK
        doc.setTextColor(30, 41, 59); // slate-800
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('1. ORDER METADATA', 15, 43);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        
        const leftColX = 15;
        const rightColX = 110;
        let y = 52;

        // Group metadata block with elegant light card outline
        doc.setFillColor(248, 250, 252); // slate-50 background card
        doc.rect(15, 46, 180, 24, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.rect(15, 46, 180, 24, 'D');

        // Row 1 Metadata
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text('Order Reference ID:', leftColX + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`#${order.id}`, leftColX + 42, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Placed Time:', rightColX + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(new Date(order.createdAt).toLocaleString(), rightColX + 30, y);

        y += 8;

        // Row 2 Metadata
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Restaurant / Merchant:', leftColX + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(order.restaurantName, leftColX + 42, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Payment Gateway:', rightColX + 4, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(order.paymentMethod ? order.paymentMethod.toUpperCase() : 'DEBIT CARD', rightColX + 42, y);

        y += 18;

        // 3. SECURE DELIVERY INFORMATION
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('2. SECURE LOGISTICS & DESTINATION', 15, y - 4);

        // Light card summary for Destination
        const noteOffsetHeight = order.deliveryNote ? 25 : 17;
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y - 1.5, 180, noteOffsetHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.25);
        doc.rect(15, y - 1.5, 180, noteOffsetHeight, 'D');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        // Recipient
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Recipient Name:', leftColX + 4, y + 4);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(order.customerName || 'Loyal Customer', leftColX + 36, y + 4);

        // Destination Address - Auto wrapping text meticulously
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text('Destination Address:', leftColX + 4, y + 10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        const addressLines = doc.splitTextToSize(order.customerAddress || 'Google AI Studio Workstation', 135);
        doc.text(addressLines, leftColX + 36, y + 10);

        y += 10 + (addressLines.length * 4.5);

        if (order.deliveryNote) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text('Logistics Instructions:', leftColX + 4, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          const noteLines = doc.splitTextToSize(order.deliveryNote, 135);
          doc.text(noteLines, leftColX + 36, y);
          y += noteLines.length * 4.5;
        }

        y += 14;

        // 4. ORDER ITEMS TABLE HEADER
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('3. COMPREHENSIVE GASTRONOMY INVENTORY', 15, y - 4);

        // Table Header Frame
        doc.setFillColor(30, 41, 59); // deep slate background
        doc.rect(15, y - 1, 180, 8, 'F');

        // Table Column Titles
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('ITEM DESCRIPTION', 19, y + 4.5);
        doc.text('UNIT PRICE', 120, y + 4.5, { align: 'right' });
        doc.text('QTY', 150, y + 4.5, { align: 'center' });
        doc.text('LINE SUBTOTAL', 191, y + 4.5, { align: 'right' });

        y += 10;

        // Table Rows with exquisite spacing and subtle padded borders
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        let itemsSubtotal = 0;
        
        order.items.forEach((item, index) => {
          const itemCost = item.price * item.quantity;
          itemsSubtotal += itemCost;

          const itemNameLines = doc.splitTextToSize(item.name, 90);
          const rowHeight = Math.max(itemNameLines.length * 5, 12); // Padded row height

          // Draw light grey background for alternating items
          if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, y - 3, 180, rowHeight, 'F');
          }

          // Draw super fine borderline
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(15, y + rowHeight - 3, 195, y + rowHeight - 3);

          // Render values
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(itemNameLines, 19, y + 4);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(`$${item.price.toFixed(2)}`, 120, y + 4, { align: 'right' });
          doc.text(item.quantity.toString(), 150, y + 4, { align: 'center' });

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`$${itemCost.toFixed(2)}`, 191, y + 4, { align: 'right' });

          y += rowHeight;
        });

        y += 5;

        // 5. SUMMARY PRICING BLOCK
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const summaryLabelX = 145;
        const summaryValueX = 191;

        // Items Subtotal
        doc.setTextColor(100, 116, 139);
        doc.text('Items Subtotal:', summaryLabelX, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(`$${itemsSubtotal.toFixed(2)}`, summaryValueX, y, { align: 'right' });
        y += 6;

        // Delivery Fee
        doc.setTextColor(100, 116, 139);
        const deliveryFeeValue = (order.deliveryFee !== undefined) ? order.deliveryFee : 2.99;
        doc.text('Secure Logistics Dispatch Fee:', summaryLabelX, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(deliveryFeeValue === 0 ? 'FREE (VIP)' : `$${deliveryFeeValue.toFixed(2)}`, summaryValueX, y, { align: 'right' });
        y += 6;

        // Service Fee/Tax
        doc.setTextColor(100, 116, 139);
        const serviceTax = 1.50;
        doc.text('State Surcharges & Tax:', summaryLabelX, y, { align: 'right' });
        doc.setTextColor(15, 23, 42);
        doc.text(`$${serviceTax.toFixed(2)}`, summaryValueX, y, { align: 'right' });
        y += 6;

        // Discount
        const discount = Math.max(0, (itemsSubtotal + deliveryFeeValue + serviceTax) - order.total);
        if (discount > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(220, 38, 38); // red-600
          doc.text('Discount Subventions:', summaryLabelX, y, { align: 'right' });
          doc.text(`-$${discount.toFixed(2)}`, summaryValueX, y, { align: 'right' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          y += 6;
        }

        // Grand Total Premium Frame
        doc.setFillColor(254, 242, 238); // orange-50 very soft hue
        doc.rect(110, y - 4, 85, 11, 'F');
        doc.setDrawColor(253, 186, 116); // orange-300
        doc.rect(110, y - 4, 85, 11, 'D');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 41, 59);
        doc.text('Authenticated Grand Total:', summaryLabelX, y + 3, { align: 'right' });
        doc.setTextColor(234, 88, 12); // Orange-600
        doc.setFontSize(12);
        doc.text(`$${order.total.toFixed(2)}`, summaryValueX, y + 3, { align: 'right' });

        // 6. STAFF SEAMLESS VERIFICATION QR
        if (includeQrOnReceipt) {
          try {
            const qrContent = JSON.stringify({
              foodrush_id: order.id,
              restaurant: order.restaurantName,
              itemsCount: order.items.length,
              totalAmount: `$${order.total.toFixed(2)}`,
              payment: order.paymentMethod || 'PAYPAL',
              verifiedAt: new Date().toISOString()
            });
            
            // Generate base64 representation of QR Code
            const qrDataUrl = await QRCode.toDataURL(qrContent, { errorCorrectionLevel: 'M', margin: 1 });
            
            const qrY = 225;
            doc.setDrawColor(226, 232, 240); // slate-200
            doc.setFillColor(250, 250, 250); // slight off-white
            doc.rect(15, qrY, 180, 36, 'FD');
    
            // Draw QR Image
            doc.addImage(qrDataUrl, 'PNG', 18, qrY + 3, 30, 30);
    
            // Add verification details
            doc.setTextColor(30, 41, 59); // slate-800
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.text('STAFF VERIFICATION GATEWAY', 52, qrY + 7);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text('Scan this QR code with any FoodRush logistics scanner or courier handheld terminal to instantly check order verification, validate rider association, and view real-time GPS tracking logs.', 52, qrY + 12, { maxWidth: 135 });
    
            // Add 'Scan for Support' block
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(234, 88, 12); // Orange-600
            doc.text('Scan for Support:', 52, qrY + 24);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(71, 85, 105); // slate-600
            doc.text('Staff can scan this code to instantly open the live order details and dispatch timeline in the internal Admin Portal.', 77, qrY + 24, { maxWidth: 110 });
    
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184); // slate-400
            doc.text('Authorized Personnel Only • Secure Data Cryptographic Protocol v1.4', 52, qrY + 31);
          } catch (qrErr) {
            console.warn('Failed to embed QR Code in PDF:', qrErr);
          }
        }

        // Reset styles for watermark
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        // Footer watermark
        doc.text('Generating instant, delicious memories. Thank you for using FoodRush!', 105, 275, { align: 'center' });
        doc.text('Seattle, WA • United States • Powered by Google AI Studio Build', 105, 280, { align: 'center' });

        doc.save(`FoodRush-Receipt-${order.id}.pdf`);

        addToast(
          'Print Receipt',
          `Your printable PDF receipt for Order #${order.id} from ${order.restaurantName} is downloaded and ready.`,
          <Printer className="w-5 h-5 text-orange-500" />
        );
      }
    } catch (pdfErr) {
      console.error('PDF Generation Failure:', pdfErr);
      // Fallback to text download
      handleDownloadReceipt(order);
    }
  };

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
        const cachedRestaurants = safeStorage.getItem('foodrush_restaurants');
        const cachedOrders = safeStorage.getItem('foodrush_orders');
        const cachedRiders = safeStorage.getItem('foodrush_riders');
        const cachedAnalytics = safeStorage.getItem('foodrush_analytics');

        if (cachedRestaurants) setRestaurants(JSON.parse(cachedRestaurants));
        if (cachedOrders) setOrders(JSON.parse(cachedOrders));
        if (cachedRiders) setRiders(JSON.parse(cachedRiders));
        if (cachedAnalytics) setAnalytics(JSON.parse(cachedAnalytics));
      } catch (e) {
        console.warn('Failed to parse cached data', e);
      }

      // 1. Fetch Restaurants
      let restData = [];
      try {
        const res = await fetch('/api/restaurants');
        restData = await safeJson(res);
        if (!Array.isArray(restData) || restData.length === 0) {
          throw new Error('Restaurants response is empty or invalid.');
        }
      } catch (err) {
        console.warn('Failed to fetch from /api/restaurants, using local fallback seeds.', err);
        const cached = safeStorage.getItem('foodrush_restaurants');
        restData = cached ? JSON.parse(cached) : STATIC_FALLBACK_RESTAURANTS;
      }

      // 2. Fetch Orders
      let ordersData = [];
      try {
        const res = await fetch('/api/orders');
        ordersData = await safeJson(res);
      } catch (err) {
        console.warn('Failed to fetch from /api/orders, using cached or empty.', err);
        const cached = safeStorage.getItem('foodrush_orders');
        ordersData = cached ? JSON.parse(cached) : [];
      }

      // 3. Fetch Riders
      let ridersData = [];
      try {
        const res = await fetch('/api/riders');
        ridersData = await safeJson(res);
        if (!Array.isArray(ridersData) || ridersData.length === 0) {
          throw new Error('Riders response is empty or invalid.');
        }
      } catch (err) {
        console.warn('Failed to fetch from /api/riders, using fallback seeds.', err);
        const cached = safeStorage.getItem('foodrush_riders');
        ridersData = cached ? JSON.parse(cached) : STATIC_FALLBACK_RIDERS;
      }

      // 4. Fetch Analytics
      let analyticsData = null;
      try {
        const res = await fetch('/api/admin/analytics');
        analyticsData = await safeJson(res);
      } catch (err) {
        console.warn('Failed to fetch from /api/admin/analytics, using default analytics.', err);
        const cached = safeStorage.getItem('foodrush_analytics');
        analyticsData = cached ? JSON.parse(cached) : STATIC_FALLBACK_ANALYTICS;
      }

      setRestaurants(restData);
      setOrders(ordersData);
      setRiders(ridersData);
      setAnalytics(analyticsData);

      // Update cache
      try {
        safeStorage.setItem('foodrush_restaurants', JSON.stringify(restData));
        safeStorage.setItem('foodrush_orders', JSON.stringify(ordersData));
        safeStorage.setItem('foodrush_riders', JSON.stringify(ridersData));
        safeStorage.setItem('foodrush_analytics', JSON.stringify(analyticsData));
      } catch (cacheErr) {
        console.warn('Failed to update localStorage cache', cacheErr);
      }
    } catch (e) {
      console.warn('Error loading API seeds', e);
    } finally {
      setLoading(false);
    }
  };

  const silentSyncData = async () => {
    try {
      // 1. Fetch Restaurants
      let restData = null;
      try {
        const res = await fetch('/api/restaurants');
        restData = await safeJson(res);
      } catch (e) {}

      // 2. Fetch Orders
      let ordersData = null;
      try {
        const res = await fetch('/api/orders');
        ordersData = await safeJson(res);
      } catch (e) {}

      // 3. Fetch Riders
      let ridersData = null;
      try {
        const res = await fetch('/api/riders');
        ridersData = await safeJson(res);
      } catch (e) {}

      // 4. Fetch Analytics
      let analyticsData = null;
      try {
        const res = await fetch('/api/admin/analytics');
        analyticsData = await safeJson(res);
      } catch (e) {}

      if (restData && Array.isArray(restData) && restData.length > 0) {
        setRestaurants(restData);
        safeStorage.setItem('foodrush_restaurants', JSON.stringify(restData));
      }
      if (ordersData && Array.isArray(ordersData)) {
        setOrders(ordersData);
        safeStorage.setItem('foodrush_orders', JSON.stringify(ordersData));
      }
      if (ridersData && Array.isArray(ridersData) && ridersData.length > 0) {
        setRiders(ridersData);
        safeStorage.setItem('foodrush_riders', JSON.stringify(ridersData));
      }
      if (analyticsData) {
        setAnalytics(analyticsData);
        safeStorage.setItem('foodrush_analytics', JSON.stringify(analyticsData));
      }
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
    let deliveryFee = activeRest ? activeRest.deliveryFee : 0;
    
    if (isVip) {
      deliveryFee = 0; // VIP gets free delivery
    }
    
    const tax = subtotal * 0.09;
    let promoDiscount = promoApplied ? subtotal * 0.5 : 0; // 50% discount codes!
    
    // Calculate points discount: 100 points = $1
    const loyaltyDiscount = pointsRedeemed / 100;
    
    const discount = promoDiscount + loyaltyDiscount;
    const grandTotal = Math.max(0, subtotal + deliveryFee + tax + driverTip - discount);
    return { subtotal, deliveryFee, tax, discount, grandTotal, loyaltyDiscount, promoDiscount };
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
      customerName: userSession?.name || 'Aman Ahmed',
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
        
        // Update Loyalty Points
        const pointsEarned = Math.floor(totals.grandTotal * 10);
        setLoyaltyPoints(prev => prev - pointsRedeemed + pointsEarned);
        if (!isVip && (loyaltyPoints - pointsRedeemed + pointsEarned) >= 5000) {
          addToast('🎉 VIP Status Unlocked!', 'You have accumulated over 5000 points and unlocked lifetime VIP status with free deliveries!');
          setIsVip(true);
        }
        setPointsRedeemed(0);

        clearCart();
        setCheckoutStep(false);
        setActiveRestaurantId(null);
        // Switch to Customer tracking
        alert(`Order ${newlyCreated.id} successfully placed! You earned ${pointsEarned} loyalty points!`);
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

  const submitOrderRating = async (orderId: string, rating: number, comment?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/rating`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment })
      });
      if (res.ok) {
        const updatedOrder: Order = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        // Refetch chat logs so the user sees their feedback system-event in the timeline/messenger panel instantly
        if (activeOrderId === orderId) {
          fetchOrderChat(orderId);
        }
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

  // Render login screen if no live Google session is present and we're not viewing a shared order
  if (!userSession && !sharedOrderParam) {
    return (
      <GoogleLoginScreen
        onLoginSuccess={(session) => {
          setUserSession(session);
          setCurrentRole(session.role);
          safeStorage.setItem('foodrush_session2', JSON.stringify(session));
        }}
      />
    );
  }

  return (
    <div id="foodrush-app-container" className="min-h-screen bg-zinc-50 flex flex-col font-sans text-slate-900 selection:bg-orange-100 selection:text-orange-900">
      
      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-white border border-zinc-200 pointer-events-auto p-4 rounded-xl shadow-xl flex items-start gap-4 transform transition-all duration-300 w-[340px] animate-in slide-in-from-right-8 fade-in">
            {toast.icon && (
              <div className="text-orange-600 bg-orange-50 p-2 rounded-lg shrink-0">
                {toast.icon}
              </div>
            )}
            <div className="flex flex-col flex-1 mt-0.5">
              <h4 className="font-bold text-sm text-slate-800">{toast.title}</h4>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="text-zinc-400 hover:text-zinc-700 shrink-0 p-1 -mr-2">
              <X className="w-4 h-4"/>
            </button>
          </div>
        ))}
      </div>

      {/* GLOBAL BANNER SIMULATORS SWITCHER: Elegant interactive tool belt */}
      <div id="role-switcher" className="sticky top-0 z-50 bg-zinc-900 border-b border-zinc-800 text-white py-2 px-3 sm:px-4 flex flex-col md:flex-row gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center text-[10px] font-bold shrink-0">R</div>
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-orange-400">Environment Sandbox Workspace</span>
        </div>
        
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1 border border-zinc-700 overflow-x-auto max-w-full scrollbar-none no-scrollbar snap-x">
          <button
            onClick={() => { setCurrentRole('customer'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 flex-shrink-0 snap-start ${currentRole === 'customer' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" /> <span className="text-xs">Customer View</span>
          </button>
          <button
            onClick={() => { setCurrentRole('restaurant'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 flex-shrink-0 snap-start ${currentRole === 'restaurant' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <ChefHat className="w-3.5 h-3.5 shrink-0" /> <span className="text-xs">Restaurant Panel</span>
          </button>
          <button
            onClick={() => { setCurrentRole('rider'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 flex-shrink-0 snap-start ${currentRole === 'rider' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Bike className="w-3.5 h-3.5 shrink-0" /> <span className="text-xs">Delivery Rider App</span>
          </button>
          {userSession?.email?.trim()?.toLowerCase() === 'amanfmfb1215@gmail.com' && (
            <button
              onClick={() => { setCurrentRole('admin'); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 flex-shrink-0 snap-start ${currentRole === 'admin' ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
            >
              <Building className="w-3.5 h-3.5 shrink-0" /> <span className="text-xs">Admin Dashboard</span>
            </button>
          )}
        </div>

        <div className="hidden lg:flex items-center gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Node Service Online (Port 3000)</span>
        </div>
      </div>

      {/* SLEEK MAIN PREMIUM FRAMEWORK */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* PREMIUM SHARED HEADER ELEMENT */}
        <header id="app-header" className="h-20 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between flex-none gap-2">
          <div className="flex items-center gap-4 md:gap-8">
            <div className="flex items-center gap-2">
              <div id="brand-logo" className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 flex items-center justify-center shadow-md shadow-orange-500/15 flex-shrink-0 border border-orange-400/20">
                <Flame className="w-5 h-5 text-white fill-amber-300" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-orange-600">FoodRush</span>
            </div>
            
            {/* Real Address locator display matching Sleek style */}
            <div className="hidden md:flex items-center bg-zinc-100 rounded-full px-4 py-1.5 gap-2 border border-zinc-200">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
              <span className="text-xs font-semibold text-zinc-800">Seattle HQ • 4th Avenue</span>
              <span className="text-[10px] text-zinc-400 bg-white px-2 py-0.5 rounded-full border border-zinc-200">Suite 404</span>
            </div>
          </div>

          <div className="flex-1 max-w-sm mx-4 lg:mx-8 hidden sm:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search dishes, tacos, burger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl py-2 pl-10 pr-4 text-xs focus:ring-2 focus:ring-orange-500/20 text-slate-900"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              id="ai-assistant-toggle"
              onClick={() => setChatbotOpen(true)}
              className="flex items-center gap-1 bg-orange-50 text-orange-600 border border-orange-200 rounded-full px-2.5 sm:px-3.5 py-1.5 text-xs font-bold hover:bg-orange-100 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600 animate-pulse shrink-0" />
              <span className="hidden min-[400px]:inline">Ask AI</span>
              <span className="hidden md:inline"> Chatbot</span>
            </button>

            {/* Micro layout cart pointer trigger */}
            <button 
              onClick={() => { setCurrentRole('customer'); setIsCartOpen(!isCartOpen); }}
              className="relative p-2 text-zinc-600 bg-zinc-100 rounded-full hover:bg-zinc-200/80 transition-all shrink-0"
            >
              <ShoppingBag className="w-5 h-5 text-zinc-700" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-black">
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </span>
              )}
            </button>

            {userSession && (
              <div className="flex items-center gap-2">
                <div 
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 pl-2 bg-zinc-50 border border-zinc-200 p-1.5 rounded-2xl transition cursor-pointer hover:bg-zinc-100 hover:border-zinc-300"
                  title="Edit Profile"
                >
                  <img src={userSession.avatar} className="w-7 h-7 rounded-lg bg-zinc-200 p-0.5 border border-zinc-300 pointer-events-none" alt="Google Profile" />
                  <div className="hidden lg:flex flex-col text-left text-[11px] leading-tight pr-1 pointer-events-none">
                    <span className="font-extrabold text-slate-800 truncate max-w-[110px]">{userSession.name}</span>
                    <span className="text-zinc-500 font-mono text-[9px] truncate max-w-[110px]">{userSession.email}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      safeStorage.removeItem('foodrush_session2');
                      setUserSession(null);
                    }}
                    title="Sign Out of Google"
                    className="p-1 px-1.5 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-lg flex items-center gap-1 transition select-none cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

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
                    onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(false); setShowLoyalty(false); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${!activeRestaurantId && !activeOrderId && !showOrderHistory && !showLoyalty ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Compass className="w-4 h-4" /> Discover Restaurants
                  </button>
                  <button
                    onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(true); setShowLoyalty(false); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${showOrderHistory && !showLoyalty ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Clock className="w-4 h-4" /> Order History
                  </button>
                  <button
                    onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(false); setShowLoyalty(true); }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${showLoyalty ? 'bg-orange-50 text-orange-600' : 'text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <Star className="w-4 h-4" /> Loyalty & Rewards
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
              <main className="flex-1 p-4 sm:p-6 overflow-y-auto flex flex-col gap-4 sm:gap-6 min-w-0">
                
                {/* Responsive Top Navigation and Shortcuts for Mobile (lg:hidden) */}
                <div className="lg:hidden flex flex-col gap-3 flex-none">
                  <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200 w-full overflow-x-auto">
                    <button
                      onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(false); setShowLoyalty(false); }}
                      className={`flex-[1_0_auto] px-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${!activeRestaurantId && !activeOrderId && !showOrderHistory && !showLoyalty ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                    >
                      <Compass className="w-4 h-4" />
                      <span>Discover</span>
                    </button>
                    <button
                      onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(true); setShowLoyalty(false); }}
                      className={`flex-[1_0_auto] px-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${showOrderHistory && !activeRestaurantId && !activeOrderId && !showLoyalty ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                    >
                      <Clock className="w-4 h-4" />
                      <span>History</span>
                    </button>
                    <button
                      onClick={() => { setActiveRestaurantId(null); setActiveOrderId(null); setShowOrderHistory(false); setShowLoyalty(true); }}
                      className={`flex-[1_0_auto] px-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${showLoyalty ? 'bg-orange-600 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-950'}`}
                    >
                      <Star className="w-4 h-4" />
                      <span>Loyalty</span>
                    </button>
                  </div>
                  
                  {/* Micro Carousel for active orders on mobile, so they can trace their active delivery immediately */}
                  {orders.some(o => o.status !== 'delivered' && o.status !== 'cancelled') && (
                    <div className="flex flex-col gap-1.5 bg-orange-50/50 border border-orange-100 p-3 rounded-2xl">
                      <span className="text-[10px] font-black text-orange-700 tracking-wider uppercase flex items-center gap-1">✨ Active Tracking Line ({orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})</span>
                      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar snap-x">
                        {orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').map((order) => (
                          <button
                            key={order.id}
                            onClick={() => { setActiveOrderId(order.id); setActiveRestaurantId(null); setShowOrderHistory(false); }}
                            className="flex-shrink-0 bg-white hover:bg-orange-50 text-left p-2.5 rounded-xl border border-orange-200/60 shadow-xs flex items-center gap-3 snap-start"
                          >
                            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0">
                              {order.status === 'placed' || order.status === 'accepted' ? '⏳' : '🏍️'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-mono font-bold text-zinc-500">#{order.id}</span>
                                <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded uppercase shrink-0">{order.status}</span>
                              </div>
                              <p className="text-xs font-bold text-zinc-800 truncate max-w-[120px]">{order.restaurantName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Responsive mobile search bar (replaces the header search hidden on < 640px) */}
                  <div className="block sm:hidden">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search cuisines, cafes, biryani..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-2xl py-3 pl-11 pr-4 text-xs focus:ring-2 focus:ring-orange-500/20 text-slate-900 shadow-xs focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-3.5" />
                    </div>
                  </div>
                </div>

                {/* 1. Discover List View */}
                {!activeRestaurantId && !activeOrderId && !showOrderHistory && !showLoyalty && (
                  <>
                    {/* Sleek Gradient Banner */}
                    <section id="promo-banner" className="min-h-[14rem] sm:min-h-0 sm:h-44 bg-gradient-to-r from-orange-500 to-rose-500 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center text-white relative overflow-hidden flex-none shadow-sm gap-4">
                      <div className="z-10 max-w-md relative">
                        <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold mb-3backdrop-blur-md uppercase tracking-wider">AI Recommendation & Smart Delivery</span>
                        <h2 className="text-2xl sm:text-3xl font-black mb-1.5 leading-tight tracking-tight">FoodRush Lightning Speeds</h2>
                        <p className="text-xs text-orange-100 mb-3 font-medium">Enjoy secure contactless handshakes, full GPS navigation, and customized chef recommendations.</p>
                        
                        <div className="flex flex-wrap gap-2 text-[10px]">
                          <button
                            onClick={() => handleFetchQuickPredict('healthy')}
                            className="bg-white/10 hover:bg-white/20 transition px-3 py-1 text-[11px] rounded-lg font-bold border border-white/20"
                          >
                            ☘️ Healthy Acai Bowl Suggestions
                          </button>
                          <button
                            onClick={() => handleFetchQuickPredict('indulgent')}
                            className="bg-white/10 hover:bg-white/20 transition px-3 py-1 text-[11px] text-left rounded-lg font-bold border border-white/20"
                          >
                            🍔 Truffle Cheeseburger Matcher
                          </button>
                        </div>
                      </div>
                      <div className="absolute right-[-10px] top-[-10px] w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                      <div className="z-10 bg-white/15 backdrop-blur-xl p-4 rounded-2xl border border-white/20 text-white hidden md:block shrink-0">
                        <p className="text-[10px] opacity-90 uppercase tracking-widest font-black">Trending Spot</p>
                        <p className="font-extrabold text-sm">BurgerBite Co.</p>
                        <div className="flex items-center gap-1 mt-1 text-yellow-300 font-bold">
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
                {showOrderHistory && !activeRestaurantId && !activeOrderId && !showLoyalty && (
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
                                    {order.status === 'delivered' && (
                                      <div className="flex items-center gap-1 mt-2">
                                        <span className="text-[10px] text-zinc-400 mr-1">Rate:</span>
                                        {[1, 2, 3, 4, 5].map(star => (
                                          <button key={star} onClick={() => submitOrderRating(order.id, star)} className="text-amber-400 hover:scale-110 transition">
                                            {order.rating && star <= order.rating ? '★' : '☆'}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-3 flex items-center gap-2">
                                      <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Stage:</span>
                                      {(() => {
                                        switch (order.status) {
                                          case 'placed':
                                          case 'accepted':
                                            return <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">Processing</span>;
                                          case 'preparing':
                                            return (
                                              <div className="flex items-center gap-2">
                                                <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">Preparing</span>
                                                {order.prepTimeRemaining !== undefined && <OrderTimer initialMinutes={order.prepTimeRemaining} />}
                                              </div>
                                            );
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
                                  <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button
                                      onClick={() => {
                                        setActiveOrderId(order.id);
                                        setShowOrderHistory(false);
                                        setTrackingViewMode('map');
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="bg-orange-100 hover:bg-orange-200 text-orange-700 font-bold py-2 px-4 rounded-xl text-xs flex-1 sm:flex-none transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                                    >
                                      <MapPin className="w-3.5 h-3.5" /> Map
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (rest) {
                                          if (rest.isOpen) {
                                            const validItems = order.items.map(i => ({ item: rest.menu.find(m => m.name === i.name)!, quantity: i.quantity, restaurantId: rest.id })).filter(i => i.item);
                                            setReorderDraft({ orderId: order.id, restaurantName: order.restaurantName, items: validItems });
                                          } else {
                                            alert('Sorry, this restaurant is currently closed. Please try ordering again during their operating hours.');
                                          }
                                        } else {
                                          alert('Restaurant no longer available.');
                                        }
                                      }}
                                      className="bg-zinc-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl text-xs flex-1 sm:flex-none transition-colors"
                                    >
                                      Reorder
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  </div>
                )}

                {/* 1.7 Loyalty & Rewards View */}
                {showLoyalty && !activeRestaurantId && !activeOrderId && !showOrderHistory && (
                  <div className="flex flex-col gap-6">
                    <section className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-200">
                      <div className="flex justify-between items-center border-b border-zinc-100 pb-4 mb-4">
                        <h2 className="text-xl font-black text-slate-800">Loyalty & VIP Program</h2>
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                           <Star className="w-4 h-4 text-orange-500" />
                           <span className="text-sm font-black text-orange-900">{loyaltyPoints} Points</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* VIP Status Card */}
                        <div className={`p-6 rounded-2xl border ${isVip ? 'bg-gradient-to-br from-amber-50 to-orange-100 border-amber-200' : 'bg-zinc-50 border-zinc-200'}`}>
                          <div className="flex items-start justify-between mb-2">
                             <h3 className="text-lg font-black text-slate-800">{isVip ? 'VIP Member' : 'Standard Tier'}</h3>
                             {isVip && <span className="bg-orange-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full shadow-sm">Active</span>}
                          </div>
                          <p className="text-xs text-zinc-600 leading-relaxed mb-4">
                             {isVip ? 'You have unlocked lifetime VIP status! Enjoy free deliveries on every order and exclusive surprise perks.' : 'Earn 5000 points to unlock lifetime VIP status for permanent free delivery on all orders!'}
                          </p>
                          
                          {!isVip && (
                             <div className="relative w-full h-2 bg-zinc-200 rounded-full overflow-hidden mt-4">
                                <div className="absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all" style={{ width: `${Math.min(100, (loyaltyPoints / 5000) * 100)}%`}}></div>
                             </div>
                          )}
                          {!isVip && <p className="text-[10px] text-zinc-400 mt-1.5 font-medium">{Math.max(0, 5000 - loyaltyPoints)} points until VIP</p>}
                        </div>

                        {/* Earn Points Actions */}
                        <div className="flex flex-col gap-3">
                          <h4 className="text-sm font-bold text-slate-800">Earn More Points</h4>
                          
                          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex justify-between items-center shadow-sm">
                            <div>
                               <p className="text-xs font-black text-slate-800 text-left">Order Food</p>
                               <p className="text-[10px] text-zinc-500 mt-0.5 text-left">10 points for every $1 spent</p>
                            </div>
                            <button onClick={() => setShowLoyalty(false)} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">Order Now</button>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex justify-between items-center shadow-sm">
                            <div>
                               <p className="text-xs font-black text-slate-800 text-left">Refer a Friend</p>
                               <p className="text-[10px] text-zinc-500 mt-0.5 text-left">Earn 500 points per referral</p>
                            </div>
                            <button 
                              onClick={() => {
                                setLoyaltyPoints(prev => prev + 500);
                                addToast('Referral Sent!', '500 bonus points have been added to your account!', <Star className="text-orange-500 w-5 h-5" />);
                              }} 
                              className="bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                            >Share Link</button>
                          </div>
                        </div>

                      </div>

                      {/* Points History dummy */}
                      <div className="mt-8">
                         <h4 className="text-sm font-bold text-slate-800 border-b border-zinc-100 pb-2 mb-3 text-left">Recent Activity</h4>
                         <div className="flex flex-col gap-2">
                           <div className="flex justify-between items-center text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                             <span>Welcome Bonus</span>
                             <span className="font-bold text-green-600">+150 pts</span>
                           </div>
                         </div>
                      </div>

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
                           <div className="rounded-3xl overflow-hidden border border-zinc-200 relative h-48 sm:h-56 shadow-sm flex-none">
                             <img src={rest.bannerImage} className="w-full h-full object-cover filter brightness-[0.65]" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent flex flex-col justify-end p-4 sm:p-6 text-white gap-1">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <h1 className="text-xl sm:text-2xl font-black leading-tight">{rest.name}</h1>
                                 {rest.isVerified && (
                                   <span className="bg-orange-600 text-white rounded-full px-2 py-0.5 text-[9px] font-bold inline-block" title="Verified Chef Spot">✓ Verified</span>
                                 )}
                               </div>
                               <p className="text-[11px] sm:text-xs text-zinc-300 italic">{rest.cuisine.join(', ')}</p>
                               <div className="flex flex-wrap gap-x-3 gap-y-1.5 items-center text-[11px] sm:text-xs text-zinc-200 mt-1">
                                 <span className="flex items-center gap-1 shrink-0"><Clock className="w-3.5 h-3.5 text-orange-400" /> {rest.hours}</span>
                                 <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-400" /> {rest.address}</span>
                                 <span className="flex items-center gap-1 shrink-0"><Phone className="w-3.5 h-3.5 text-zinc-400" /> {rest.phoneNumber}</span>
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
                    <div className="flex items-center justify-between">
                      <button
                        onClick={handleClearSharedView}
                        className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-bold self-start cursor-pointer"
                      >
                        ← Back to Discover list
                      </button>
                      <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 shrink-0">
                        <button
                          onClick={() => setTrackingViewMode('map')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trackingViewMode === 'map' ? 'bg-white text-orange-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                          Live Tracking
                        </button>
                        <button
                          onClick={() => setTrackingViewMode('summary')}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trackingViewMode === 'summary' ? 'bg-white text-orange-600 shadow-sm border border-zinc-200' : 'text-zinc-500 hover:text-zinc-700'}`}
                        >
                          Status Summary
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const order = orders.find(o => o.id === activeOrderId);
                      if (!order) return <p>Could not locate active order data.</p>;
                      return (
                        <>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          
                          {/* Live delivery status timeline */}
                          <div className="lg:col-span-2 flex flex-col gap-6 bg-white p-6 rounded-3xl border border-zinc-200 shadow-sm">
                            
                            {sharedOrderParam && (
                              <div className="bg-orange-50 border border-orange-200 px-4 py-3 rounded-2xl flex items-center justify-between gap-4 animate-fade-in">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-black text-orange-950">👋 Guest Shared Tracking</p>
                                  <p className="text-[10px] text-zinc-600">You are tracing a friend's live food or rider location. Set up your own Google profile to start ordering!</p>
                                </div>
                                <button
                                  onClick={handleClearSharedView}
                                  className="text-[10px] bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3 py-1.5 rounded-xl shrink-0 transition-all cursor-pointer shadow-sm"
                                >
                                  Register / Sign In
                                </button>
                              </div>
                            )}

                            <div className="flex justify-between items-start border-b border-zinc-100 pb-3 flex-wrap gap-2">
                              <div className="flex-1 min-w-[200px]">
                                <span className="text-[9px] bg-orange-100 text-orange-850 font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none">GPS Live Tracking Ready</span>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <h2 className="text-xl font-black text-slate-900">Tracing Delivery #{order.id}</h2>
                                  
                                  {/* Beautiful and professional action buttons */}
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      onClick={() => handleShareTracking(order.id)}
                                      className={`flex items-center gap-1.5 border px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm ${copiedState ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-200' : 'bg-zinc-50 hover:bg-orange-50 text-zinc-700 hover:text-orange-700 border-zinc-200 hover:border-orange-250'}`}
                                      title="Share live delivery tracking link with friends"
                                      id="btn-share-tracking"
                                    >
                                      {copiedState ? (
                                        <>
                                          <Check className="w-3.5 h-3.5" />
                                          <span>Link Copied!</span>
                                        </>
                                      ) : (
                                        <>
                                          <Share2 className="w-3.5 h-3.5 animate-pulse" />
                                          <span>Share Status</span>
                                        </>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleDownloadPdfReceipt(order)}
                                      className="flex items-center justify-center gap-1.5 border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 hover:border-orange-300 px-2.5 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-sm"
                                      title="Download Beautiful and Printable PDF Receipt"
                                      id="btn-download-pdf-receipt"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span>PDF Receipt</span>
                                    </button>
                                    <button
                                      onClick={() => handleDownloadReceipt(order)}
                                      className="flex items-center justify-center gap-1.5 border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer shadow-sm"
                                      title="Download Plain Text Receipt"
                                    >
                                      <span>TXT</span>
                                    </button>
                                    
                                    {/* Settings Toggle for PDF QR Code */}
                                    <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 px-2.5 py-1 rounded-xl text-[10px] font-bold text-zinc-600 shadow-sm">
                                      <span className="select-none">Receipt QR</span>
                                      <button
                                        onClick={() => setIncludeQrOnReceipt(prev => !prev)}
                                        className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${includeQrOnReceipt ? 'bg-orange-600' : 'bg-zinc-300'}`}
                                        title="Toggle QR code inclusion on PDF receipt"
                                        id="toggle-pdf-qr"
                                      >
                                        <span
                                          className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${includeQrOnReceipt ? 'translate-x-3' : 'translate-x-0'}`}
                                        />
                                      </button>
                                    </div>

                                    {/* Layout Format Dropdown Selector */}
                                    <div className="flex items-center gap-1.5 border border-zinc-200 bg-zinc-50 pl-2.5 pr-1.5 py-1 rounded-xl text-[10px] font-bold text-zinc-600 shadow-sm">
                                      <span className="select-none text-zinc-400">Format</span>
                                      <select
                                        value={pdfLayoutFormat}
                                        onChange={(e) => setPdfLayoutFormat(e.target.value as 'a4' | 'thermal')}
                                        className="bg-transparent text-zinc-700 outline-none cursor-pointer text-[10px] font-extrabold border-none p-0 focus:ring-0 focus:outline-none"
                                        title="Choose receipt print layout format"
                                        id="pdf-layout-selector"
                                      >
                                        <option value="a4" className="bg-white">A4 (Letter)</option>
                                        <option value="thermal" className="bg-white">Thermal (Roll)</option>
                                      </select>
                                      <button
                                        type="button"
                                        onClick={() => setShowPdfPreviewModal(true)}
                                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100/50 p-1 rounded-md transition-colors shadow-sm ml-1 flex items-center"
                                        title="Show Instant PDF Receipt Layout Preview"
                                        id="btn-trigger-pdf-preview"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-xs text-zinc-400 mt-1">From <strong>{order.restaurantName}</strong></p>
                                
                                <AnimatePresence>
                                  {includeQrOnReceipt && qrCodePreviewDataUrl && (
                                    <motion.div
                                      initial={{ opacity: 0, scale: 0.9, y: -4 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.9, y: -4 }}
                                      transition={{ duration: 0.25, ease: 'easeOut' }}
                                      className="mt-3 bg-orange-50 border border-orange-200/60 rounded-2xl p-3.5 flex gap-3.5 items-center shadow-sm select-none"
                                    >
                                      <div className="bg-white p-2 rounded-xl border border-orange-100 flex-shrink-0 shadow-sm">
                                        <img
                                          src={qrCodePreviewDataUrl}
                                          alt="Staff Verification QR Preview"
                                          className="w-12 h-12"
                                          referrerPolicy="no-referrer"
                                        />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                          <span className="text-[9px] text-orange-850 font-extrabold uppercase tracking-widest">
                                            Verification Gateway
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight font-medium max-w-sm">
                                          Toggle is active. Scan support QR code on your printed receipt to instantly locate or verify in the dispatcher terminal.
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                              <div className="flex flex-wrap items-center gap-4">
                                <CustomerOrderETA order={order} />
                                <div className="text-right">
                                  <p className="text-xs text-zinc-400">Total Charged</p>
                                  <p className="text-lg font-black text-orange-600">${order.total.toFixed(2)}</p>
                                  <p className="text-[10px] text-zinc-400 italic">via {order.paymentMethod}</p>
                                </div>
                              </div>
                            </div>

                            {/* Order Progress Bar */}
                            {(() => {
                              const { percent, label } = (() => {
                                switch (order.status) {
                                  case 'placed': return { percent: 15, label: 'Order Placed' };
                                  case 'accepted': return { percent: 30, label: 'Accepted by Restaurant' };
                                  case 'preparing': return { percent: 50, label: 'Preparing Food' };
                                  case 'ready': return { percent: 65, label: 'Food Ready for Pickup' };
                                  case 'dispatched': return { percent: 80, label: 'Courier Headed to Restaurant' };
                                  case 'picked_up': return { percent: 92, label: 'Courier Out for Delivery' };
                                  case 'delivered': return { percent: 100, label: 'Delivered!' };
                                  case 'cancelled': return { percent: 100, label: 'Cancelled' };
                                  default: return { percent: 15, label: 'Processing' };
                                }
                              })();

                              const milestones = [
                                { label: 'Placed', isDone: ['placed', 'accepted', 'preparing', 'ready', 'dispatched', 'picked_up', 'delivered'].includes(order.status), icon: '📝' },
                                { label: 'Preparing', isDone: ['preparing', 'ready', 'dispatched', 'picked_up', 'delivered'].includes(order.status), icon: '🍳' },
                                { label: 'In Transit', isDone: ['dispatched', 'picked_up', 'delivered'].includes(order.status), icon: '🛵' },
                                { label: 'Delivered', isDone: ['delivered'].includes(order.status), icon: '🎁' }
                              ];

                              const isCancelled = order.status === 'cancelled';

                              return (
                                <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 flex flex-col gap-4 shadow-sm">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                      <span className={`w-2.5 h-2.5 rounded-full ${isCancelled ? 'bg-rose-500' : 'bg-orange-500 animate-ping'}`} />
                                      <p className="text-sm font-black text-slate-800">
                                        Status: <span className={isCancelled ? 'text-rose-600' : 'text-orange-600'}>{label}</span>
                                      </p>
                                    </div>
                                    <span className="text-xs font-black text-zinc-500 bg-zinc-205/10 px-2.5 py-1 rounded-full border border-zinc-300">
                                      {isCancelled ? 'Cancelled' : `${percent}% Complete`}
                                    </span>
                                  </div>

                                  {/* Progress bar line */}
                                  <div className="relative w-full h-3 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                                        isCancelled 
                                          ? 'bg-rose-500' 
                                          : 'bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500'
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>

                                  {/* Milestone circles */}
                                  <div className="grid grid-cols-4 gap-2 text-center mt-1">
                                    {milestones.map((m, idx) => (
                                      <div key={idx} className="flex flex-col items-center gap-1.5">
                                        <div 
                                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm transition-all border ${
                                            isCancelled
                                              ? 'border-zinc-200 bg-zinc-100 opacity-55'
                                              : m.isDone
                                                ? 'bg-orange-500 border-orange-600 text-white font-bold scale-110 shadow-[0_0_8px_rgba(234,88,12,0.2)]'
                                                : 'bg-white border-zinc-200 text-zinc-400'
                                          }`}
                                        >
                                          <span>{m.icon}</span>
                                        </div>
                                        <span 
                                          className={`text-[10px] font-bold tracking-tight ${
                                            isCancelled
                                              ? 'text-zinc-400 font-medium'
                                              : m.isDone 
                                                ? 'text-orange-600 font-black' 
                                                : 'text-zinc-500'
                                          }`}
                                        >
                                          {m.label}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* GOOGLE MAPS PANEL OR DETAILED FALLBACK */}
                            <div className="border border-zinc-200 rounded-3xl overflow-hidden bg-zinc-950 relative h-96 shadow-md">
                              {trackingViewMode === 'map' ? (
                                <APIProvider apiKey={API_KEY} version="weekly">
                                  {(() => {
                                    const restCoords = translateGridToLatLng(40, 40);
                                    const custCoords = translateGridToLatLng(80, 75);
                                    const riderObj = riders.find(r => r.id === order.riderId || 'rider-1');
                                    const riderPos = riderObj ? riderObj.location : { lat: 25, lng: 30 };
                                    const realRiderCoords = translateGridToLatLng(riderPos.lat, riderPos.lng);

                                    return (
                                      <Map
                                        defaultCenter={{ lat: (restCoords.lat + custCoords.lat) / 2, lng: (restCoords.lng + custCoords.lng) / 2 }}
                                        defaultZoom={13}
                                        mapId="DEMO_MAP_ID"
                                        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                                        style={{ width: '100%', height: '100%' }}
                                        disableDefaultUI={false}
                                        gestureHandling="greedy"
                                      >
                                        {/* Auto-Centering and Interactive Driving Route Polylines */}
                                        <RouteDisplay origin={restCoords} destination={custCoords} />

                                        {/* 1. Restaurant Marker with InfoWindow */}
                                        <MapMarkerWithInfoWindow
                                          position={restCoords}
                                          title="Restaurant Hub Kitchen"
                                          pinColor="#ea580c"
                                          icon="🍳"
                                        >
                                          <div className="space-y-1 mt-1 text-xs text-zinc-650">
                                            <p className="font-bold text-zinc-950">{order.restaurantName}</p>
                                            <p>📍 Kitchen preparing your order</p>
                                            <p>🕒 Quick-dispatch certified partner</p>
                                          </div>
                                        </MapMarkerWithInfoWindow>

                                        {/* 2. Customer Address Marker with InfoWindow */}
                                        <MapMarkerWithInfoWindow
                                          position={custCoords}
                                          title="Delivery Destination"
                                          pinColor="#16a34a"
                                          icon="🏠"
                                        >
                                          <div className="space-y-1 mt-1 text-xs text-zinc-650">
                                            <p className="font-bold text-zinc-950">Dinner Drop-off Zone</p>
                                            <p className="truncate">📍 {checkoutAddress || 'Default Drop Location'}</p>
                                            <p>📱 {checkoutPhone || 'No contact specified'}</p>
                                          </div>
                                        </MapMarkerWithInfoWindow>

                                        {/* 3. Live Rider Marker with InfoWindow */}
                                        <RiderMarkerWithInfoWindow
                                          position={realRiderCoords}
                                          title="Live Dispatch Tracking"
                                          riderName={order.riderName || 'Zack'}
                                        >
                                          <div className="space-y-1 mt-1 text-xs text-zinc-650">
                                            <p className="font-bold text-zinc-950">Courier: {order.riderName || 'Zack'}</p>
                                            <p className="text-orange-600 font-extrabold flex items-center gap-1">
                                              <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping"></span>
                                              <span>Active GPS Route</span>
                                            </p>
                                            <p>🚲 Simulating route transit coordinates</p>
                                          </div>
                                        </RiderMarkerWithInfoWindow>
                                      </Map>
                                    );
                                  })()}
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
                                      <span className="text-[10px] text-zinc-400 font-bold">Status Summary Mode</span>
                                    </div>
                                    
                                    {!hasValidKey && (
                                      <>
                                        <h4 className="text-sm font-black text-white mt-1">Want to trace with live, interactive Google Maps?</h4>
                                        <p className="text-[11px] text-zinc-400 max-w-md leading-relaxed">
                                          Paste your <strong className="text-orange-400 font-bold">GOOGLE_MAPS_PLATFORM_KEY</strong> in the <strong className="font-extrabold text-white">Settings (⚙️) &rarr; Secrets</strong> panel of AI Studio to visualize real-time Seattle routes and interactive courier locations.
                                        </p>
                                      </>
                                    )}
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
                                    <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded text-[10px] font-bold font-sans tracking-widest tabular-nums"><PrepCountdown minutes={order.prepTimeRemaining} status={order.status} /></span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Order Timeline steps */}
                            <div className="flex flex-col gap-5 pt-3">
                              <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 px-1">
                                <Activity className="w-4 h-4 text-orange-600" />
                                Delivery Milestones
                              </h3>
                              <div className="flex flex-col pl-2 mt-2">
                                {order.timeline.map((step, idx) => {
                                  const isLast = idx === order.timeline.length - 1;
                                  
                                  const getStepIcon = (status: string) => {
                                    switch(status.toLowerCase()) {
                                      case 'placed': return <ClipboardList className="w-3.5 h-3.5" />;
                                      case 'accepted': return <Clock className="w-3.5 h-3.5" />;
                                      case 'preparing': return <ChefHat className="w-3.5 h-3.5" />;
                                      case 'ready': return <Package className="w-3.5 h-3.5" />;
                                      case 'dispatched': return <Bike className="w-3.5 h-3.5" />;
                                      case 'picked_up': return <Utensils className="w-3.5 h-3.5" />;
                                      case 'delivered': return <CheckCircle className="w-3.5 h-3.5" />;
                                      default: return <Check className="w-3.5 h-3.5" />;
                                    }
                                  };

                                  return (
                                    <div key={idx} className="relative flex gap-4">
                                      {/* Vertical Line Container */}
                                      <div className="flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full border-2 z-10 flex items-center justify-center bg-white shadow-sm ${idx === 0 ? 'border-orange-500 text-orange-600 shadow-[0_0_0_4px_rgba(249,115,22,0.1)]' : 'border-zinc-200 text-zinc-400'}`}>
                                          {getStepIcon(step.status)}
                                        </div>
                                        {!isLast && <div className={`w-0.5 h-full ${idx === 0 ? 'bg-orange-300' : 'bg-zinc-200'} -mt-1 -mb-1`} />}
                                      </div>
                                      
                                      {/* Node Content */}
                                      <div className="pb-8 flex-1 mt-1">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                                          <p className={`font-black text-sm uppercase tracking-wide ${idx === 0 ? 'text-orange-600' : 'text-slate-800'}`}>
                                            {step.status}
                                          </p>
                                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-100 px-2 py-0.5 rounded-md inline-block w-fit">
                                            {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                        <p className="text-zinc-500 text-xs mt-1.5 leading-relaxed font-medium">
                                          {step.note}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Live Delivery Experience Rating & Feedback Panel */}
                            <div className="mt-6 border-t border-zinc-150 pt-6">
                              <div className="bg-gradient-to-r from-orange-50 via-amber-50/50 to-orange-50/10 rounded-2xl p-5 border border-orange-100/70 shadow-sm">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs select-none">
                                    ★
                                  </div>
                                  <div>
                                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Rate Delivery Experience</h3>
                                    <p className="text-[11px] text-zinc-500 mt-0.5">Provide feedback specifically for your courier and path dispatch.</p>
                                  </div>
                                </div>

                                {order.rating !== undefined ? (
                                  <div className="bg-white border border-orange-100 rounded-xl p-4 mt-3">
                                    <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                                      <span className="text-[9px] font-black uppercase tracking-wider text-green-700 bg-green-50 border border-green-150 px-2 py-0.5 rounded-full flex items-center gap-1">
                                        ✓ Feedback Logged
                                      </span>
                                      <div className="flex gap-0.5 text-amber-500">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                          <span key={s} className="text-sm">
                                            {s <= (order.rating || 0) ? '★' : '☆'}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <p className="text-xs text-zinc-700 italic mt-1 font-medium bg-zinc-50/60 p-2.5 rounded-lg border border-zinc-100">
                                      "{order.deliveryFeedback || 'Excellent courier dispatch service!'}"
                                    </p>
                                    <p className="text-[9px] text-zinc-400 mt-2 text-right">
                                      Your feedback of Zack has been securely saved. Thank you!
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-3.5 mt-3.5">
                                    {/* Star selectors */}
                                    <div className="flex items-center justify-between bg-white border border-zinc-150 p-3 rounded-xl">
                                      <span className="text-xs font-bold text-zinc-650">Courier Rating:</span>
                                      <div className="flex gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            onClick={() => setDeliveryRatingValue(star)}
                                            className="text-2xl transition hover:scale-110 active:scale-95 focus:outline-none cursor-pointer"
                                            title={`Rate ${star} Stars`}
                                          >
                                            <span className={`${star <= deliveryRatingValue ? 'text-amber-500 font-sans' : 'text-zinc-200'}`}>
                                              ★
                                            </span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Comment Feedback Textarea */}
                                    <div>
                                      <label htmlFor="delivery-comment" className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1 pl-px">
                                        Feedback Notes / Comments
                                      </label>
                                      <textarea
                                        id="delivery-comment"
                                        placeholder="Was Zack friendly? Did the insulation bag keep things hot? Tell us about your courier experience..."
                                        value={deliveryFeedbackComment}
                                        onChange={(e) => setDeliveryFeedbackComment(e.target.value)}
                                        className="w-full bg-white border border-zinc-200 hover:border-zinc-300 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl p-3 text-xs text-slate-800 placeholder-zinc-400 focus:outline-none transition leading-relaxed min-h-[70px] resize-none font-medium"
                                      />
                                    </div>

                                    {/* Submit action */}
                                    <button
                                      onClick={() => submitOrderRating(order.id, deliveryRatingValue, deliveryFeedbackComment.trim())}
                                      className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white text-xs font-black py-2.5 rounded-xl transition shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                      <span>Post Delivery Feedback</span>
                                      <span>★</span>
                                    </button>
                                  </div>
                                )}
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

                          {/* Beautiful Receipt Layout Blueprint Modal */}
                          <AnimatePresence>
                            {showPdfPreviewModal && (
                              <div key="pdf-preview-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
                                {/* Backdrop */}
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setShowPdfPreviewModal(false)}
                                  className="fixed inset-0 bg-slate-950/85 backdrop-blur-md cursor-pointer"
                                />

                                {/* Modal Wrapper */}
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                  transition={{ type: "spring", duration: 0.45, bounce: 0.2 }}
                                  className="relative bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl text-white z-10"
                                  id="pdf-preview-modal-content"
                                >
                                  {/* Header bar */}
                                  <div className="flex items-center justify-between px-6 py-4.5 bg-zinc-900 border-b border-zinc-805">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-xl bg-orange-600/15 flex items-center justify-center text-orange-500 font-extrabold border border-orange-500/20">
                                        <Eye className="w-4 h-4" />
                                      </div>
                                      <div>
                                        <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Receipt Design Studio</h3>
                                        <p className="text-[10px] text-zinc-400 font-medium tracking-tight">Active blueprint preview & structure audit</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setShowPdfPreviewModal(false)}
                                      className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  {/* Studio Content Panel: Grid split layout */}
                                  <div className="flex-1 overflow-y-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-5 gap-8">
                                    {/* Controls section (2 cols) */}
                                    <div className="md:col-span-2 flex flex-col gap-5 justify-between">
                                      <div className="space-y-4">
                                        <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl">
                                          <span className="text-[9px] uppercase tracking-widest font-black text-orange-500">FORMAT CONFIGURATION</span>
                                          <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                            Real-time synchronization with download controls. Adjust print properties instantly.
                                          </p>

                                          {/* Property Toggles inside sidebar */}
                                          <div className="mt-4 space-y-3">
                                            {/* Layout Option */}
                                            <div className="flex flex-col gap-1.5">
                                              <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Page Format</label>
                                              <div className="grid grid-cols-2 gap-2 bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                                                <button
                                                  onClick={() => setPdfLayoutFormat('a4')}
                                                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${pdfLayoutFormat === 'a4' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                                                >
                                                  A4 Paper
                                                </button>
                                                <button
                                                  onClick={() => setPdfLayoutFormat('thermal')}
                                                  className={`py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${pdfLayoutFormat === 'thermal' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
                                                >
                                                  Thermal Roll
                                                </button>
                                              </div>
                                            </div>

                                            {/* QR Option */}
                                            <div className="flex items-center justify-between bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                                              <div>
                                                <p className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Include QR Code</p>
                                                <p className="text-[9px] text-zinc-500 leading-tight">Verification protocol gateway</p>
                                              </div>
                                              <button
                                                onClick={() => setIncludeQrOnReceipt(prev => !prev)}
                                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${includeQrOnReceipt ? 'bg-orange-600' : 'bg-zinc-800'}`}
                                              >
                                                <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${includeQrOnReceipt ? 'translate-x-3' : 'translate-x-0'}`} />
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Layout Dimensions details specification */}
                                        <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl text-xs space-y-3">
                                          <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500">SPECIFICATION DETAILS</span>
                                          <div className="space-y-2 font-mono text-[10px] text-zinc-400 leading-tight">
                                            <div className="flex justify-between border-b border-zinc-850/55 pb-1.5">
                                              <span>Width:</span>
                                              <span className="text-zinc-200 font-bold">{pdfLayoutFormat === 'a4' ? '210 mm (A4 letter)' : '80 mm (thermal docket)'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-850/55 pb-1.5">
                                              <span>Height:</span>
                                              <span className="text-zinc-200 font-bold">{pdfLayoutFormat === 'a4' ? '297 mm' : `${Math.max(150, 115 + (order.items.length * 8) + (order.deliveryNote ? 15 : 0) + (includeQrOnReceipt ? 45 : 0))} mm (adaptive Roll)`}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-zinc-850/55 pb-1.5">
                                              <span>Color Palette:</span>
                                              <span className="text-zinc-200 font-bold">{pdfLayoutFormat === 'a4' ? 'RGB Slate Theme' : 'Monochrome 100%'}</span>
                                            </div>
                                            <div className="flex justify-between pb-0.5">
                                              <span>Support QR:</span>
                                              <span className={includeQrOnReceipt ? 'text-green-400 font-bold' : 'text-zinc-500'}>{includeQrOnReceipt ? 'GATEWAY_ON_DOCKET' : 'DISABLE_DOCKET_QR'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Quick Action Button */}
                                      <div className="pt-2">
                                        <button
                                          onClick={() => {
                                            handleDownloadPdfReceipt(order);
                                            setShowPdfPreviewModal(false);
                                          }}
                                          className="w-full bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white text-xs font-black py-3 rounded-xl transition shadow-lg shadow-orange-600/10 flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                          <Download className="w-4 h-4" />
                                          <span>GENERATE & PRINT PDF</span>
                                        </button>
                                      </div>
                                    </div>

                                    {/* Blueprint Draft / Mockup Container (3 cols) */}
                                    <div className="md:col-span-3 flex flex-col items-center justify-center bg-zinc-950 rounded-3xl p-4 md:p-6 border border-zinc-850 min-h-[380px] relative overflow-hidden">
                                      {/* Grid blueprint lines style */}
                                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '16px 16px' }}></div>
                                      
                                      {/* Real scale design mockup */}
                                      <div className="w-full h-full flex items-center justify-center z-10 py-6">
                                        {pdfLayoutFormat === 'a4' ? (
                                          /* A4 Sheet Blueprint Representation */
                                          <div className="w-full max-w-[218px] aspect-[1/1.414] bg-white text-zinc-850 rounded-sm shadow-xl p-3 border border-zinc-350 flex flex-col justify-between font-sans select-none relative overflow-hidden animate-fade-in">
                                            {/* Beautiful diagonal faint watermark matching the printed PDF */}
                                            <div className="absolute inset-0 flex flex-col justify-around items-center opacity-[0.05] select-none pointer-events-none z-0">
                                              <span className="text-[26px] font-black tracking-widest text-[#ea580c] -rotate-[25deg] uppercase">FoodRush</span>
                                              <span className="text-[26px] font-black tracking-widest text-[#ea580c] -rotate-[25deg] uppercase">FoodRush</span>
                                            </div>

                                            <div className="relative z-10 w-full flex flex-col justify-between h-full">
                                              <div>
                                                {/* Orange Top Accent Bar */}
                                                <div className="h-1 bg-orange-500 -mx-3 -mt-3 mb-2.5 rounded-t-sm" />
                                              
                                              {/* Header bar area */}
                                              <div className="flex justify-between items-start border-b border-zinc-150 pb-2 mb-2">
                                                <div>
                                                  {/* Monogram */}
                                                  <div className="flex items-center gap-1">
                                                    <span className="w-3.5 h-3.5 bg-slate-900 rounded-sm flex items-center justify-center text-[7px] text-white font-black">FR</span>
                                                    <span className="text-[10px] uppercase font-black tracking-tight text-slate-900">FoodRush.</span>
                                                  </div>
                                                  <p className="text-[6px] text-zinc-400 mt-0.5 leading-tight font-medium">100 Pine Street, Seattle, WA</p>
                                                </div>
                                                <div className="text-right">
                                                  <span className="text-[6px] bg-zinc-100 text-zinc-650 px-1 py-0.5 rounded font-bold uppercase tracking-wider">OFFICIAL INVOICE</span>
                                                  <p className="text-[5px] text-zinc-450 mt-1 font-bold"># {order.id.slice(0, 8).toUpperCase()}</p>
                                                </div>
                                              </div>

                                              {/* Metadata grids */}
                                              <div className="grid grid-cols-2 gap-2 text-[6px] border-b border-zinc-150 pb-2 mb-2 font-medium">
                                                <div>
                                                  <p className="text-zinc-400 font-bold uppercase text-[5px]">Customer Details</p>
                                                  <p className="font-extrabold text-zinc-800 mt-0.5">{order.customerName}</p>
                                                  <p className="text-zinc-500 truncate max-w-[90px]">{order.customerAddress}</p>
                                                </div>
                                                <div className="text-right">
                                                  <p className="text-zinc-400 font-bold uppercase text-[5px]">Order & Logistics</p>
                                                  <p className="font-extrabold text-zinc-800 mt-0.5">Shop: {order.restaurantName}</p>
                                                  <p className="text-zinc-500">Method: {order.paymentMethod.toUpperCase()}</p>
                                                </div>
                                              </div>

                                              {/* Items table list mockup */}
                                              <div className="space-y-1.5">
                                                <div className="flex justify-between text-[5px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-1">
                                                  <span>Description</span>
                                                  <div className="flex gap-4">
                                                    <span>Qty</span>
                                                    <span>Price</span>
                                                  </div>
                                                </div>
                                                <div className="space-y-1 max-h-[85px] overflow-y-auto">
                                                  {order.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-[6px] text-zinc-750 font-semibold">
                                                      <span className="truncate max-w-[100px]">{item.name}</span>
                                                      <div className="flex gap-5 font-mono">
                                                        <span>x{item.quantity}</span>
                                                        <span className="w-10 text-right">${(item.price * item.quantity).toFixed(2)}</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Verification QR Code and footer */}
                                            <div className="border-t border-zinc-150 pt-2.5 mt-auto">
                                              <div className="flex items-center gap-2 justify-between">
                                                {includeQrOnReceipt && qrCodePreviewDataUrl ? (
                                                  <div className="flex items-center gap-2 max-w-[120px]">
                                                    <div className="p-0.5 border border-orange-200 bg-orange-50 rounded-md">
                                                      <img src={qrCodePreviewDataUrl} alt="Receipt verification QR code" className="w-[28px] h-[28px]" referrerPolicy="no-referrer" />
                                                    </div>
                                                    <div>
                                                      <p className="text-[5px] font-black text-orange-600 uppercase tracking-widest">GATEWAY CODE</p>
                                                      <p className="text-[4px] text-zinc-450 leading-tight">Scan help code to verify routing in logistics terminal.</p>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <p className="text-[4px] text-zinc-400 leading-tight max-w-[120px]">This document has been compiled and is active proof of transaction clearance.</p>
                                                )}
                                                
                                                {/* Summary box */}
                                                <div className="text-right min-w-[50px] space-y-0.5">
                                                  <div className="flex justify-between text-[5px] text-zinc-400 font-semibold">
                                                    <span>Subtotal:</span>
                                                    <span>${(order.total - 3.99).toFixed(2)}</span>
                                                  </div>
                                                  <div className="flex justify-between text-[5px] text-zinc-400 font-semibold">
                                                    <span>Delivery:</span>
                                                    <span>$3.99</span>
                                                  </div>
                                                  <div className="flex justify-between text-[7px] text-slate-900 font-black pt-1 border-t border-zinc-150">
                                                    <span>TOTAL:</span>
                                                    <span>${order.total.toFixed(2)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <p className="text-center text-[4px] text-zinc-300 font-mono mt-1 pt-1 border-t border-zinc-100 select-none">
                                                Thank you for your order with FoodRush. All services rendered.
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                        ) : (
                                          /* Thermal Scroll Docket Representation */
                                          <div className="w-[110px] aspect-[1/2.2] bg-white text-zinc-800 rounded-sm shadow-xl p-2.5 border-l border-r border-dashed border-zinc-300 flex flex-col justify-between font-mono text-[5px] select-none relative overflow-hidden animate-fade-in">
                                            {/* Beautiful diagonal faint watermark matching the printed Thermal PDF */}
                                            <div className="absolute inset-x-0 inset-y-4 flex flex-col justify-around items-center opacity-[0.05] select-none pointer-events-none z-0">
                                              <span className="text-[10px] font-black tracking-wider text-slate-800 -rotate-[25deg] uppercase">FoodRush</span>
                                              <span className="text-[10px] font-black tracking-wider text-slate-800 -rotate-[25deg] uppercase">FoodRush</span>
                                              <span className="text-[10px] font-black tracking-wider text-slate-800 -rotate-[25deg] uppercase">FoodRush</span>
                                            </div>

                                            <div className="relative z-10 w-full flex flex-col justify-between h-full">
                                              <div className="text-center space-y-1">
                                              {/* Tear line mimics top */}
                                              <div className="absolute top-1 left-0 right-0 flex justify-between px-1 opacity-20 text-zinc-650">
                                                <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
                                              </div>
                                              
                                              {/* FR Badge Monogram */}
                                              <div className="inline-flex w-3.5 h-3.5 bg-slate-900 rounded-full items-center justify-center text-[6px] text-white font-bold mx-auto mt-1 mb-1">
                                                FR
                                              </div>
                                              <p className="font-extrabold uppercase text-[7px] tracking-widest text-slate-900">FoodRush Ltd</p>
                                              <p className="text-[4px] text-zinc-400">Merchant Terminal #F581</p>
                                              <p className="text-[4px] text-zinc-450">100 Pine Street, Seattle, WA</p>
                                              
                                              {/* Separator */}
                                              <div className="border-t border-dashed border-zinc-205 my-1 pb-1" />
                                              
                                              {/* Key Details */}
                                              <div className="text-left space-y-0.5 pl-0.5">
                                                <p className="font-bold">INVOICE: #{order.id.slice(0, 8).toUpperCase()}</p>
                                                <p className="text-zinc-500">DATE: {new Date().toLocaleDateString()}</p>
                                                <p className="text-zinc-500">CLIENT: {order.customerName}</p>
                                                <p className="text-zinc-500 truncate max-w-[90px]">SHOP: {order.restaurantName}</p>
                                              </div>

                                              {/* Separator */}
                                              <div className="border-t border-dashed border-zinc-205 my-1 pb-1" />

                                              {/* Items table list simple */}
                                              <div className="space-y-1 text-left pl-0.5">
                                                {order.items.map((item, idx) => (
                                                  <div key={idx} className="flex justify-between text-zinc-700 leading-tight">
                                                    <span className="truncate max-w-[55px] font-bold">{item.name}</span>
                                                    <span className="font-bold">x{item.quantity}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>

                                            {/* Pricing double-line section */}
                                            <div className="mt-auto space-y-1 text-center">
                                              <div className="border-t border-dashed border-zinc-205 my-1 pb-1" />
                                              
                                              <div className="space-y-0.5 pl-0.5 text-left text-zinc-650">
                                                <div className="flex justify-between">
                                                  <span>SUBTOTAL:</span>
                                                  <span>${(order.total - 3.99).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                  <span>DELIV FEE:</span>
                                                  <span>$3.99</span>
                                                </div>
                                                <div className="flex justify-between text-[6px] font-black text-slate-900 pt-0.5 border-t border-dashed border-zinc-205">
                                                  <span>TOTAL:</span>
                                                  <span>${order.total.toFixed(2)}</span>
                                                </div>
                                              </div>
                                              
                                              <p className="text-zinc-400 text-[4px] uppercase mt-1">METHOD: {order.paymentMethod.toUpperCase()}</p>

                                              {/* Validation Gateway QR inside thermal */}
                                              {includeQrOnReceipt && qrCodePreviewDataUrl ? (
                                                <div className="flex flex-col items-center mt-2.5">
                                                  <div className="border border-zinc-300 p-0.5 rounded bg-white">
                                                    <img src={qrCodePreviewDataUrl} alt="Support QR code representation" className="w-[28px] h-[28px]" referrerPolicy="no-referrer" />
                                                  </div>
                                                  <p className="text-[3.5px] text-zinc-450 mt-1 uppercase font-bold tracking-wider">GATEWAY SCAN CODE</p>
                                                </div>
                                              ) : (
                                                <p className="text-[3px] text-zinc-450 mt-1 select-none">Receipt printed electronically.</p>
                                              )}
                                              
                                              <p className="text-[4px] text-zinc-400 font-extrabold mt-2 font-mono">
                                                *** THANK YOU FOR ORDERING ***
                                              </p>

                                              {/* Tear line mimics bottom */}
                                              <div className="pt-1.5 flex justify-between px-1 opacity-20 text-zinc-650">
                                                <span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span><span>•</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        )}
                                      </div>

                                      {/* Hover overlay description */}
                                      <div className="absolute bottom-3 left-3 right-3 bg-zinc-900/95 border border-zinc-800 rounded-xl px-3 py-2 text-center shadow-lg">
                                        <p className="text-[9px] text-zinc-400 leading-tight font-medium font-sans">
                                          💡 Adjust formats and QR toggle. Download in the workspace to output this document directly.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </div>
                            )}
                          </AnimatePresence>
                        </>
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
                <aside className={`w-full sm:w-80 max-w-full sm:max-w-xs border-l border-zinc-200 bg-white p-5 flex flex-col gap-5 flex-none fixed inset-y-0 right-0 z-50 xl:relative xl:z-0 xl:translate-x-0 transition-transform duration-300 ${isCartOpen ? 'translate-x-0 shadow-2xl xl:shadow-none' : 'translate-x-full xl:translate-x-0'}`}>
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
                        const { subtotal, deliveryFee, tax, discount, grandTotal, promoDiscount, loyaltyDiscount } = getCartTotals();
                        return (
                          <div className="text-xs text-zinc-500 flex flex-col gap-2 pt-2 border-t border-zinc-100">
                            
                            {/* Points Redemption Offer */}
                            {loyaltyPoints >= 100 && pointsRedeemed === 0 && (
                              <div className="bg-orange-50 border border-orange-100 p-3 rounded-xl mb-2 flex items-center justify-between">
                                <span className="font-bold text-orange-950 flex items-center gap-1.5 text-[11px]"><Star className="w-3.5 h-3.5 text-orange-500" /> Use {Math.floor(loyaltyPoints/100)*100} Points for ${Math.floor(loyaltyPoints/100).toFixed(2)} off!</span>
                                <button onClick={() => setPointsRedeemed(Math.floor(loyaltyPoints/100)*100)} className="bg-orange-600 text-white font-black text-[10px] px-2 py-1 rounded-lg hover:bg-orange-700 transition">REDEEM</button>
                              </div>
                            )}
                            {pointsRedeemed > 0 && (
                               <div className="bg-green-50 border border-green-100 p-3 rounded-xl mb-2 flex items-center justify-between">
                                 <span className="font-bold text-green-800 flex items-center gap-1.5 text-[11px]"><CheckCircle className="w-3.5 h-3.5" /> Redeemed {pointsRedeemed} Points</span>
                                 <button onClick={() => setPointsRedeemed(0)} className="text-zinc-500 hover:text-zinc-800 font-bold text-[10px] transition">Undo</button>
                               </div>
                            )}

                            <div className="flex justify-between"><span>Subtotal:</span><span className="font-bold text-slate-800">${subtotal.toFixed(2)}</span></div>
                            {promoDiscount > 0 && <div className="flex justify-between text-green-600"><span>Promo Discount:</span><span>-${promoDiscount.toFixed(2)}</span></div>}
                            {loyaltyDiscount > 0 && <div className="flex justify-between text-orange-600"><span>Points Discount:</span><span>-${loyaltyDiscount.toFixed(2)}</span></div>}
                            <div className="flex justify-between"><span>Delivery:</span>
                              <span className="font-bold text-slate-800">
                                {isVip ? <span className="text-green-600 uppercase text-[10px] bg-green-100 px-1.5 py-0.5 rounded mr-1">VIP Free</span> : null}
                                ${deliveryFee.toFixed(2)}
                              </span>
                            </div>
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
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs min-w-[700px]">
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
                </div>
              )}

              {/* 3. Transaction Ledger log */}
              {selectedAdminTab === 'live-orders' && (
                <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse text-xs min-w-[800px]">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 font-extrabold text-[#111]">
                          <th className="p-4">ID</th>
                          <th className="p-4">Outlets Spot</th>
                          <th className="p-4">Customer info</th>
                          <th className="p-4">Amount (USD)</th>
                          <th className="p-4">State Timeline</th>
                          <th className="p-4 text-right">Courier Driver</th>
                          <th className="p-4 text-right">Rating</th>
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
                            <td className="p-4 text-right text-zinc-600 font-bold">{order.rating ? `${order.rating}★` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

      </div>

      {/* ==========================================
          PROFILE EDIT MODAL
          ========================================== */}
      {profileOpen && userSession && (
        <div className="fixed inset-0 z-[100] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-2xl">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 capitalize">{currentRole} Profile</h3>
                  <p className="text-xs text-zinc-500 font-medium">{userSession.email}</p>
                </div>
              </div>
              <button onClick={() => setProfileOpen(false)} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 mb-6">
              <div>
                <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Full Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                  placeholder="Your Name"
                />
              </div>

              {currentRole === 'customer' && (
                <>
                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Phone Number</label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Default Delivery Address</label>
                    <input
                      type="text"
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                      placeholder="Street, City, Apartment"
                    />
                  </div>
                </>
              )}

              {currentRole === 'rider' && (
                <div>
                  <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Vehicle Type</label>
                  <input
                    type="text"
                    value={profileForm.vehicle}
                    onChange={(e) => setProfileForm({ ...profileForm, vehicle: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                    placeholder="E.g. Motorcycle, Bicycle, Car"
                  />
                </div>
              )}

              {currentRole === 'restaurant' && (
                <>
                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Restaurant Name</label>
                    <input
                      type="text"
                      value={profileForm.restaurantName}
                      onChange={(e) => setProfileForm({ ...profileForm, restaurantName: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                      placeholder="Restaurant Name"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Cuisine Type</label>
                    <input
                      type="text"
                      value={profileForm.cuisine}
                      onChange={(e) => setProfileForm({ ...profileForm, cuisine: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                      placeholder="E.g. Italian, Fast Food"
                    />
                  </div>
                </>
              )}

              {currentRole === 'admin' && (
                <div>
                  <label className="block text-[11px] font-black text-zinc-500 uppercase tracking-wider mb-1 px-1">Department</label>
                  <input
                    type="text"
                    value={profileForm.department}
                    onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all"
                    placeholder="Department"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  const newSession = { ...userSession, name: profileForm.name || userSession.name };
                  setUserSession(newSession);
                  safeStorage.setItem('foodrush_session2', JSON.stringify(newSession));
                  
                  if (currentRole === 'customer') {
                    setCheckoutPhone(profileForm.phone);
                    setCheckoutAddress(profileForm.address);
                    safeStorage.setItem('foodrush_phone', profileForm.phone);
                    safeStorage.setItem('foodrush_address', profileForm.address);
                  } else if (currentRole === 'rider') {
                    safeStorage.setItem('foodrush_rider_vehicle', profileForm.vehicle);
                  } else if (currentRole === 'restaurant') {
                    safeStorage.setItem('foodrush_rest_name', profileForm.restaurantName);
                    safeStorage.setItem('foodrush_rest_cuisine', profileForm.cuisine);
                  } else if (currentRole === 'admin') {
                    safeStorage.setItem('foodrush_admin_dept', profileForm.department);
                  }
                  
                  setProfileOpen(false);
                  addToast('Profile Updated', 'Your profile details have been saved successfully.', <CheckCircle className="w-5 h-5 text-green-600" />);
                }}
                className="w-full py-3 px-4 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 transition-all text-sm"
              >
                Save Changes
              </button>
              
              <button 
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    safeStorage.removeItem('foodrush_session2');
                    setUserSession(null);
                    setProfileOpen(false);
                    setCurrentRole('customer');
                  }
                }}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 transition-all text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          REORDER DRAFT MODAL
          ========================================== */}
      {reorderDraft && (
        <div className="fixed inset-0 z-[100] bg-zinc-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4 fade-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Adjust Reorder</h3>
                <p className="text-xs text-zinc-500 font-medium">Order #{reorderDraft.orderId} • {reorderDraft.restaurantName}</p>
              </div>
              <button onClick={() => setReorderDraft(null)} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex flex-col gap-4 max-h-[40vh] overflow-y-auto pr-2 mb-6">
              {reorderDraft.items.length === 0 ? (
                <div className="text-center py-6 text-zinc-400 text-sm">No items remaining.</div>
              ) : (
                reorderDraft.items.map((cartItem, idx) => (
                  <div key={`${cartItem.item.id}-${idx}`} className="flex justify-between items-center bg-zinc-50 p-3 rounded-2xl border border-zinc-100">
                    <div className="flex-1 mr-4">
                      <p className="font-bold text-slate-800 text-sm line-clamp-1">{cartItem.item.name}</p>
                      <p className="text-xs text-orange-600 font-black mt-0.5">${(cartItem.item.price * cartItem.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white border border-zinc-200 rounded-xl px-2 py-1 shadow-sm shrink-0">
                      <button
                        onClick={() => {
                          setReorderDraft(prev => {
                            if (!prev) return prev;
                            const newItems = [...prev.items];
                            if (newItems[idx].quantity > 1) {
                              newItems[idx].quantity -= 1;
                            } else {
                              newItems.splice(idx, 1);
                            }
                            return { ...prev, items: newItems };
                          });
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-colors font-bold"
                      >-</button>
                      <span className="text-xs font-black w-3 text-center">{cartItem.quantity}</span>
                      <button
                        onClick={() => {
                          setReorderDraft(prev => {
                            if (!prev) return prev;
                            const newItems = [...prev.items];
                            newItems[idx].quantity += 1;
                            return { ...prev, items: newItems };
                          });
                        }}
                        className="w-6 h-6 flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-colors font-bold"
                      >+</button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-100">
              <button 
                onClick={() => setReorderDraft(null)}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                disabled={reorderDraft.items.length === 0}
                onClick={() => {
                  if (reorderDraft.items.length > 0) {
                    setCart(reorderDraft.items);
                    setActiveRestaurantId(reorderDraft.items[0].restaurantId);
                    setShowOrderHistory(false);
                    setReorderDraft(null);
                    setIsCartOpen(true);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-xl font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          INTELLIGENT AI RECOMMENDATION CHAT DRAWER (POPUP)
          ========================================== */}
      {chatbotOpen && (
        <div id="ai-chat-drawer" className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-96 bg-white rounded-t-3xl sm:rounded-3xl border border-zinc-200 shadow-2xl overflow-hidden flex flex-col h-[485px] max-h-[85vh] sm:max-h-[500px]">
          
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
  );
}
