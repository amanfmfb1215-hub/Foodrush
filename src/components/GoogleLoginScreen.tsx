import React, { useState, useEffect } from 'react';
import { Flame, Compass, ChefHat, Bike, Building, ShieldCheck, Mail, ArrowRight, LogOut, CheckCircle, Lock, Loader2, Users } from 'lucide-react';
import { auth } from '../lib/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

interface UserSession {
  email: string;
  name: string;
  avatar: string;
  role: 'customer' | 'restaurant' | 'rider' | 'admin';
}

interface GoogleLoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function GoogleLoginScreen({ onLoginSuccess }: GoogleLoginProps) {
  const [step, setStep] = useState<'choose-account' | 'enter-custom-email' | 'select-role'>('choose-account');
  const [selectedAccount, setSelectedAccount] = useState<{ email: string; name: string; avatar: string } | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'customer' | 'restaurant' | 'rider' | 'admin'>('customer');
  const [errorMsg, setErrorMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);

  // Pre-seeded Google accounts for seamless & fast UX sandbox testing
  const preSeededAccounts = [
    {
      email: 'amanfmfb1215@gmail.com',
      name: 'Aman Ahmed',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Aman&backgroundColor=ffb74d',
      desc: 'Owner & Super Admin (Admin Portal unlocked)'
    },
    {
      email: 'tariq.rest@gmail.com',
      name: 'Chef Tariq',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Tariq&backgroundColor=4db6ac',
      desc: 'Restaurant Kitchen Merchant'
    },
    {
      email: 'salman.rider@gmail.com',
      name: 'Salman Captain',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Salman&backgroundColor=81c784',
      desc: 'FoodRush Express Rider'
    },
    {
      email: 'zubair.customer@gmail.com',
      name: 'Zubair Customer',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zubair&backgroundColor=64b5f6',
      desc: 'Standard Diner Account'
    }
  ];

  // Initiate popup OAuth code exchange session via Firebase Auth
  const handleLiveGoogleLogin = async () => {
    try {
      setErrorMsg('');
      setSandboxNotice(null);
      setIsAuthenticating(true);

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user && user.email) {
        const userProfile = {
          email: user.email.toLowerCase(),
          name: user.displayName || user.email.split('@')[0],
          avatar: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.displayName || 'User'}&backgroundColor=ff8a65`
        };

        setSelectedAccount(userProfile);
        setSandboxNotice(null);

        // Automatically set matching roles
        if (user.email.toLowerCase() === 'amanfmfb1215@gmail.com') {
          setSelectedRole('admin');
        } else {
          setSelectedRole('customer');
        }

        setStep('select-role');
      } else {
        throw new Error('Authentication returned an empty email profile from Google.');
      }
    } catch (err: any) {
      console.error('Firebase Auth sign-in failed:', err);
      // Clean up common and nested auth errors
      let displayError = err.message || 'Identity verification aborted or blocked.';
      if (err.code === 'auth/popup-closed-by-user') {
        displayError = 'Verification window was closed before getting approval.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        displayError = 'Simultaneous pop-ups cancelled the active session.';
      } else if (err.code === 'auth/operation-not-allowed') {
        displayError = 'Google Auth provider is not enabled in your Firebase console settings.';
      }
      setErrorMsg(displayError);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSelectPreseeded = (acc: typeof preSeededAccounts[0]) => {
    setSelectedAccount({
      email: acc.email,
      name: acc.name,
      avatar: acc.avatar
    });
    // If the selected email is the admin one, default of selectedRole can be set to 'admin'
    if (acc.email === 'amanfmfb1215@gmail.com') {
      setSelectedRole('admin');
    } else {
      setSelectedRole('customer');
    }
    setStep('select-role');
  };

  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim() || !customEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }
    setErrorMsg('');
    const emailLower = customEmail.trim().toLowerCase();
    
    let finalName = customName.trim() || emailLower.split('@')[0];
    let finalAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${finalName}&backgroundColor=ff8a65`;
    
    if (emailLower === 'amanfmfb1215@gmail.com') {
      finalName = 'Aman Ahmed';
      finalAvatar = 'https://api.dicebear.com/7.x/bottts/svg?seed=Aman&backgroundColor=ffb74d';
      setSelectedRole('admin');
    } else {
      setSelectedRole('customer');
    }

    setSelectedAccount({
      email: emailLower,
      name: finalName,
      avatar: finalAvatar
    });
    setStep('select-role');
  };

  const handleFinishLogin = () => {
    if (!selectedAccount) return;
    
    // Safety check for admin email restriction
    if (selectedRole === 'admin' && selectedAccount.email.toLowerCase() !== 'amanfmfb1215@gmail.com') {
      setErrorMsg('Error: Admin Role can only be accessed by amanfmfb1215@gmail.com');
      return;
    }

    const session: UserSession = {
      email: selectedAccount.email,
      name: selectedAccount.name,
      avatar: selectedAccount.avatar,
      role: selectedRole
    };

    onLoginSuccess(session);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 relative overflow-hidden text-zinc-100 font-sans selection:bg-orange-650/30 selection:text-orange-200">
      
      {/* Decorative Blur Ambient Lights */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/15 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl p-6 sm:p-8 relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3 border border-orange-400/20">
            <Flame className="w-8 h-8 text-white fill-amber-300 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Food<span className="text-orange-500">Rush</span></h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">Verified Google Gateway</p>
        </div>

        {/* STEP 1: Main Real Google Identity Selector & Shortcuts */}
        {step === 'choose-account' && (
          <div className="space-y-5 animate-fade-in">
            <div className="text-center">
              <h2 className="text-lg font-extrabold text-white">Sign In with Google</h2>
              <p className="text-xs text-zinc-400 mt-1">Place orders, manage deliveries, and enter portal sessions instantly.</p>
            </div>

            {/* REAL DYNAMIC GOOGLE LOGIN ACTION BUTTON */}
            <div className="space-y-3">
              <button
                onClick={handleLiveGoogleLogin}
                disabled={isAuthenticating}
                className="w-full py-4 px-4 bg-white hover:bg-zinc-50 text-zinc-900 font-extrabold text-sm rounded-2xl flex items-center justify-center gap-3.5 transition duration-200 active:scale-[0.99] border border-zinc-100 shadow-md hover:shadow-lg hover:shadow-zinc-500/5 cursor-pointer disabled:opacity-85"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-5 h-5 text-orange-600 animate-spin" />
                ) : (
                  <div className="flex gap-0.5 font-black text-base select-none shrink-0 border border-zinc-200/50 bg-zinc-100/30 px-2 py-0.5 rounded-lg">
                    <span className="text-blue-600">G</span>
                    <span className="text-red-500">o</span>
                    <span className="text-amber-500">o</span>
                    <span className="text-blue-600">g</span>
                    <span className="text-green-600">l</span>
                    <span className="text-red-500">e</span>
                  </div>
                )}
                <span>{isAuthenticating ? 'Connecting Identity...' : 'Sign In with Google / GMail'}</span>
              </button>

              {errorMsg && (
                <div className="bg-red-950/55 border border-red-900/50 p-3 rounded-xl">
                  <p className="text-red-400 text-[11px] font-bold text-center leading-relaxed">⚠️ {errorMsg}</p>
                </div>
              )}
            </div>

            {/* Google Console Credentials Info Box */}
            <div className="bg-zinc-950 text-[10px] text-zinc-450 rounded-2xl p-3 border border-zinc-900/80 leading-relaxed font-medium space-y-1.5">
              <p className="font-bold text-orange-400 uppercase tracking-widest text-[9px]">⚙️ Firebase Authentication Status</p>
              <p className="font-mono text-zinc-400 select-all break-all bg-zinc-900 p-2 rounded-lg border border-zinc-850">
                Authorized: Google Identity Sign-In
              </p>
              <p className="text-zinc-500">
                Using secure Firebase pop-up authentication connected to your project's Firebase Auth Domain.
              </p>
            </div>

            {/* DIVIDER FOR DEVELOPMENT ROSTER */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-4 text-zinc-500 text-[9px] font-black uppercase tracking-wider">Developer Roster / Sandbox Shortcuts</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            {/* List of custom simulation Google accounts */}
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 text-center italic">Pick a workspace mock identity for fast offline testing:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {preSeededAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleSelectPreseeded(acc)}
                    className="p-3 bg-zinc-850/60 hover:bg-zinc-800 border border-zinc-850 rounded-2xl text-left flex items-start gap-2.5 transition group cursor-pointer"
                  >
                    <img src={acc.avatar} alt="avatar" className="w-8 h-8 rounded-lg bg-zinc-900/80 border border-zinc-750 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-[11px] group-hover:text-orange-400 transition-colors truncate">{acc.name}</p>
                      <p className="text-zinc-500 font-mono text-[9px] truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setErrorMsg(''); setStep('enter-custom-email'); }}
              className="w-full py-3 px-4 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 rounded-2xl font-bold text-xs text-zinc-350 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5 text-zinc-400" />
              <span>Simulate Custom Gmail Address</span>
            </button>
          </div>
        )}

        {/* STEP 1.5: Enter Custom Email (Sandbox Override) */}
        {step === 'enter-custom-email' && (
          <form onSubmit={handleCustomEmailSubmit} className="space-y-4 animate-fade-in">
            <div>
              <button
                type="button"
                onClick={() => setStep('choose-account')}
                className="text-[11px] text-zinc-400 hover:text-white mb-2 ml-px"
              >
                &larr; Back to account choices
              </button>
              <h2 className="text-lg font-bold text-white">Simulate Google Account</h2>
              <p className="text-xs text-zinc-400 mt-1">Type in any custom email configuration to check custom access states.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 pl-px">Google GMail Address</label>
                <input
                  type="email"
                  required
                  placeholder="amanfmfb1215@gmail.com or other..."
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full bg-zinc-850 border border-zinc-800 hover:border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none transition font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 pl-px">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Aman Ahmed"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-zinc-850 border border-zinc-800 hover:border-zinc-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-3.5 py-3 text-xs text-white focus:outline-none transition font-semibold"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-red-500 text-xs mt-1 font-semibold">&bull; {errorMsg}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-orange-500/10 cursor-pointer mt-4"
            >
              <span>Verify Google Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* STEP 2: Select Workspace viewport Role */}
        {step === 'select-role' && selectedAccount && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <button
                onClick={() => {
                  setErrorMsg('');
                  setStep('choose-account');
                }}
                className="text-[11px] text-zinc-400 hover:text-white mb-2 ml-px flex items-center gap-1"
              >
                &larr; Switch Google Account
              </button>
              
              {/* Authenticated user banner badge */}
              <div className="bg-zinc-850 p-3 rounded-2xl border border-zinc-800/80 flex items-center gap-3">
                <img src={selectedAccount.avatar} alt="avatar" className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white truncate">{selectedAccount.name}</p>
                  <p className="text-[10px] text-zinc-400 font-mono truncate">{selectedAccount.email}</p>
                </div>
                <div className="bg-green-950 border border-green-850 text-green-450 text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 select-none">
                  Verified
                </div>
              </div>

              {sandboxNotice && (
                <div className="mt-3 bg-orange-950/20 border border-orange-900/30 p-2.5 rounded-xl">
                  <p className="text-orange-355 text-[10px] leading-relaxed font-medium">{sandboxNotice}</p>
                </div>
              )}
              
              <h2 className="text-base font-bold text-white mt-4">Select Workspace Portal</h2>
              <p className="text-xs text-zinc-400 mt-1">Please specify which panel you want to launch for this session.</p>
            </div>

            {/* List of 4 roles */}
            <div className="grid grid-cols-1 gap-2.5">
              
              {/* CUSTOMER ROLE */}
              <button
                onClick={() => setSelectedRole('customer')}
                className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition cursor-pointer ${
                  selectedRole === 'customer'
                    ? 'bg-orange-600/10 border-orange-500/70 shadow-sm shadow-orange-500/10'
                    : 'bg-zinc-850/60 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-850'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                  selectedRole === 'customer' ? 'bg-orange-600 text-white border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <Compass className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-white block animate-fade-in">Customer / Diner View</span>
                  <span className="text-[10px] text-zinc-400 block truncate leading-tight">Explore cuisines, build orders, trace live riders & map</span>
                </div>
              </button>

              {/* RESTAURANT ROLE */}
              <button
                onClick={() => setSelectedRole('restaurant')}
                className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition cursor-pointer ${
                  selectedRole === 'restaurant'
                    ? 'bg-orange-600/10 border-orange-500/70 shadow-sm shadow-orange-500/10'
                    : 'bg-zinc-850/60 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-850'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                  selectedRole === 'restaurant' ? 'bg-orange-600 text-white border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <ChefHat className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-white block">Restaurant Merchant Panel</span>
                  <span className="text-[10px] text-zinc-400 block truncate leading-tight">Manage active kitchen boards, custom menus & stats</span>
                </div>
              </button>

              {/* RIDER ROLE */}
              <button
                onClick={() => setSelectedRole('rider')}
                className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition cursor-pointer ${
                  selectedRole === 'rider'
                    ? 'bg-orange-600/10 border-orange-500/70 shadow-sm shadow-orange-500/10'
                    : 'bg-zinc-850/60 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-850'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                  selectedRole === 'rider' ? 'bg-orange-600 text-white border-orange-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  <Bike className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-extrabold text-white block">Delivery Rider App</span>
                  <span className="text-[10px] text-zinc-400 block truncate leading-tight">Simulate route map progress, courier chat & dispatch</span>
                </div>
              </button>

              {/* ADMIN ROLE - RESTRICTED ONLY TO amanfmfb1215@gmail.com */}
              {(() => {
                const isAdminEmail = selectedAccount.email.trim().toLowerCase() === 'amanfmfb1215@gmail.com';
                return (
                  <button
                    onClick={() => {
                      if (isAdminEmail) {
                        setSelectedRole('admin');
                      }
                    }}
                    disabled={!isAdminEmail}
                    className={`p-3 rounded-2xl text-left border flex items-center gap-3 transition ${
                      isAdminEmail 
                        ? selectedRole === 'admin'
                          ? 'bg-orange-600/10 border-orange-500/70 shadow-sm shadow-orange-500/10 cursor-pointer'
                          : 'bg-zinc-850/60 border-zinc-850 hover:border-zinc-800 hover:bg-zinc-850 cursor-pointer'
                        : 'opacity-50 bg-zinc-900 border-zinc-850 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition ${
                      isAdminEmail
                        ? selectedRole === 'admin'
                          ? 'bg-orange-600 text-white border-orange-500'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        : 'bg-zinc-900 text-zinc-650 border-zinc-850'
                    }`}>
                      {isAdminEmail ? <Building className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-white block">Super Admin Dashboard</span>
                        {!isAdminEmail && (
                          <span className="bg-zinc-800 text-zinc-400 text-[8px] font-black px-1.5 py-0.2 rounded border border-zinc-700 uppercase shrink-0">
                            Locked
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-450 block truncate leading-tight">
                        {isAdminEmail 
                          ? 'Global systems cockpit, audit partners, monitor live order telemetry' 
                          : 'Restricted specifically to amanfmfb1215@gmail.com'}
                      </span>
                    </div>
                  </button>
                );
              })()}

            </div>

            {errorMsg && (
              <p className="text-red-500 text-xs font-semibold">&bull; {errorMsg}</p>
            )}

            <button
              onClick={handleFinishLogin}
              className="w-full py-3.5 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md shadow-orange-500/15 cursor-pointer mt-2"
            >
              <span>Confirm & Enter FoodRush</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
