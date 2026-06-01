import React, { useState } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { ChefHat, Bike, User, Shield, Loader, Utensils } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: any, role: 'customer' | 'restaurant' | 'rider' | 'admin') => void;
}

type Role = 'customer' | 'restaurant' | 'rider';

const ADMIN_EMAIL = 'amanfmfb1215@gmail.com';

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    {
      id: 'customer' as Role,
      title: 'Customer',
      subtitle: 'Order food & track delivery',
      emoji: '👤',
      activeColor: 'border-orange-500 bg-orange-500',
      hoverColor: 'hover:border-orange-300 hover:bg-orange-50',
      baseColor: 'border-zinc-200 bg-white',
    },
    {
      id: 'restaurant' as Role,
      title: 'Restaurant Owner',
      subtitle: 'Manage menu & orders',
      emoji: '🍳',
      activeColor: 'border-emerald-500 bg-emerald-500',
      hoverColor: 'hover:border-emerald-300 hover:bg-emerald-50',
      baseColor: 'border-zinc-200 bg-white',
    },
    {
      id: 'rider' as Role,
      title: 'Delivery Rider',
      subtitle: 'Accept & deliver orders',
      emoji: '🚴',
      activeColor: 'border-blue-500 bg-blue-500',
      hoverColor: 'hover:border-blue-300 hover:bg-blue-50',
      baseColor: 'border-zinc-200 bg-white',
    },
  ];

  const handleGoogleLogin = async () => {
    if (!selectedRole) {
      setError('Please select your role first!');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if admin
      if (user.email === ADMIN_EMAIL) {
        onSuccess(user, 'admin');
        return;
      }

      // Regular user with selected role
      onSuccess(user, selectedRole);
    } catch (err: any) {
      setError('Login failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 w-full max-w-md overflow-hidden">

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
          
          {/* Logo — SVG so never breaks */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-3xl font-black tracking-tight">FoodRush</h1>
          <p className="text-orange-100 text-sm mt-1">Pakistan's Gourmet Hub 🇵🇰</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Fast Delivery • AI Powered
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-black text-slate-900">Who are you?</h2>
            <p className="text-xs text-zinc-400 mt-1">Select your role then login with Google</p>
          </div>

          {/* Role Cards */}
          <div className="flex flex-col gap-3 mb-6">
            {roles.map((role) => {
              const isActive = selectedRole === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                    isActive
                      ? `${role.activeColor} text-white shadow-lg scale-[1.01]`
                      : `${role.baseColor} ${role.hoverColor} text-slate-900`
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-none ${isActive ? 'bg-white/20' : 'bg-zinc-50'}`}>
                    {role.emoji}
                  </div>
                  <div className="flex-1">
                    <p className={`font-black text-sm ${isActive ? 'text-white' : 'text-slate-900'}`}>
                      {role.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-zinc-400'}`}>
                      {role.subtitle}
                    </p>
                  </div>
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-none">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium mb-4 text-center">
              ⚠️ {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl font-black text-sm transition-all border-2 ${
              selectedRole
                ? 'bg-white border-zinc-200 hover:border-orange-300 hover:shadow-md text-slate-900 shadow-sm'
                : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin text-orange-500" />
            ) : (
              <>
                {/* Google SVG Icon */}
                <svg className="w-5 h-5 flex-none" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Admin hint */}
          <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-center gap-2">
            <Shield className="w-3 h-3 text-zinc-300" />
            <span className="text-[10px] text-zinc-300">Admin access is automatically detected on login</span>
          </div>
        </div>
      </div>
    </div>
  );
}
