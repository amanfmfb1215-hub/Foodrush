import { Restaurant, Rider, PlatformAnalytics } from './types';

export const STATIC_FALLBACK_RESTAURANTS: Restaurant[] = [
  {
    id: 'rest-1',
    name: 'BurgerBite Co.',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Burgers', 'Fast Food', 'Sides'],
    rating: 4.8,
    deliveryTime: 20,
    deliveryFee: 1.99,
    minOrder: 10.0,
    address: '142 Gourmet Avenue, Food City',
    phoneNumber: '+1 (555) 123-4567',
    isOpen: true,
    hours: '11:00 AM - 11:00 PM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-1', userName: 'Alex Johnson', rating: 5, comment: 'Best truffle fries in town! Super fast delivery.', date: '2026-05-24T18:30:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex' },
      { id: 'rev-2', userName: 'Samantha Reed', rating: 4, comment: 'Solid burgers. The cheese melt was divine.', date: '2026-05-21T19:15:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Samantha' }
    ],
    menu: [
      { id: 'm1-1', name: 'Classic Smash Burger', description: 'Angus beef patty, cheddar, pickle, signature FoodRush sauce on toasted brioche.', price: 9.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 12 },
      { id: 'm1-2', name: 'Zesty Truffle Cheeseburger', description: 'Caramelized onion, melted Swiss, and aromatic black truffle aioli.', price: 12.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 },
      { id: 'm1-5', name: 'Texas Smokehouse BBQ Burger', description: 'Angus beef patty, smoked bacon, crispy onion rings, sharp cheddar, hickory BBQ sauce.', price: 13.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      { id: 'm1-3', name: 'Crispy Avocado Fries', description: 'Panko crust avocado spears, quick lime dipping sauce.', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm1-9', name: 'Parmesan Garlic Truffle Fries', description: 'Golden sea-salted fries tossed with white truffle oil, grated parmesan, fresh herbs.', price: 6.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80', isPopular: false, isAvailable: true, preparationTime: 7 },
      { id: 'm1-4', name: 'Thick Salted Caramel Shake', description: 'Hand-spun premium vanilla gelato, sea salt, gourmet caramel drizzle.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-2',
    name: 'PastaPrado Italian',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Italian', 'Pasta', 'Salads'],
    rating: 4.7,
    deliveryTime: 25,
    deliveryFee: 2.99,
    minOrder: 15.0,
    address: '89 Trattoria Way, Food City',
    phoneNumber: '+1 (555) 765-4321',
    isOpen: true,
    hours: '12:00 PM - 10:00 PM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-3', userName: 'Michael Chang', rating: 5, comment: 'Incredible Carbonara. Feels authentic!', date: '2026-05-26T20:10:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Michael' }
    ],
    menu: [
      { id: 'm2-1', name: 'Rigatoni Carbonara', description: 'Pecorino Romano, crispy guanciale, egg yolk, freshly cracked black pepper.', price: 14.99, category: 'Pasta', image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'm2-2', name: 'Four-Cheese Penne Al Forno', description: 'Penne pasta baked in rustic marinara, fontina, mozzarella, provolone, and parmesan.', price: 13.50, category: 'Pasta', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'm2-3', name: 'Classic Caesar Side', description: 'Crisp romaine, sourdough croutons, creamy parmesan dressing, shaved pecorino.', price: 6.50, category: 'Salads', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 }
    ]
  },
  {
    id: 'rest-3',
    name: 'SushiZen Master',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Japanese', 'Sushi', 'Seafood'],
    rating: 4.9,
    deliveryTime: 30,
    deliveryFee: 3.49,
    minOrder: 18.0,
    address: '22 Sakura Blvd, Midtown',
    phoneNumber: '+1 (555) 999-8888',
    isOpen: true,
    hours: '12:00 PM - 11:00 PM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-4', userName: 'Yuki Tanaka', rating: 5, comment: 'Super fresh salmon nigiri, nicely presented.', date: '2026-05-25T13:40:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Yuki' }
    ],
    menu: [
      { id: 'm3-1', name: 'Premium Dragon Roll (8pcs)', description: 'Toasted unagi and cucumber roll topped with sliced avocado, tobiko, and unagi glaze.', price: 16.99, category: 'Sushi', image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 },
      { id: 'm3-4', name: 'Spicy Crunchy Tuna Roll (8pcs)', description: 'Spicy minced yellowfin tuna, tempura crunch flakes, signature house-spiced aioli.', price: 14.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm3-3', name: 'Crispy Garlic Edamame', description: 'Steamed premium edamame sautéed with garlic, sea salt, and a dash of togarashi.', price: 5.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 7 }
    ]
  },
  {
    id: 'rest-4',
    name: 'GreenGarden Cafe',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Healthy', 'Salads', 'Smoothies', 'Vegan'],
    rating: 4.6,
    deliveryTime: 15,
    deliveryFee: 0.99,
    minOrder: 8.0,
    address: '5 Wellness Meadows, Westside',
    phoneNumber: '+1 (555) 777-6666',
    isOpen: true,
    hours: '08:00 AM - 08:00 PM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-5', userName: 'Emily Green', rating: 4, comment: 'Great light lunch. Highly recommend the Avocado Citrus bowl.', date: '2026-05-27T11:20:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emily' }
    ],
    menu: [
      { id: 'm4-1', name: 'Avocado Citrus Quinoa Bowl', description: 'Organic quinoa, freshly sliced organic avocado, grapefruit segments, baby spinach, chia lime seed vinaigrette.', price: 11.50, category: 'Vegan', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 8 },
      { id: 'm4-3', name: 'Tofu Buckwheat Soba Bowl', description: 'Thick organic buckwheat noodles, seared sesame tofu square, edamame beans.', price: 13.49, category: 'Vegan', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 11 }
    ]
  },
  {
    id: 'rest-pak-1',
    name: 'Lal Qila Royal Biryani',
    image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1585938338392-50a59970d8ee?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Biryani', 'Curry'],
    rating: 4.9,
    deliveryTime: 25,
    deliveryFee: 2.50,
    minOrder: 12.0,
    address: 'Block 5, Clifton, Karachi',
    phoneNumber: '+92 21 111-525-745',
    isOpen: true,
    hours: '12:00 PM - 12:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p1-1', userName: 'Zia Ahmed', rating: 5, comment: 'Absolutely authentic! The smoke flavor in mutton biryani is amazing.', date: '2026-05-26T21:00:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zia' },
      { id: 'rev-p1-2', userName: 'Mariam Malik', rating: 5, comment: 'The Shahi Kheer is incredible. Excellent packaging too!', date: '2026-05-27T18:45:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Mariam' }
    ],
    menu: [
      { id: 'mp1-1', name: 'Royal Sindhi Mutton Biryani', description: 'Layered basmati rice cooked with tender spiced mutton, authentic saffron threads, fresh mint leaves, and caramelized onions.', price: 17.49, category: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 20 },
      { id: 'mp1-6', name: 'Mughlai Chicken Tikka Biryani', description: 'Aromatic long-grain basmati layered with smoked, red tandoori-spiced hot chicken tikka pieces.', price: 16.49, category: 'Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'mp1-2', name: 'Special Chicken Boneless Handi', description: 'Creamy, rich tomato-based handi sauce cooked to perfection in a traditional clay pot.', price: 15.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 }
    ]
  },
  {
    id: 'rest-pak-2',
    name: 'Kolachi Jewel of Karachi',
    image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Barbecue', 'Curry'],
    rating: 4.8,
    deliveryTime: 30,
    deliveryFee: 3.00,
    minOrder: 15.0,
    address: 'Beach Avenue, Phase VIII, DHA, Karachi',
    phoneNumber: '+92 21 111-123-456',
    isOpen: true,
    hours: '05:00 PM - 01:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p2-1', userName: 'Ayla Khan', rating: 5, comment: 'Peshawari Charsi Karahi is a chef masterpiece! Authentic recipe.', date: '2026-05-27T19:30:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ayla' }
    ],
    menu: [
      { id: 'mp2-1', name: 'Peshawari Charsi Mutton Karahi', description: 'Authentic wok-cooked premium lamb prepared in mutton fat with green chilies, ripe tomatoes, fresh ginger julienne, and black pepper.', price: 23.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 25 },
      { id: 'mp2-2', name: 'Melt-in-Mouth Kasturi Boti (6pcs)', description: 'Succulent boneless chicken pieces marinated in curd, cream, saffron, and fresh spices, grilled on live coals.', price: 14.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 }
    ]
  },
  {
    id: 'rest-pak-3',
    name: 'Savour Foods Rawalpindi',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Kebab', 'Biryani'],
    rating: 4.7,
    deliveryTime: 18,
    deliveryFee: 1.50,
    minOrder: 8.0,
    address: 'Gordon College Road, Rawalpindi',
    phoneNumber: '+92 51 111-728-687',
    isOpen: true,
    hours: '11:00 AM - 11:30 PM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-p3-1', userName: 'Hamza Malik', rating: 5, comment: 'The most nostalgic taste ever. Shami Kebab pulao combo wins hearts!', date: '2026-05-25T14:20:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hamza' }
    ],
    menu: [
      { id: 'mp3-1', name: 'Legendary Savour Pulao Kabab Combo', description: 'Aromatic seasoned long-grain pulao rice, served with a roasted leg piece of tender chicken and two crispy spiced shami kebabs.', price: 11.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 10 },
      { id: 'mp3-2', name: 'Crispy Fried Shami Kebab Duo', description: 'Traditional ground meat and lentil patties infused with whole spices and pan-fried with an egg-wash coating.', price: 4.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 }
    ]
  },
  {
    id: 'rest-pak-4',
    name: 'Butt Karahi Lakshmi Chowk',
    image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Karahi', 'Curry'],
    rating: 4.9,
    deliveryTime: 32,
    deliveryFee: 3.00,
    minOrder: 15.0,
    address: 'Lakshmi Chowk, Lahore, Punjab',
    phoneNumber: '+92 42 111-999-000',
    isOpen: true,
    hours: '01:00 PM - 03:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p4-1', userName: 'Kamran Butt', rating: 5, comment: 'Hands down the most legendary Butt Karahi taste! Authentic Desi Butter used.', date: '2026-05-24T18:30:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Kamran' }
    ],
    menu: [
      { id: 'mp4-1', name: 'Legend Desi Butter Mutton Karahi', description: 'Fresh premium mutton cooked in cast iron wok with pure local butter, tandoori tomatoes, julienne ginger, green pepper, no spices.', price: 29.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 30 },
      { id: 'mp4-2', name: 'Butter Tandoori Chicken Karahi', description: 'Bone-in tender chicken wok-seared with fresh local butter, tandoor spices, organic yogurt topping.', price: 17.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 22 }
    ]
  }
];

export const STATIC_FALLBACK_RIDERS: Rider[] = [
  {
    id: 'rider-1',
    name: 'Zack Walker',
    phone: '+1 (555) 234-5678',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zack',
    vehicle: 'Electric Bicycle',
    plateNumber: 'E-BIKE-332D',
    status: 'idle',
    location: { lat: 25, lng: 30 },
    rating: 4.9,
    earnings: 450.50,
    earningsHistory: [
      { date: 'Mon', amount: 80.50, count: 12 },
      { date: 'Tue', amount: 95.00, count: 14 }
    ]
  },
  {
    id: 'rider-2',
    name: 'Danny Shift',
    phone: '+1 (555) 876-5432',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Danny',
    vehicle: 'Motorcycle',
    plateNumber: 'M-CYC-9842',
    status: 'idle',
    location: { lat: 60, lng: 65 },
    rating: 4.7,
    earnings: 320.00,
    earningsHistory: [
      { date: 'Mon', amount: 60.00, count: 8 },
      { date: 'Tue', amount: 85.00, count: 11 }
    ]
  }
];

export const STATIC_FALLBACK_ANALYTICS: PlatformAnalytics = {
  totalSales: 48950.00,
  totalOrders: 1420,
  commissionEarned: 4895.00,
  totalCustomers: 850,
  totalRiders: 12,
  totalRestaurants: 14,
  salesData: [
    { date: 'Mon', sales: 1200, orders: 45 },
    { date: 'Tue', sales: 1540, orders: 52 },
    { date: 'Wed', sales: 1820, orders: 60 },
    { date: 'Thu', sales: 2200, orders: 75 },
    { date: 'Fri', sales: 3100, orders: 98 },
    { date: 'Sat', sales: 4500, orders: 130 },
    { date: 'Sun', sales: 3800, orders: 115 }
  ],
  cuisinePopularity: [
    { name: 'Biryani', value: 35 },
    { name: 'Burgers', value: 25 },
    { name: 'Barbecue', value: 20 },
    { name: 'Italian', value: 10 },
    { name: 'Salads & Vegan', value: 10 }
  ]
};
