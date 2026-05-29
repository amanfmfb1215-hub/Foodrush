import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { MenuItem, Restaurant, Order, OrderStatus, ChatMessage, Rider, PlatformAnalytics, Review } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// ==========================================
// DB - IN-MEMORY STATE (Seeded Beautifully)
// ==========================================

let INITIAL_RESTAURANTS: Restaurant[] = [
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
      { id: 'm1-6', name: 'Avocado Pepper Jack Chicken Burger', description: 'Flame-grilled breast, hand-smashed avocado, pepper jack, spicy jalapeño cream.', price: 12.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 13 },
      { id: 'm1-7', name: 'Spicy Buffalo Crispy Chicken Burger', description: 'Crispy breast tossed in home-grade buffalo fire, cool celery ranch, sweet pickles.', price: 11.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm1-8', name: 'Double Truffle Smashed Burger', description: 'Two smashed patties, double cheese, sweet caramelized onions, premium truffle butter.', price: 15.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 16 },
      { id: 'm1-b1', name: 'Breakfast Egg & Cheese Burger', description: 'Fluffy folded egg, melted american cheese, sausage patty on toasted english muffin.', price: 7.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'm1-b2', name: 'Spicy Demon Burger', description: 'Triple smashed patties, ghost pepper jack, habanero salsa, spicy chips layer.', price: 17.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1594212852233-a60d005fbc35?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 18 },
      { id: 'm1-b3', name: 'Mushroom Swiss Alpine Burger', description: 'Grilled portobello caps, melted aged swiss cheese, garlic mayo.', price: 11.49, category: 'Burgers', image: 'https://images.unsplash.com/photo-1605335520863-1250266dd1d0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      { id: 'm1-b4', name: 'Hawaiian Teriyaki Chicken Burger', description: 'Grilled chicken breast with warm pineapple ring, sweet teriyaki glaze, lettuce.', price: 12.99, category: 'Burgers', image: 'https://images.unsplash.com/photo-1615714365773-441634fe8e22?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      
      { id: 'm1-3', name: 'Crispy Avocado Fries', description: 'Panko crust avocado spears, quick lime dipping sauce.', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm1-9', name: 'Parmesan Garlic Truffle Fries', description: 'Golden sea-salted fries tossed with white truffle oil, grated parmesan, fresh herbs.', price: 6.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80', isPopular: false, isAvailable: true, preparationTime: 7 },
      { id: 'm1-10', name: 'Giant Beer-Battered Onion Rings', description: 'Crispy sweet onion rings battered in local crafted draft soda, honey mustard sauce.', price: 5.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm1-11', name: 'Loaded Cheese & Bacon Waffle Fries', description: 'Waffle-cut potatoes topped with homemade direct cheddar cream, scallions, dry beef bits.', price: 7.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm1-12', name: 'Spicy Cajun Mozzarella Sticks', description: 'Gooey mozzarella herbs coated in high-heat seasoned cajun flour, marinara glaze.', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'm1-s1', name: 'Sweet Potato Wedges', description: 'Thick cut sweet potatoes dusted in paprika, maple dip.', price: 4.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm1-s2', name: 'Mac & Cheese Bites', description: 'Deep fried macaroni and cheese balls with spicy ranch.', price: 6.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'm1-s3', name: 'Buffalo Chicken Winglets (6pc)', description: 'Bone-in juicy winglets tossed in original buffalo sauce.', price: 8.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm1-s4', name: 'Jalapeno Cheddar Poppers', description: 'Spicy roasted jalapenos stuffed with cheddar cheese and fried crispy.', price: 6.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm1-s5', name: 'Classic Coleslaw Cup', description: 'Fresh shredded cabbage and carrots in creamy sweet mayonnaise dressing.', price: 2.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 0 },

      { id: 'm1-4', name: 'Thick Salted Caramel Shake', description: 'Hand-spun premium vanilla gelato, sea salt, gourmet caramel drizzle.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'm1-13', name: 'Signature Chocolate Peak Shake', description: 'Creamy gelato whipped with pure Belgian cocoa, chocolate drops, vanilla whipped cream.', price: 5.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'm1-14', name: 'Mango Passionfruit Cooler', description: 'Tropical fresh mango and passionfruit pulp muddled with zero-sugar tonic and mint leaves.', price: 4.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 },
      { id: 'm1-15', name: 'Iced Vanilla Cafe Latte', description: 'Double shot of luxury blend coffee beans, chilled oat milk, organic vanilla syrup.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 },
      { id: 'm1-16', name: 'Wild Berry Basil Lemonade', description: 'Hand-pulped blueberries and strawberries sweet lime, fresh basil leaves, sparkling tonic.', price: 3.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 3 },
      { id: 'm1-d1', name: 'Classic Cola Float', description: 'Classic draft cola topped with a huge scoop of vanilla ice cream.', price: 4.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 3 },
      { id: 'm1-d2', name: 'Peach Iced Tea', description: 'Cold brewed black tea sweetened with real peach syrup, ice cubes.', price: 2.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'm1-d3', name: 'Strawberry Banana Smoothie', description: 'Healthy blend of fresh strawberries, bananas, yogurt, and honey.', price: 5.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'm1-d4', name: 'Fresh Sqeezed Orange Juice', description: 'Pure cold-pressed valencia oranges, no added sugar.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 },
      { id: 'm1-d5', name: 'Sparkling Mineral Water', description: 'Chilled premium sparkling water bottle (500ml).', price: 2.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 1 }
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
      { id: 'm2-4', name: 'Creamy Truffle Fettuccine Alfredo', description: 'Egg pasta tossed in gourmet truffle oil, forest mushrooms, and creamy cheese block.', price: 17.99, category: 'Pasta', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'm2-5', name: 'Seafood Linguine Pescatore', description: 'Juicy ocean prawns, clams and calamari cooked in white wine reduction and cherry tomato pure.', price: 22.50, category: 'Pasta', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 18 },
      { id: 'm2-6', name: 'Slow-Simmered Beef Lasagne', description: 'Layers of premium egg dough, rich ground beef bolognese cooked 6 hrs, mozzarella, béchamel.', price: 16.99, category: 'Pasta', image: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 20 },
      { id: 'm2-7', name: 'Tuscan Creamy Pesto Gnocchi', description: 'Soft potato dumplings, cold-pressed basil pesto, warm pine nuts, topped with fresh burrata.', price: 15.99, category: 'Pasta', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      { id: 'm2-3', name: 'Classic Caesar Side', description: 'Crisp romaine, sourdough croutons, creamy parmesan dressing, shaved pecorino.', price: 6.50, category: 'Salads', image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'm2-8', name: 'Heirloom Tomato Caprese Salad', description: 'Juicy heirloom red tomatoes, thick fresh buffalo mozzarella slices, basil oil, aged balsamic.', price: 9.99, category: 'Salads', image: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 7 },
      { id: 'm2-9', name: 'Sweet Fig & Goat Cheese Salad', description: 'Wild organic arugula, premium fresh figs, candied walnuts, goat cheese logs, balsamic drizzle.', price: 11.50, category: 'Salads', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm2-10', name: 'Shaved Fennel & Orange Salad', description: 'Crunchy fennel, sweet orange wheels, baby spinach, pumpkin seed drops, light honey dressing.', price: 8.99, category: 'Salads', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 7 },
      { id: 'm2-12', name: 'Rosemary Garlic Olive Focaccia', description: 'Soft olive oil based flatbread baked with sea salt crystals and fresh garden rosemary.', price: 5.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'm2-13', name: 'Crispy Mushroom Arancini (3pcs)', description: 'Golden breaded risotto rice balls with wild forest fungi and melted fontina cheese.', price: 7.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'm2-14', name: 'Wood-Fired Parmigiana Asparagus', description: 'Tender fire-roasted green asparagus stems topped with sharp pecorino, lemon splash.', price: 6.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'm2-17', name: 'Premium Sparkling Mineral Water', description: 'Chilled imported San Pellegrino premium bottle (750ml).', price: 4.50, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'm2-18', name: 'Frozen Lemon Sorbet Sgropino', description: 'Refreshing sparkling apple cider blended with gourmet sour lemon sorbet.', price: 5.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 }
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
      { id: 'm3-5', name: 'Baked Sizzling Volcano Lobster Roll', description: 'California roll base loaded with high-heat baked sweet cold-water lobster meat pieces, golden unagi sauce.', price: 21.99, category: 'Sushi', image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'm3-6', name: 'Rainbow Maki Roll Deluxe', description: 'Freshly sliced Atlantic salmon, bluefin tuna, sea bass, and tender avocado layered over crab core.', price: 17.50, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      { id: 'm3-2', name: 'Cherry Blossom Nigiri Set', description: 'Chef’s selected fresh tuna, salmon, yellowtail, and sweet shrimp nigiri (4pcs) + maki (4pcs).', price: 19.99, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'm3-9', name: 'Torched Salmon Belly Nigiri (3pcs)', description: 'Fatty melt-in-the-mouth raw salmon belly piece with light glaze torching, sweet teriyaki.', price: 11.99, category: 'Sushi', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'm3-3', name: 'Crispy Garlic Edamame', description: 'Steamed premium edamame sautéed with garlic, sea salt, and a dash of togarashi.', price: 5.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 7 },
      { id: 'm3-13', name: 'Prawn & Zucchini Tempura Combo', description: 'Four black tiger prawns and garden vegetables fried in golden feather-light batter.', price: 11.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm3-14', name: 'Steamed Pork Belly Gua Bao Buns (2pcs)', description: 'Super pillow-soft white yeast buns filled with soy-braised roasted pork belly, green onions.', price: 9.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 11 },
      { id: 'm3-18', name: 'Organic Sparkling Yuzu Lemonade', description: 'Citrus juice from Japanese Yuzu orchard blended with wild honey water.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 },
      { id: 'm3-19', name: 'Jasmine Lychee Iced Sensation', description: 'Brewed cold loose jasmine tea base inflected with juice of muddled sweet lychees.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 }
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
      { id: 'm4-3', name: 'Tofu Buckwheat Soba Noodle Bowl', description: 'Thick organic buckwheat noodles, seared sesame tofu square, edamame beans, raw red peanut paste.', price: 13.49, category: 'Vegan', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 11 },
      { id: 'm4-5', name: 'Spiced Chickpea Buddha Bowl', description: 'Warm organic quinoa, roasted crispy chickpeas, baked maple sweet potato cubes, maple kale, heavy sesame tahini.', price: 12.99, category: 'Vegan', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 10 },
      { id: 'm4-6', name: 'Greek Baked Falafel & Hummus platter', description: 'Handmade seared chickpea falafel discs on house direct organic chickpea hummus, pita wheat wedges.', price: 11.99, category: 'Vegan', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'm4-2', name: 'Super Berry Acai Smoothie bowl', description: 'Blend of pure acai, blueberries, raw banana, almond milk, topped with artisanal flax seeds and organic berries.', price: 8.99, category: 'Salads', image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'm4-13', name: 'Blueberry Avocado Kale Superfood Salad', description: 'Chopped curly green kale leaves, ripe avocado, local blueberries, sunflower seeds, tahini sauce.', price: 11.99, category: 'Salads', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'm4-15', name: 'Chili Crunch Cucumber Sesame Salad', description: 'Crisp green squash cut, seasoned tamari vinegar dressing, rich spicy red chili flakes topping.', price: 7.49, category: 'Salads', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'm4-18', name: 'Organic Cold Brew Hibiscus Rose Florist', description: 'Unsweetened brewed organic scarlet hibiscus calyces, refreshing spearmint leaves.', price: 3.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'm4-19', name: 'Sparkling Green Matcha Kombucha', description: 'Probiotic stone-ground organic green tea leaves, dynamic fizzy citrus drops.', price: 5.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 3 }
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
    minOrder: 12.00,
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
      { id: 'mp1-2', name: 'Special Chicken Boneless Handi', description: 'Creamy, rich tomato-based handi sauce cooked to perfection in a traditional clay pot.', price: 15.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'mp1-5', name: 'Special Shahi Mutton Kunna', description: 'Slow-cooked mutton shank in thick wheat-flour flavorful gravy, a Chinioti delicacy.', price: 18.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 22 },
      { id: 'mp1-3', name: 'Premium Seekh Kebab Roll', description: 'Charcoal-grilled juicy beef seekh kebabs rolled in a hot buttered paratha with mint chutney and chopped onions.', price: 9.99, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 12 },
      { id: 'mp1-7', name: 'Charcoal Grilled Beef Bihari Kebab', description: 'Thin strips of prime beef marinated in mustard oil, yogurt, raw papaya, and spices, charcoal seared.', price: 13.99, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 14 },
      { id: 'mp1-8', name: 'Garlic Cheese Naan Basket', description: 'Multi-layered tandoori flatbread with fresh garlic bits, melted cheddar center, butter glaze.', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'mp1-4', name: 'Shahi Kheer Dessert', description: 'Chilled rich rice pudding infused with cardamoms, saffron, toasted pistachios, and almonds.', price: 5.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp1-9', name: 'Premium Saffron Rabri Lassi', description: 'Thick, rich sweetened yogurt shake blended with chilled saffron rabri milk, almond garnishing.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
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
    minOrder: 15.00,
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
      { id: 'mp2-6', name: 'Red Snapper Seafood Sajji', description: 'Whole red snapper fish seasoned with Balochistani salt rub, slow wood-charcoal roasted.', price: 26.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 22 },
      { id: 'mp2-2', name: 'Melt-in-Mouth Kasturi Boti (6pcs)', description: 'Succulent boneless chicken pieces marinated in curd, cream, saffron, and fresh spices, grilled on live coals.', price: 14.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 },
      { id: 'mp2-5', name: 'Sizzling Beef Gola Kebab', description: 'Delicate round beef kebab charcoal-grilled on heavy skewers, served sizzling with onions.', price: 15.50, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp2-3', name: 'Sajji Chicken with Kabuli Rice', description: 'Traditional dry-rubbed salt-roasted chicken half-chicken, served over aromatic raisins and carrot topped Kabuli rice.', price: 18.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 22 },
      { id: 'mp2-7', name: 'Zafrani Pulao with Fried Mutton', description: 'Basmati rice cooked in mutton stock, saffron threads, topped with golden crispy seared mutton chunk.', price: 19.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp2-4', name: 'Clay-Oven Garlic Naan', description: 'Freshly baked tandoori leavened flatbread topped with minced fresh garlic and butter brush.', price: 2.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'mp2-8', name: 'Kolachi Special Roghni Naan', description: 'Flakier and richer flatbread baked in tandoor with sesame seeds toppings, direct butter wash.', price: 2.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'mp2-9', name: 'Triple-Frosty Mint Lemonade', description: 'Ultimate icy blend of mint leaves, lemon juice, sugar cubes, standard soda.', price: 3.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
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
    minOrder: 8.00,
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
      { id: 'mp3-4', name: 'Double Savour Chicken Pulao Duo', description: 'Extra large portion of pulao grains, served with double piece of gold wood-roasted chicken & 2 shamis.', price: 15.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp3-2', name: 'Crispy Fried Shami Kebab Duo', description: 'Traditional ground meat and lentil patties infused with whole spices and pan-fried with an egg-wash coating.', price: 4.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'mp3-5', name: 'Pindi Street-Style Bun Kabab', description: 'Spiced lentil-potato patty shallow fried in egg whip, mint yogurt spread, sliced red onion, toasted bun.', price: 5.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 6 },
      { id: 'mp3-6', name: 'Creamy Chicken Reshmi Handi', description: 'Boneless chicken cubes simmered inside clay handi pot with green spice cream block.', price: 14.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp3-7', name: 'Crispy Potato Samosa Basket (3pcs)', description: 'Flaky golden hand-made pastry pockets with spiced potato and green pea filling.', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp3-3', name: 'Zafraani Kulfi Stick', description: 'Solid rich saffron-infused condensed milk bar, traditional subcontinental cold dessert.', price: 3.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1501430654243-c934ccd2c190?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 },
      { id: 'mp3-8', name: 'Almond Badami Rabri Lassi', description: 'Sweet thick lassi shake blended with cold badam rabri cubes, almond sprinkles.', price: 4.49, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 4 }
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
    minOrder: 15.00,
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
      { id: 'mp4-2', name: 'Butter Tandoori Chicken Karahi', description: 'Bone-in tender chicken wok-seared with fresh local butter, tandoor spices, organic yogurt topping.', price: 17.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 22 },
      { id: 'mp4-3', name: 'Butt Special Beef Seekh Kebab (4pcs)', description: 'Perfect green spice infused minced beef, charcoal roasted on custom iron skewers.', price: 11.99, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp4-6', name: 'Special Mutton Pulao Savour Grains', description: 'High fragrant basmati rice cooked in mutton bone stock, finished with seared meat pieces.', price: 16.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 18 },
      { id: 'mp4-4', name: 'Tandoori Garlic Butter Roghni Naan', description: 'Leavened clay oven baked yeast flatbread with dense butter glaze, minced garlic, sesame seeds.', price: 2.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'mp4-5', name: 'Premium Badami Almond Lassi Glass', description: 'Chilled local milk curd shake blended with freshly ground almonds, cardamoms.', price: 3.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-pak-5',
    name: 'Kababjees Do Darya',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Barbecue', 'Kebab'],
    rating: 4.8,
    deliveryTime: 35,
    deliveryFee: 3.50,
    minOrder: 20.00,
    address: 'Do Darya, Beach Avenue, Phase VIII, DHA, Karachi',
    phoneNumber: '+92 21 111-666-000',
    isOpen: true,
    hours: '06:00 PM - 02:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p5-1', userName: 'Adnan Siddiqui', rating: 5, comment: 'Scenic Do Darya coastal dining brought right to my doorstep. Love their Malai Boti.', date: '2026-05-25T19:40:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Adnan' }
    ],
    menu: [
      { id: 'mp5-1', name: 'Creamy Chicken Malai Boti (8pcs)', description: 'Boneless chicken cubes marinated in heavy dairy cream, fresh cream cheese, milk curd, charcoal roasted.', price: 14.99, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 18 },
      { id: 'mp5-2', name: 'Sizzling Dhaga Kebab Beef Plate', description: 'Extremely thin grounded marbled beef, grilled on metal skewers wrapped with pure cotton threads.', price: 15.49, category: 'Kebab', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp5-3', name: 'Arabian Sea Red Snapper BBQ', description: 'Fresh local snapper fish rubbed with red pepper lemon-herb spice mix, gridiron grilled.', price: 24.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 25 },
      { id: 'mp5-4', name: 'Kababjees Special Mutton Biryani', description: 'Inimitable Karachi style basmati rice cooked with spicy tender mutton masala layers, mint leaves.', price: 16.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp5-5', name: 'Hot Butter Crispy Lacha Paratha', description: 'Multi-layered pan fried white flatbread rolled in continuous layers of oil and butter, crispy rings.', price: 2.49, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 8 },
      { id: 'mp5-6', name: 'Premium Frosty Pina Colada Cook', description: 'Velvety blend of cold coconut cream, white pineapple juice, crushed ice, pineapple wedge garnish.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-pak-6',
    name: 'Monal Restaurant',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Continental', 'BBQ'],
    rating: 4.8,
    deliveryTime: 45,
    deliveryFee: 4.50,
    minOrder: 25.00,
    address: 'Pir Sohawa Road, Margalla Hills, Islamabad',
    phoneNumber: '+92 51 289-8044',
    isOpen: true,
    hours: '09:00 AM - 12:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p6-1', userName: 'Asad Khan', rating: 5, comment: 'Breathtaking views and equally amazing food!', date: '2026-05-20T19:40:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Asad' }
    ],
    menu: [
      { id: 'mp6-1', name: 'Monal Special Platter', description: 'Assorted BBQ with chicken, beef, mutton and fish tikka.', price: 35.99, category: 'BBQ', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 30 },
      { id: 'mp6-2', name: 'Chicken Makhni Handi', description: 'Boneless chicken cubes cooked in a buttery tomato gravy.', price: 18.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp6-3', name: 'Peshawari Mutton Karahi', description: 'Traditional mutton wok cooked with tomatoes and green chilies.', price: 28.50, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 35 },
      { id: 'mp6-4', name: 'Seekh Kabab Beef (4pcs)', description: 'Succulent minced beef kebabs grilled over charcoal.', price: 12.99, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp6-5', name: 'Cheese Naan', description: 'Tandoori naan stuffed with mozzarella cheese.', price: 3.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp6-6', name: 'Mint Margarita', description: 'Refreshing mocktail with fresh mint, lemon and soda.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp6-7', name: 'Gulab Jamun (4pcs)', description: 'Traditional sweet dumplings in warm sugar syrup.', price: 5.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 5 },
      { id: 'mp6-8', name: 'Chicken Tikka Pizza', description: '12-inch pizza with spicy chicken tikka, onions, and cheese.', price: 15.99, category: 'Continental', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp6-9', name: 'Fettuccine Alfredo', description: 'Pasta cooked in creamy mushroom and chicken sauce.', price: 14.50, category: 'Continental', image: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp6-10', name: 'Lahori Fried Fish', description: 'Spicy batter-fried seasonal fish, served with tamarind sauce.', price: 21.00, category: 'Seafood', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 25 },
      { id: 'mp6-11', name: 'Fresh Cucumber Salad', description: 'Crunchy cucumbers with a light vinaigrette.', price: 3.50, category: 'Salads', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-pak-7',
    name: 'Bundu Khan',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['BBQ', 'Pakistani'],
    rating: 4.7,
    deliveryTime: 35,
    deliveryFee: 2.50,
    minOrder: 15.00,
    address: 'Fortress Stadium, Lahore',
    phoneNumber: '+92 42 111-444-555',
    isOpen: true,
    hours: '12:00 PM - 01:00 AM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-p7-1', userName: 'Omer Farooq', rating: 4, comment: 'Famous for BBQ, and it does not disappoint.', date: '2026-05-21T18:30:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Omer' }
    ],
    menu: [
      { id: 'mp7-1', name: 'Chicken Tikka Leg', description: 'Charcoal grilled spicy chicken leg quarter.', price: 4.99, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 },
      { id: 'mp7-2', name: 'Chicken Tikka Breast', description: 'Charcoal grilled spicy chicken breast quarter.', price: 5.50, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp7-3', name: 'Malai Boti', description: 'Creamy and tender boneless chicken skewers.', price: 9.99, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 15 },
      { id: 'mp7-4', name: 'Beef Behari Kabab', description: 'Melt-in-mouth spicy beef strips grilled on charcoal.', price: 11.50, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp7-5', name: 'Mutton Seekh Kabab', description: 'Spicy minced mutton kebabs.', price: 13.99, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp7-6', name: 'Puri Paratha', description: 'Deep fried crispy flatbread.', price: 1.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 5 },
      { id: 'mp7-7', name: 'Daal Mash', description: 'Lentils cooked with traditional spices and butter.', price: 6.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp7-8', name: 'Chicken Karahi', description: 'Wok-cooked chicken with tomatoes and spices.', price: 16.50, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 25 },
      { id: 'mp7-9', name: 'Soft Drink Cans', description: 'Chilled soda can.', price: 1.50, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 1 },
      { id: 'mp7-10', name: 'Gajar Ka Halwa', description: 'Carrot based sweet dessert with nuts.', price: 4.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp7-11', name: 'Tandoori Roti', description: 'Whole wheat flatbread baked in clay oven.', price: 0.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-pak-8',
    name: 'Student Biryani',
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1505253716362-afaea1d3d1af?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Biryani'],
    rating: 4.6,
    deliveryTime: 20,
    deliveryFee: 1.50,
    minOrder: 10.00,
    address: 'Saddar, Karachi',
    phoneNumber: '+92 21 111-200-200',
    isOpen: true,
    hours: '11:00 AM - 02:00 AM',
    isVerified: true,
    featured: true,
    reviews: [
      { id: 'rev-p8-1', userName: 'Rabia Ali', rating: 5, comment: 'The biryani that never gets old. Classic taste.', date: '2026-05-22T20:10:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Rabia' }
    ],
    menu: [
      { id: 'mp8-1', name: 'Student Special Chicken Biryani', description: 'Karachi style spicy chicken biryani with potatoes.', price: 6.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 10 },
      { id: 'mp8-2', name: 'Beef Biryani', description: 'Flavorful beef biryani with tender meat chunks.', price: 8.50, category: 'Biryani', image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp8-3', name: 'Chicken Broast (Quarter)', description: 'Crispy fried chicken quarter served with fries and bun.', price: 6.50, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp8-4', name: 'Shami Kabab (2pcs)', description: 'Spiced lentil and beef patties.', price: 2.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp8-5', name: 'Raita', description: 'Mint and cumin spiked yogurt.', price: 1.00, category: 'Sides', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'mp8-6', name: 'Fresh Salad', description: 'Sliced onions, cucumbers, and tomatoes.', price: 0.99, category: 'Sides', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'mp8-7', name: 'Zarda (Sweet Rice)', description: 'Traditional sweet yellow rice with nuts.', price: 3.99, category: 'Desserts', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 5 },
      { id: 'mp8-8', name: 'Kheer', description: 'Chilled rice pudding in traditional clay bowls.', price: 3.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 2 },
      { id: 'mp8-9', name: 'Large Soft Drink', description: '1.5 Litre Soda bottle.', price: 2.50, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 1 },
      { id: 'mp8-10', name: 'Chicken Pulao', description: 'Mild spiced chicken and rice pilaf.', price: 6.99, category: 'Biryani', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp8-11', name: 'Anda Shami Burger', description: 'Street style bun kebab with egg and shami patty.', price: 3.50, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 }
    ]
  },
  {
    id: 'rest-pak-9',
    name: 'Salt\'n Pepper Village',
    image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Buffet', 'Pakistani', 'Continental'],
    rating: 4.8,
    deliveryTime: 40,
    deliveryFee: 3.99,
    minOrder: 20.00,
    address: 'MM Alam Road, Gulberg, Lahore',
    phoneNumber: '+92 42 35713611',
    isOpen: true,
    hours: '12:30 PM - 11:30 PM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-p9-1', userName: 'Hassan Raza', rating: 5, comment: 'Amazing spread of Pakistani delicacies.', date: '2026-05-19T14:10:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Hassan' }
    ],
    menu: [
      { id: 'mp9-1', name: 'Mutton Joint Roast', description: 'Tender roasted whole mutton joint with spices.', price: 45.00, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 45 },
      { id: 'mp9-2', name: 'Brain Masala', description: 'Spicy brain curry cooked on a hot plate.', price: 15.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 25 },
      { id: 'mp9-3', name: 'Chicken Ginger', description: 'Stir-fried chicken strips with fresh ginger, chilies, and tomatoes.', price: 14.50, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp9-4', name: 'Lahori Chana', description: 'Authentic Lahori style chickpea curry.', price: 8.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 15 },
      { id: 'mp9-5', name: 'Tandoori Fish', description: 'Marinated fish pieces roasted in clay oven.', price: 18.50, category: 'Seafood', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 25 },
      { id: 'mp9-6', name: 'Chicken Cheese Boti', description: 'Melt-in-mouth chicken boti topped with cheese.', price: 12.50, category: 'BBQ', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 20 },
      { id: 'mp9-7', name: 'Special Family Naan', description: 'Extra large size naan for the full family.', price: 4.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp9-8', name: 'Chicken Jalfrezi', description: 'Chicken in tomato sauce with onions and bell peppers.', price: 15.50, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 20 },
      { id: 'mp9-9', name: 'Caramel Custard', description: 'Smooth egg dessert with burnt sugar syrup.', price: 5.50, category: 'Desserts', image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp9-10', name: 'Plain Rice', description: 'Steamed basmati rice.', price: 3.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp9-11', name: 'Strawberry Shake', description: 'Thick shake made with fresh strawberries.', price: 4.99, category: 'Drinks', image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 }
    ]
  },
  {
    id: 'rest-pak-10',
    name: 'Niswa Restaurant',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=1200&auto=format&fit=crop&q=80',
    cuisine: ['Pakistani', 'Fast Food'],
    rating: 4.5,
    deliveryTime: 25,
    deliveryFee: 1.00,
    minOrder: 5.00,
    address: 'Johar Town, Lahore',
    phoneNumber: '+92 42 33333333',
    isOpen: true,
    hours: '10:00 AM - 01:00 AM',
    isVerified: true,
    featured: false,
    reviews: [
      { id: 'rev-p10-1', userName: 'Saad Ahmed', rating: 4, comment: 'Great budget food, tasty halwa puri', date: '2026-05-18T10:10:00Z', avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Saad' }
    ],
    menu: [
      { id: 'mp10-1', name: 'Halwa Puri Nashta', description: '2 Puris with Chana, Aloo, and sweet Halwa.', price: 3.99, category: 'Breakfast', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 10 },
      { id: 'mp10-2', name: 'Chicken Shawarma', description: 'Spicy chicken slices wrapped in pita bread.', price: 2.50, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', isPopular: true, isAvailable: true, preparationTime: 5 },
      { id: 'mp10-3', name: 'Zinger Burger', description: 'Crispy fried chicken breast in a bun.', price: 3.50, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp10-4', name: 'Loaded Fries', description: 'Fries loaded with chicken, cheese, and spicy mayo.', price: 4.00, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp10-5', name: 'Chicken Paratha Roll', description: 'Chicken boti rolled in crispy paratha.', price: 2.99, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp10-6', name: 'Karak Chai', description: 'Strong brewed milk tea.', price: 1.00, category: 'Drinks', image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp10-7', name: 'Masala Fries', description: 'Fries coated with chat masala.', price: 1.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp10-8', name: 'Club Sandwich', description: 'Triple decker sandwich with chicken, egg, and cheese.', price: 4.50, category: 'Fast Food', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 },
      { id: 'mp10-9', name: 'Mango Lassi', description: 'Sweet yogurt drink blended with mangoes.', price: 2.50, category: 'Drinks', image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp10-10', name: 'Chicken Samosa (2pcs)', description: 'Crispy pastry filled with minced chicken.', price: 1.50, category: 'Sides', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 5 },
      { id: 'mp10-11', name: 'Aloo Wala Paratha', description: 'Potato stuffed flatbread with butter.', price: 1.50, category: 'Pakistani', image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=500&auto=format&fit=crop&q=80', isAvailable: true, preparationTime: 10 }
    ]
  }
];

let RIDERS: Rider[] = [
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
      { date: 'Tue', amount: 95.00, count: 14 },
      { date: 'Wed', amount: 110.00, count: 15 },
      { date: 'Thu', amount: 165.00, count: 20 }
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
      { date: 'Tue', amount: 85.00, count: 11 },
      { date: 'Wed', amount: 95.00, count: 12 },
      { date: 'Thu', amount: 80.00, count: 10 }
    ]
  }
];

let ORDERS: Order[] = [
  {
    id: 'order-101',
    restaurantId: 'rest-1',
    restaurantName: 'BurgerBite Co.',
    restaurantAddress: '142 Gourmet Avenue, Food City',
    items: [
      { id: 'm1-1', name: 'Classic Smash Burger', price: 9.99, quantity: 2 },
      { id: 'm1-3', name: 'Crispy Avocado Fries', price: 5.99, quantity: 1 }
    ],
    subtotal: 25.97,
    deliveryFee: 1.99,
    tax: 2.34,
    tip: 3.50,
    total: 33.80,
    customerName: 'Aman Ahmed',
    customerPhone: '+1 (555) 333-2222',
    customerAddress: 'Suite 404, 82 Central Dr, Food District',
    paymentMethod: 'Stripe Credit',
    status: 'delivered',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(), // 4h ago
    updatedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
    timeline: [
      { status: 'placed', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), note: 'Order placed by credit card.' },
      { status: 'accepted', timestamp: new Date(Date.now() - 3600000 * 3.9).toISOString(), note: 'BurgerBite Co. has accepted your order.' },
      { status: 'preparing', timestamp: new Date(Date.now() - 3600000 * 3.8).toISOString(), note: 'Burger chef is grilling your patties!' },
      { status: 'ready', timestamp: new Date(Date.now() - 3600000 * 3.6).toISOString(), note: 'Order packed & ready for pickup.' },
      { status: 'dispatched', timestamp: new Date(Date.now() - 3600000 * 3.55).toISOString(), note: 'Rider Zack Walker is heading to deliver.' },
      { status: 'delivered', timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(), note: 'Delivered securely. Enjoy your food!' }
    ],
    riderId: 'rider-1',
    riderName: 'Zack Walker',
    riderPhone: '+1 (555) 234-5678',
    deliveryNote: 'Leave strictly at reception table please.'
  }
];

let MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    orderId: 'order-101',
    sender: 'system',
    message: 'Delivery chat session initialized.',
    timestamp: new Date(Date.now() - 3600000 * 3.55).toISOString()
  },
  {
    id: 'msg-2',
    orderId: 'order-101',
    sender: 'rider',
    message: 'Hello Aman, I am picking up your burgers now and should be with you in 12 mins.',
    timestamp: new Date(Date.now() - 3600000 * 3.53).toISOString()
  },
  {
    id: 'msg-3',
    orderId: 'order-101',
    sender: 'customer',
    message: 'Thank you! The reception is open standard hours, you can just leave it with Sarah.',
    timestamp: new Date(Date.now() - 3600000 * 3.51).toISOString()
  }
];

// ==========================================
// CENTRAL SYSTEM ANALYTICS COMPILER
// ==========================================
function compileAnalytics(): PlatformAnalytics {
  const completedOrders = ORDERS.filter(o => o.status === 'delivered');
  const totalSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalOrders = ORDERS.length;
  const commissionEarned = totalSales * 0.18; // 18% commission fee

  // Sales trend simulation
  const salesHistory = [
    { date: 'May 22', sales: 120.50, orders: 4 },
    { date: 'May 23', sales: 180.00, orders: 5 },
    { date: 'May 24', sales: 240.20, orders: 8 },
    { date: 'May 25', sales: 310.40, orders: 9 },
    { date: 'May 26', sales: 290.00, orders: 7 },
    { date: 'May 27', sales: 440.50, orders: 12 },
    { date: 'May 28', sales: totalSales, orders: totalOrders }
  ];

  return {
    totalSales: Number(totalSales.toFixed(2)),
    totalOrders,
    commissionEarned: Number(commissionEarned.toFixed(2)),
    totalCustomers: 78,
    totalRiders: RIDERS.length,
    totalRestaurants: INITIAL_RESTAURANTS.length,
    salesData: salesHistory,
    cuisinePopularity: [
      { name: 'Burgers', value: 45 },
      { name: 'Sushi', value: 25 },
      { name: 'Italian Pasta', value: 20 },
      { name: 'Salads & Vegan', value: 10 }
    ]
  };
}

// ==========================================
// SIMULATOR VEHICLE DISPATCH LOOP
// This logic updates driver locations relative to active order statuses!
// ==========================================
setInterval(() => {
  // Find orders where delivery driver is dispatched or has picked up
  const activeOrders = ORDERS.filter(o => o.status === 'dispatched' || o.status === 'picked_up');
  activeOrders.forEach(order => {
    const rider = RIDERS.find(r => r.id === order.riderId);
    if (!rider) return;

    // Simulate simple driver movement (increments of distance mapping)
    // If dispatched, head towards restaurant (assume restaurant is at 40,40)
    // If picked_up, head towards customer (assume customer is at 80,75)
    let target = { lat: 40, lng: 40 };
    if (order.status === 'picked_up') {
      target = { lat: 80, lng: 75 };
    }

    const dLat = target.lat - rider.location.lat;
    const dLng = target.lng - rider.location.lng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distance > 2) {
      rider.location.lat += (dLat / distance) * 2;
      rider.location.lng += (dLng / distance) * 2;
      // Round to prevent tiny float decimals
      rider.location.lat = parseFloat(rider.location.lat.toFixed(1));
      rider.location.lng = parseFloat(rider.location.lng.toFixed(1));
    }
  });
}, 4000);

// ==========================================
// GEMINI INTELLIGENCE API SERVICES (Lazy Loaded)
// ==========================================
let aiInstance: GoogleGenAI | null = null;
function getAIInstance() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== 'MY_GEMINI_API_KEY') {
      aiInstance = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
  }
  return aiInstance;
}

// ==========================================
// REST ENDPOINTS
// ==========================================

// 1. Restaurant endpoints
app.get('/api/restaurants', (req: Request, res: Response) => {
  res.json(INITIAL_RESTAURANTS);
});

app.post('/api/restaurants', (req: Request, res: Response) => {
  const newRest: Partial<Restaurant> = req.body;
  const restaurant: Restaurant = {
    id: `rest-${Date.now()}`,
    name: newRest.name || 'New Onboarded Spot',
    image: newRest.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
    bannerImage: newRest.bannerImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80',
    cuisine: newRest.cuisine || ['International'],
    rating: 5.0,
    deliveryTime: newRest.deliveryTime || 25,
    deliveryFee: newRest.deliveryFee || 2.50,
    minOrder: newRest.minOrder || 10.00,
    address: newRest.address || '1 Main Food Blvd',
    phoneNumber: newRest.phoneNumber || '+1 (555) 000-0000',
    isOpen: true,
    hours: newRest.hours || '10:00 AM - 10:00 PM',
    isVerified: false, // Must be approved by Admin!
    reviews: [],
    menu: newRest.menu || []
  };
  INITIAL_RESTAURANTS.push(restaurant);
  res.status(201).json(restaurant);
});

// Verification trigger
app.patch('/api/restaurants/:id/verify', (req: Request, res: Response) => {
  const rest = INITIAL_RESTAURANTS.find(r => r.id === req.params.id);
  if (!rest) {
    res.status(404).json({ error: 'Restaurant not found' });
    return;
  }
  rest.isVerified = req.body.isVerified ?? true;
  res.json(rest);
});

// Update Menu items
app.post('/api/restaurants/:id/menu', (req: Request, res: Response) => {
  const rest = INITIAL_RESTAURANTS.find(r => r.id === req.params.id);
  if (!rest) {
    res.status(404).json({ error: 'Restaurant not found' });
    return;
  }
  const newItem: MenuItem = {
    id: `m-${Date.now()}`,
    name: req.body.name || 'Signature Combo',
    description: req.body.description || 'Delicious freshly made recipe combo.',
    price: Number(req.body.price) || 8.99,
    category: req.body.category || 'Mains',
    image: req.body.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    isAvailable: true,
    isPopular: req.body.isPopular || false,
    allergens: req.body.allergens || [],
    preparationTime: req.body.preparationTime || 12
  };
  rest.menu.push(newItem);
  res.status(201).json(newItem);
});

// Availability toggle
app.patch('/api/restaurants/:id/menu/:itemId', (req: Request, res: Response) => {
  const rest = INITIAL_RESTAURANTS.find(r => r.id === req.params.id);
  if (!rest) {
    res.status(404).json({ error: 'Restaurant not found' });
    return;
  }
  const item = rest.menu.find(i => i.id === req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  if (req.body.isAvailable !== undefined) {
    item.isAvailable = req.body.isAvailable;
  }
  if (req.body.price !== undefined) {
    item.price = Number(req.body.price);
  }
  res.json(item);
});

// 2. Orders endpoints
app.get('/api/orders', (req: Request, res: Response) => {
  res.json(ORDERS);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const { restaurantId, items, customerName, customerAddress, customerPhone, paymentMethod, tip, deliveryNote } = req.body;
  const rest = INITIAL_RESTAURANTS.find(r => r.id === restaurantId);
  if (!rest) {
    res.status(400).json({ error: 'Invalid Restaurant ID' });
    return;
  }

  const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
  const deliveryFee = rest.deliveryFee;
  const tax = subtotal * 0.09; // 9% average local tax
  const tipValue = Number(tip) || 0;
  const total = subtotal + deliveryFee + tax + tipValue;

  const newOrder: Order = {
    id: `order-${Math.floor(100 + Math.random() * 900)}`,
    restaurantId,
    restaurantName: rest.name,
    restaurantAddress: rest.address,
    items,
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: Number(deliveryFee.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    tip: Number(tipValue.toFixed(2)),
    total: Number(total.toFixed(2)),
    customerName: customerName || 'Valued Customer',
    customerPhone: customerPhone || '+1 (555) 444-4444',
    customerAddress: customerAddress || '1 Royal Plaza, Food City',
    paymentMethod: paymentMethod || 'Instant Wallet Transfer',
    status: 'placed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: [
      { status: 'placed', timestamp: new Date().toISOString(), note: 'Order placed, awaiting restaurant verification.' }
    ],
    deliveryNote: deliveryNote || ''
  };

  ORDERS.unshift(newOrder);

  // Initialize a default system message
  MESSAGES.push({
    id: `msg-${Date.now()}`,
    orderId: newOrder.id,
    sender: 'system',
    message: `New Order ${newOrder.id} has been created. Awaiting acceptance from ${rest.name}.`,
    timestamp: new Date().toISOString()
  });

  res.status(201).json(newOrder);
});

// Handle Order status updates
app.patch('/api/orders/:id', (req: Request, res: Response) => {
  const order = ORDERS.find(o => o.id === req.params.id);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const { status, riderId, note } = req.body;
  if (status) {
    order.status = status as OrderStatus;
    order.updatedAt = new Date().toISOString();

    let notificationText = `Order updated to ${status}.`;
    if (status === 'accepted') {
      notificationText = `${order.restaurantName} accepted your order and is looking over details.`;
    } else if (status === 'preparing') {
      notificationText = `Your delicious food is being prepared.`;
    } else if (status === 'ready') {
      notificationText = `Food is fully prepared, packed, and awaiting driver pickup!`;
    } else if (status === 'dispatched') {
      // Dispatching a driver automatically!
      const assignedRider = RIDERS.find(r => r.id === (riderId || 'rider-1'));
      if (assignedRider) {
        order.riderId = assignedRider.id;
        order.riderName = assignedRider.name;
        order.riderPhone = assignedRider.phone;
        order.riderAvatar = assignedRider.avatar;
        assignedRider.status = 'delivering';
        assignedRider.currentOrderId = order.id;
        notificationText = `Rider ${assignedRider.name} is dispatched to pick up your order.`;
      } else {
        notificationText = `A FoodRush delivery rider is dispatched to fetch your meals.`;
      }
    } else if (status === 'picked_up') {
      notificationText = `Your food is picked up! Zack is riding at top speed to your doorstep.`;
    } else if (status === 'delivered') {
      notificationText = `Order delivered successfully. Enjoy your FoodRush!`;
      // Credit earnings
      if (order.riderId) {
        const assignedRider = RIDERS.find(r => r.id === order.riderId);
        if (assignedRider) {
          assignedRider.earnings += 6.50 + order.tip; // $6.50 delivery payout base + tip
          assignedRider.status = 'idle';
          assignedRider.currentOrderId = undefined;
        }
      }
    }

    order.timeline.push({
      status: status as OrderStatus,
      timestamp: new Date().toISOString(),
      note: note || notificationText
    });

    MESSAGES.push({
      id: `msg-${Date.now()}`,
      orderId: order.id,
      sender: 'system',
      message: note || notificationText,
      timestamp: new Date().toISOString()
    });
  }

  res.json(order);
});

app.patch('/api/orders/:id/rating', (req: Request, res: Response) => {
  const { id } = req.params;
  const { rating } = req.body;
  const order = ORDERS.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  order.rating = rating;
  order.updatedAt = new Date().toISOString();
  res.json(order);
});

// Add Review to Restaurant
app.post('/api/restaurants/:id/reviews', (req: Request, res: Response) => {
  const rest = INITIAL_RESTAURANTS.find(r => r.id === req.params.id);
  if (!rest) {
    res.status(444).json({ error: 'Not found' });
    return;
  }

  const newReview: Review = {
    id: `rev-${Date.now()}`,
    userName: req.body.userName || 'Anonymous Client',
    rating: Number(req.body.rating) || 5,
    comment: req.body.comment || 'Spetacular fresh delivery!',
    date: new Date().toISOString(),
    avatar: `https://api.dicebear.com/7.x/adventurer/svg?seed=${req.body.userName || 'Anon'}`
  };

  rest.reviews.unshift(newReview);
  // Recalculate average rating
  const sum = rest.reviews.reduce((acc, r) => acc + r.rating, 0);
  rest.rating = parseFloat((sum / rest.reviews.length).toFixed(1));

  res.status(201).json(newReview);
});

// 3. Messages Endpoints
app.get('/api/orders/:id/chat', (req: Request, res: Response) => {
  const msgs = MESSAGES.filter(m => m.orderId === req.params.id);
  res.json(msgs);
});

app.post('/api/orders/:id/chat', (req: Request, res: Response) => {
  const { sender, message } = req.body;
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    orderId: req.params.id,
    sender: sender || 'system',
    message: message || '',
    timestamp: new Date().toISOString()
  };
  MESSAGES.push(newMsg);
  res.status(201).json(newMsg);
});

// 4. Riders endpoints
app.get('/api/riders', (req: Request, res: Response) => {
  res.json(RIDERS);
});

app.patch('/api/riders/:id', (req: Request, res: Response) => {
  const rider = RIDERS.find(r => r.id === req.params.id);
  if (!rider) {
    res.status(404).json({ error: 'Rider not found' });
    return;
  }
  if (req.body.location) {
    rider.location = req.body.location;
  }
  if (req.body.status) {
    rider.status = req.body.status;
  }
  res.json(rider);
});

// 5. Platform Analytics Endpoint
app.get('/api/admin/analytics', (req: Request, res: Response) => {
  res.json(compileAnalytics());
});

// ==========================================
// 6. GEMINI AI ASSISTANT EMBEDDED AGENT
// ==========================================
app.post('/api/ai/chatbot', async (req: Request, res: Response) => {
  const { message, chatHistory } = req.body;

  // Retrieve details of restaurants and products so Gemini actually knows what's online!
  const menuOverview = INITIAL_RESTAURANTS.map(r => ({
    name: r.name,
    cuisine: r.cuisine.join(', '),
    rating: r.rating,
    deliveryFee: `$${r.deliveryFee}`,
    address: r.address,
    popularItems: r.menu.map(m => `${m.name} ($${m.price})`).join(', ')
  }));

  const systemInstruction = `
    You are FoodRush's Intelligent Smart Food Delivery Assistant.
    You assist customers with finding dishes, cuisines, recommending specific restaurants, and drafting orders.
    
    Here is the exact real-time restaurant database context that is currently online:
    ${JSON.stringify(menuOverview, null, 2)}
    
    Rules for response:
    1. Be incredibly cheerful, concise, and helpful. Focus on food cravings, speed, and real recommendations.
    2. Suggest specific dishes from the menu above. Reference pricing and delivery fees.
    3. You can offer a "smart draft order suggestion" in your text if they say they want you to decide for them.
    4. Speak in clear, beautiful Markdown with spacing. Bold key foods.
  `;

  const ai = getAIInstance();
  if (!ai) {
    // Elegant fallback if no key is supplied
    res.json({
      text: `### 🚀 FoodRush AI Assistant (Demo Mode Only)
      
Unfortunately, the server's **GEMINI_API_KEY** is not configured, or is running inside the sandbox with local demo values!
However, I can simulate an intelligent recommendation for you:

#### 🍔 Recommended for Quick Cravings:
* **The Classic Smash Burger** ($9.99) from *BurgerBite Co.* with a side of **Crispy Avocado Fries** ($5.99).
* Or try the authentic **Rigatoni Carbonara** ($14.99) from *PastaPrado Italian*.

*Configure your actual API key under the AI Studio secrets widget to unlock 100% live server-side AI reasoning!*`
    });
    return;
  }

  try {
    const formattedContents = chatHistory?.map((c: any) => ({
      role: c.sender === 'customer' ? 'user' : 'model',
      parts: [{ text: c.message }]
    })) || [];

    formattedContents.push({ role: 'user', parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ error: 'AI reasoning failed.', info: error.message });
  }
});

// AI Predictor of meal delivery and suggestions in Home
app.post('/api/ai/recommendations', async (req: Request, res: Response) => {
  const { preference } = req.body; // e.g. "vegan", "gluten-free", "indulgent", "fastest"
  
  const ai = getAIInstance();
  if (!ai) {
    // Standard mock list
    res.json({
      reason: "Based on local lunch predictions, lightning-fast delivery speeds, and popular ratings in Midtown.",
      items: ["Classic Smash Burger", "Rigatoni Carbonara", "Premium Dragon Roll"]
    });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Given the preference category "${preference}", recommend up to 3 perfect food pairings. Return in simple bullet points with a concluding summary sentence.`,
      config: {
        systemInstruction: "You are a specialized food recommendation agent. Be extremely brief (max 3 sentences total)."
      }
    });
    res.json({
      reason: response.text,
      items: []
    });
  } catch (e) {
    res.json({
      reason: "Based on standard ratings and speed, here are top dishes.",
      items: ["Classic Smash Burger", "Premium Dragon Roll"]
    });
  }
});

// ==========================================
// VITE CONTROLLER MIDDLEWARE
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const viteModule = 'vite';
    const { createServer: createViteServer } = await import(viteModule);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`FoodRush server online at http://0.0.0.0:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
