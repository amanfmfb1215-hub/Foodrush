import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { Phone, Shield, ArrowRight, Loader, ChefHat, Bike, User, Lock } from 'lucide-react';

interface LoginPageProps {
  onSuccess: (user: any, role: 'customer' | 'restaurant' | 'rider') => void;
}

type Role = 'customer' | 'restaurant' | 'rider';

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [step, setStep] = useState<'role' | 'phone' | 'otp'>('role');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);

  const roles = [
    {
      id: 'customer' as Role,
      title: 'Customer',
      subtitle: 'Order food & track delivery',
      icon: User,
      color: 'border-orange-200 bg-orange-50 hover:border-orange-400',
      activeColor: 'border-orange-500 bg-orange-500 text-white',
      iconColor: 'text-orange-600',
      emoji: '👤'
    },
    {
      id: 'restaurant' as Role,
      title: 'Restaurant Owner',
      subtitle: 'Manage your menu & orders',
      icon: ChefHat,
      color: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
      activeColor: 'border-emerald-500 bg-emerald-500 text-white',
      iconColor: 'text-emerald-600',
      emoji: '🍳'
    },
    {
      id: 'rider' as Role,
      title: 'Delivery Rider',
      subtitle: 'Accept & deliver orders',
      icon: Bike,
      color: 'border-blue-200 bg-blue-50 hover:border-blue-400',
      activeColor: 'border-blue-500 bg-blue-500 text-white',
      iconColor: 'text-blue-600',
      emoji: '🚴'
    }
  ];

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        'recaptcha-container',
        { size: 'invisible' }
      );
    }
  };

  const handleSendOTP = async () => {
    setError('');
    if (!phone || phone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const phoneNumber = `+92${phone}`;
      const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmation(result);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    setError('');
    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      if (!confirmation) throw new Error('No confirmation found');
      const result = await confirmation.confirm(otp);
      onSuccess(result.user, selectedRole!);
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="FoodRush" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3 shadow-md" />
          <h1 className="text-2xl font-black text-orange-600 tracking-tight">FoodRush</h1>
          <p className="text-xs text-zinc-400 mt-1">Pakistan's Gourmet Hub 🇵🇰</p>
        </div>

        {/* STEP 1: Role Selection */}
        {step === 'role' && (
          <>
            <div className="text-center mb-6">
              <h2 className="text-lg font-black text-slate-900">Welcome! Who are you?</h2>
              <p className="text-xs text-zinc-400 mt-1">Select your role to continue</p>
            </div>

            <div className="flex flex-col gap-3 mb-6">
              {roles.map((role) => {
                const IconComp = role.icon;
                const isActive = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${isActive ? role.activeColor : role.color}`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                      {role.emoji}
                    </div>
                    <div className="flex-1">
                      <p className={`font-black text-sm ${isActive ? 'text-white' : 'text-slate-900'}`}>{role.title}</p>
                      <p className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-zinc-400'}`}>{role.subtitle}</p>
                    </div>
                    {isActive && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-current"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => selectedRole && setStep('phone')}
              disabled={!selectedRole}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* STEP 2: Phone Number */}
        {step === 'phone' && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Enter Phone Number</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Logging in as <span className="font-bold text-orange-600 capitalize">{selectedRole}</span>
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="bg-zinc-100 border border-zinc-200 rounded-xl px-3 flex items-center text-sm font-bold text-zinc-600 whitespace-nowrap">
                  🇵🇰 +92
                </div>
                <input
                  type="tel"
                  placeholder="3001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><Phone className="w-4 h-4" /> Send OTP</>}
              </button>

              <button
                onClick={() => { setStep('role'); setError(''); }}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-bold text-center"
              >
                ← Change role
              </button>
            </div>
          </>
        )}

        {/* STEP 3: OTP Verify */}
        {step === 'otp' && (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Verify OTP</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Code sent to <strong className="text-slate-700">+92{phone}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <input
                type="number"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                className="w-full bg-zinc-50 border-2 border-zinc-200 rounded-2xl px-4 py-4 text-center text-3xl font-black tracking-[0.5em] focus:outline-none focus:border-orange-400"
                autoFocus
              />

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader className="w-4 h-4 animate-spin" /> : <><Shield className="w-4 h-4" /> Verify & Login</>}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold text-center"
              >
                ← Resend OTP
              </button>
            </div>
          </>
        )}

        {/* Invisible reCAPTCHA */}
        <div id="recaptcha-container"></div>

        {/* Admin hint */}
        <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-center gap-2">
          <Lock className="w-3 h-3 text-zinc-300" />
          <span className="text-[10px] text-zinc-300">Admin? Use your secret portal link</span>
        </div>
      </div>
    </div>
  );
}
