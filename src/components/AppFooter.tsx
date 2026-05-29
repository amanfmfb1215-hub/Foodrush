import React from 'react';
import {
  Compass,
  ChefHat,
  Bike,
  Building,
  Sparkles,
  ShieldCheck,
  Globe,
  Phone,
  MapPin,
  Mail,
  ArrowRight,
  Heart
} from 'lucide-react';

interface AppFooterProps {
  currentRole: 'customer' | 'restaurant' | 'rider' | 'admin';
  onChangeRole: (role: 'customer' | 'restaurant' | 'rider' | 'admin') => void;
  onSelectRestaurant: (restaurantId: string) => void;
  onNavigateHome: () => void;
  onNavigateTracking: () => void;
  onOpenAssistant: () => void;
  hasActiveOrder: boolean;
  hasItemsInCart: boolean;
}

export default function AppFooter({
  currentRole,
  onChangeRole,
  onSelectRestaurant,
  onNavigateHome,
  onNavigateTracking,
  onOpenAssistant,
  hasActiveOrder,
  hasItemsInCart
}: AppFooterProps) {
  return (
    <footer id="app-premium-footer" className="mt-auto bg-zinc-950 text-zinc-300 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl relative">
      {/* Decorative colored top line */}
      <div className="h-1.5 bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500"></div>

      {/* Main Content Area */}
      <div className="p-8 md:p-12 lg:p-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 relative z-10">
        
        {/* Brand Column */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <img src="https://kommodo.ai/i/NrZ2JNGDqX4cD2NIEhZX" alt="Logo" className="w-8 h-8 rounded-xl object-cover shadow-md" referrerPolicy="no-referrer" />
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                FoodRush <span className="text-[10px] bg-orange-500/20 text-orange-400 font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">PREMIUM</span>
              </h2>
              <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-widest leading-none mt-0.5">Pakistan's Gourmet Hub</p>
            </div>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mt-1">
            An advanced, intelligent hyper-local food commerce platform delivering hot, aromatic regional cuisines, barbecues, and street delicacies with live map path optimization.
          </p>

          <div className="flex flex-col gap-1.5 text-xs text-zinc-500 mt-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-orange-500/80 shrink-0" />
              <span>DHA Phase 6, Karachi, Pakistan</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-orange-500/80 shrink-0" />
              <span>+92 (21) 111-RUSH-99</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-orange-500/80 shrink-0" />
              <span>support@foodrush.pk</span>
            </div>
          </div>
        </div>

        {/* Column 2: Quick Navigation */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-1.5 border-b border-zinc-900 font-mono">
            Discover Food & Pages
          </h4>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li>
              <button
                onClick={onNavigateHome}
                className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left w-full group"
              >
                <Compass className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                <span>Explore Restaurants (Home)</span>
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
            <li>
              <button
                onClick={onNavigateTracking}
                className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left w-full group"
              >
                <Compass className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                <span>Track Live Order Status</span>
                {hasActiveOrder && (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                )}
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
            <li>
              <button
                onClick={onOpenAssistant}
                className="hover:text-amber-400 transition-colors flex items-center gap-2 text-left w-full group"
              >
                <Sparkles className="w-3.5 h-3.5 text-zinc-500 group-hover:text-amber-400" />
                <span>AI Meal Suggestion Assistant</span>
                <span className="text-[9px] bg-amber-500/10 text-amber-400 font-extrabold px-1 py-0.2 rounded-full font-mono scale-90">LIVE</span>
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
            <li>
              <div className="bg-zinc-900/50 p-2 rounded-xl mt-2 border border-zinc-900/80 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider font-mono">Active Cart Status</span>
                  <span className="text-[11px] text-zinc-500">
                    {hasItemsInCart ? '🛒 Items ready for checkout!' : 'Cart is currently empty'}
                  </span>
                </div>
                {hasItemsInCart && (
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full font-extrabold uppercase animate-pulse">
                    Open Cart
                  </span>
                )}
              </div>
            </li>
          </ul>
        </div>

        {/* Column 3: Famous Pakistani Hotspots */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-1.5 border-b border-zinc-900 font-mono flex items-center justify-between">
            <span>Pakistani Hotspots</span>
            <span className="text-[9px] bg-orange-600/20 text-orange-400 px-1 py-0.5 rounded">FAMOUS</span>
          </h4>
          <ul className="flex flex-col gap-2.5 text-xs">
            <li>
              <button
                onClick={() => onSelectRestaurant('rest-pak-1')}
                className="hover:text-amber-400 transition-colors flex items-center justify-between w-full group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] shrink-0">👑</span>
                  <div>
                    <span className="font-semibold block group-hover:text-amber-400">Lal Qila Royal Biryani</span>
                    <span className="text-[10px] text-zinc-500 block">Clifton, Karachi • 4.9 ★</span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectRestaurant('rest-pak-2')}
                className="hover:text-amber-400 transition-colors flex items-center justify-between w-full group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] shrink-0">🌊</span>
                  <div>
                    <span className="font-semibold block group-hover:text-amber-400">Kolachi Seafood & Karahi</span>
                    <span className="text-[10px] text-zinc-500 block">Beach Ave, Karachi • 4.8 ★</span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
            <li>
              <button
                onClick={() => onSelectRestaurant('rest-pak-3')}
                className="hover:text-amber-400 transition-colors flex items-center justify-between w-full group text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[11px] shrink-0">🍢</span>
                  <div>
                    <span className="font-semibold block group-hover:text-amber-400">Savour Foods Rawalpindi</span>
                    <span className="text-[10px] text-zinc-500 block">Gordon College Rd • 4.7 ★</span>
                  </div>
                </div>
                <ArrowRight className="w-3 h-3 text-transparent group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: Platform Swapping (Page Switcher) */}
        <div>
          <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 pb-1.5 border-b border-zinc-900 font-mono">
            Platform Portals
          </h4>
          <div className="flex flex-col gap-2">
            {[
              { role: 'customer', title: 'Customer Main Lounge', icon: Compass, color: 'hover:border-emerald-500/50 hover:bg-emerald-500/5', activeColor: 'border-emerald-500 bg-emerald-500/10 text-emerald-400' },
              { role: 'restaurant', title: 'Merchant Kitchen Centre', icon: ChefHat, color: 'hover:border-orange-500/50 hover:bg-orange-500/5', activeColor: 'border-orange-500 bg-orange-500/10 text-orange-400' },
              { role: 'rider', title: 'Courier Delivery Hub', icon: Bike, color: 'hover:border-yellow-500/50 hover:bg-yellow-500/5', activeColor: 'border-yellow-500 bg-yellow-500/10 text-yellow-500' },
              { role: 'admin', title: 'Admin Command Console', icon: Building, color: 'hover:border-sky-500/50 hover:bg-sky-500/5', activeColor: 'border-sky-500 bg-sky-500/10 text-sky-400' }
            ].map((portal) => {
              const IconComp = portal.icon;
              const isActive = currentRole === portal.role;
              return (
                <button
                  key={portal.role}
                  onClick={() => onChangeRole(portal.role as any)}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs text-left transition-all ${isActive ? portal.activeColor : 'border-zinc-900 bg-zinc-950 text-zinc-400 ' + portal.color}`}
                >
                  <IconComp className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="font-extrabold block text-[11px] truncate">{portal.title}</span>
                    <span className="text-[9px] text-zinc-600 uppercase font-mono block">
                      {isActive ? 'Active Session' : 'Switch Space'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Grid line effect backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none z-0"></div>

      {/* Payment Partners Panel */}
      <div className="border-t border-zinc-900 bg-zinc-950 p-6 flex flex-col items-center gap-4 relative z-10 text-xs text-zinc-500 font-medium">
        <h4 className="text-[10px] uppercase font-bold text-zinc-400 font-mono tracking-widest text-center w-full max-w-4xl mx-auto flex items-center justify-center gap-4">
          <div className="h-[1px] bg-zinc-800 flex-1"></div>
          <span>Trusted Payment Partners</span>
          <div className="h-[1px] bg-zinc-800 flex-1"></div>
        </h4>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 opacity-70 hover:opacity-100 transition-opacity">
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/rPpWlM20xmxdNEvKK46K/image.jpg" referrerPolicy="no-referrer" alt="EasyPaisa" className="h-6 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/nL9HP7ecOENYxBNKXZvg/image.png" referrerPolicy="no-referrer" alt="JazzCash" className="h-6 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/eqoB2lmRhOImubHZWWjF/image.png" referrerPolicy="no-referrer" alt="HBL" className="h-6 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/EpmsfeQFibzbgtVVRdNg/image.png" referrerPolicy="no-referrer" alt="Meezan" className="h-7 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/qzvieLpnKlRqyPy8blpm/image.png" referrerPolicy="no-referrer" alt="UBL" className="h-7 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/Q97lU30isU90YpxSiEk3/image.png" referrerPolicy="no-referrer" alt="MCB" className="h-7 object-contain bg-white rounded p-0.5" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/MrX43DkVF2nEwH0RzePu/image.png" referrerPolicy="no-referrer" alt="Allied Bank" className="h-8 object-contain" />
          <img src="https://plain-eeur-prod-public.komododecks.com/202605/28/YecBMF8T32GYj7Sdd0sP/image.png" referrerPolicy="no-referrer" alt="Bank Alfalah" className="h-7 object-contain" />
        </div>
      </div>

      {/* Sub-Footer Panel */}
      <div className="border-t border-zinc-900 bg-zinc-950/80 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10 text-xs text-zinc-500 font-medium">
        <div className="flex items-center gap-2">
          <span>&copy; {new Date().getFullYear()} FoodRush Inc. All rights reserved.</span>
          <span className="hidden sm:inline text-zinc-700">•</span>
          <span className="flex items-center gap-1 text-zinc-400">
            Proudly hand-crafted for food enthusiasts in Pakistan
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-900/50">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-0.5"></span>
            SSL Secured Checkout
          </span>
          <span className="bg-orange-950/20 text-orange-400 border border-orange-950 px-20 px-2 py-0.5 rounded">
            v2.4 LTS Stable
          </span>
        </div>
      </div>
    </footer>
  );
}
