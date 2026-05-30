import React, { useState, useRef } from 'react';
import { auth } from '../firebase';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { Phone, Shield, ArrowRight, Loader } from 'lucide-react';

interface OTPLoginProps {
  onSuccess: (user: any) => void;
}

export default function OTPLogin({ onSuccess }: OTPLoginProps) {
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<HTMLDivElement>(null);

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
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const phoneNumber = phone.startsWith('+') ? phone : `+92${phone}`;
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
      onSuccess(result.user);
    } catch (err: any) {
      setError('Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl border border-zinc-200 p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="FoodRush" className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3" />
          <h1 className="text-2xl font-black text-orange-600">FoodRush</h1>
          <p className="text-xs text-zinc-400 mt-1">Pakistan's Gourmet Hub</p>
        </div>

        {step === 'phone' ? (
          <>
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Phone className="w-6 h-6 text-orange-600" />
              </div>
              <h2 className="text-lg font-black text-slate-900">Enter Phone Number</h2>
              <p className="text-xs text-zinc-400 mt-1">We'll send you a verification code</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <div className="bg-zinc-100 border border-zinc-200 rounded-xl px-3 flex items-center text-sm font-bold text-zinc-600">
                  🇵🇰 +92
                </div>
                <input
                  type="tel"
                  placeholder="3001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={10}
                  className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleSendOTP}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>Send OTP <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <p className="text-center text-[11px] text-zinc-400">
                By continuing, you agree to our Terms of Service
              </p>
            </div>
          </>
        ) : (
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
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                maxLength={6}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <button
                onClick={handleVerifyOTP}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-wait"
              >
                {loading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <>Verify & Login <Shield className="w-4 h-4" /></>
                )}
              </button>

              <button
                onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                className="text-xs text-orange-600 hover:text-orange-700 font-bold text-center"
              >
                ← Change phone number
              </button>
            </div>
          </>
        )}

        {/* Invisible reCAPTCHA */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
}
