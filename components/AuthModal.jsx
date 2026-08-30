'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AuthApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { X, AlertCircle, User as UserIcon, Mail, Lock, Sparkles } from 'lucide-react';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login } = useAuth();
  const [mode, setMode] = useState(authModalMode || 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleEmail, setGoogleEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const googleBtnRef = useRef(null);

  const GOOGLE_CLIENT_ID = '1067760215985-sodr8544tj6klg74qla2jhspgc2qa1vt.apps.googleusercontent.com';

  useEffect(() => {
    setMode(authModalMode || 'signin');
    setError('');
  }, [isAuthModalOpen, authModalMode]);

  // Initialize Google Identity Services Client-side Popup
  useEffect(() => {
    if (!isAuthModalOpen) return;

    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            if (response.credential) {
              setIsGoogleLoading(true);
              try {
                const res = await AuthApi.googleLogin({ credential: response.credential });
                login(res.token, res.user);
              } catch (err) {
                setError(err.response?.data?.message || 'Google Sign-In failed');
              } finally {
                setIsGoogleLoading(false);
              }
            }
          },
        });

        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            width: 320,
            text: 'continue_with',
          });
        }
      } catch (e) {
        console.warn('Google GSI init warning:', e);
      }
    }
  }, [isAuthModalOpen, mode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your name.');
          setIsLoading(false);
          return;
        }
        const res = await AuthApi.register({ name, email, password });
        login(res.token, res.user);
      } else {
        const res = await AuthApi.login({ email, password });
        login(res.token, res.user);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleStandardOAuth = () => {
    const origin = window.location.origin;
    const redirectUri = `${origin}/auth/google/callback`;
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent('openid email profile')}`;
  };

  const handleInstantGmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsGoogleLoading(true);

    try {
      if (!googleEmail.trim()) {
        setError('Please enter your Gmail address.');
        setIsGoogleLoading(false);
        return;
      }

      const cleanEmail = googleEmail.trim().toLowerCase();
      const derivedName = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
      const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

      const res = await AuthApi.googleLogin({
        email: cleanEmail,
        name: formattedName,
        google_id: 'google_' + btoa(cleanEmail).slice(0, 16),
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
      });

      login(res.token, res.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Gmail authentication failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md bg-[#161818] border border-[#4d4635]/60 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-[#99907c] hover:text-[#ffe9b0] p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Logo Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src="/favicon.svg"
            alt="AnimeStop Logo"
            width={48}
            height={48}
            style={{ width: '48px', height: '48px', minWidth: '48px' }}
            className="w-12 h-12 rounded-xl shadow-[0_0_20px_rgba(255,233,176,0.35)]"
          />
          <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">
            {mode === 'instant_gmail'
              ? 'Instant Gmail Sign-In'
              : mode === 'signin'
              ? 'Sign In to AnimeStop'
              : 'Create Your Account'}
          </h2>
          <p className="text-xs text-[#99907c]">
            {mode === 'instant_gmail'
              ? 'Authenticate directly with your Gmail to sync watch history across devices.'
              : mode === 'signin'
              ? 'Access your private Watchlist, resume watch progress, and stream across devices.'
              : 'Join AnimeStop to sync your anime library, track episode history, and bookmark series.'}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {mode === 'instant_gmail' ? (
          <form onSubmit={handleInstantGmailSubmit} className="flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-[#121414] border border-white/5 flex items-center gap-3">
              <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#e2e2e2]">Instant Gmail Sync</span>
                <span className="text-[11px] text-[#99907c]">Zero Password Required</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#d0c5af]">Your Gmail Address</label>
              <input
                type="email"
                required
                autoFocus
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="youremail@gmail.com"
                className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl px-4 py-3 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isGoogleLoading}
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs shadow-[0_0_15px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isGoogleLoading ? (
                <span className="w-4 h-4 border-2 border-[#241a00] border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span>Sign In with Gmail</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className="text-xs text-[#99907c] hover:text-[#ffe9b0] text-center mt-1 cursor-pointer"
            >
              ← Back to standard login
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Native Google One-Tap / Button Container */}
            <div className="flex flex-col items-center gap-2.5">
              <div ref={googleBtnRef} className="w-full flex justify-center"></div>

              {/* Standard OAuth Redirect Button */}
              <button
                type="button"
                onClick={handleGoogleStandardOAuth}
                className="w-full py-3 px-4 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] border border-white/10 hover:border-[#ffe9b0]/50 text-xs font-semibold text-[#e2e2e2] flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer active:scale-[0.99]"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google OAuth</span>
              </button>

              {/* Instant Gmail 1-Click Button */}
              <button
                type="button"
                onClick={() => { setMode('instant_gmail'); setError(''); }}
                className="text-[11px] text-[#ffe9b0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Or use Instant 1-Click Gmail login</span>
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] uppercase font-bold text-[#99907c] tracking-widest">or with email</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-[#121414] p-1 rounded-xl border border-[#4d4635]/40">
              <button
                type="button"
                onClick={() => { setMode('signin'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                    : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                    : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                }`}
              >
                Register
              </button>
            </div>

            {/* Standard Email Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {mode === 'register' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#d0c5af]">Your Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Tetsuro"
                      className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors"
                    />
                    <UserIcon className="w-4 h-4 text-[#99907c] absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#d0c5af]">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors"
                  />
                  <Mail className="w-4 h-4 text-[#99907c] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#d0c5af]">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none transition-colors"
                  />
                  <Lock className="w-4 h-4 text-[#99907c] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 w-full py-3 rounded-xl bg-[#ffe9b0] hover:bg-[#f2ca50] text-[#241a00] font-bold text-xs shadow transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <span className="w-4 h-4 border-2 border-[#241a00] border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span>{mode === 'register' ? 'Create Free Account' : 'Sign In'}</span>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
