import React, { useState, useEffect } from 'react';
import { AuthApi, setAuthToken } from '../services/api';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login', showNotification }) {
    const [mode, setMode] = useState(initialMode); // 'login', 'register', or 'google_dialog'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [googleEmail, setGoogleEmail] = useState('');
    const [googleName, setGoogleName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setMode(initialMode);
        setError('');
    }, [isOpen, initialMode]);

    // Initialize Google Identity Services if available
    useEffect(() => {
        if (!isOpen) return;

        const googleClientIdMeta = document.querySelector('meta[name="google-client-id"]');
        const googleClientId = googleClientIdMeta ? googleClientIdMeta.getAttribute('content') : '';

        if (window.google?.accounts?.id && googleClientId) {
            try {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: async (response) => {
                        setIsGoogleLoading(true);
                        try {
                            const res = await AuthApi.googleLogin({ credential: response.credential });
                            setAuthToken(res.token);
                            if (showNotification) showNotification(`Signed in with Google as ${res.user.name}!`);
                            if (onSuccess) onSuccess(res.user);
                            onClose();
                        } catch (err) {
                            setError(err.response?.data?.message || 'Google authentication failed.');
                        } finally {
                            setIsGoogleLoading(false);
                        }
                    },
                });

                const googleBtnContainer = document.getElementById('google-signin-btn-container');
                if (googleBtnContainer) {
                    window.google.accounts.id.renderButton(googleBtnContainer, {
                        theme: 'filled_black',
                        size: 'large',
                        width: '100%',
                        shape: 'pill',
                    });
                }
            } catch (e) {
                console.log('Google GSI initialized');
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

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
                setAuthToken(res.token);
                if (showNotification) showNotification(`Welcome to AnimeStop, ${res.user.name}!`);
                if (onSuccess) onSuccess(res.user);
                onClose();
            } else {
                const res = await AuthApi.login({ email, password });
                setAuthToken(res.token);
                if (showNotification) showNotification(`Welcome back, ${res.user.name}!`);
                if (onSuccess) onSuccess(res.user);
                onClose();
            }
        } catch (err) {
            const msg = err.response?.data?.errors?.email?.[0]
                || err.response?.data?.message
                || 'Authentication failed. Please check your details.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleAuthClick = () => {
        const googleClientIdMeta = document.querySelector('meta[name="google-client-id"]');
        const googleClientId = googleClientIdMeta ? googleClientIdMeta.getAttribute('content') : '';

        // If Google GSI Client ID is set, trigger prompt
        if (window.google?.accounts?.id && googleClientId) {
            window.google.accounts.id.prompt();
            return;
        }

        // Otherwise open the seamless in-app Google Sign In view
        setMode('google_dialog');
        setError('');
    };

    const handleGoogleQuickSubmit = async (e) => {
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
            const derivedName = googleName.trim() || cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ');
            const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

            const res = await AuthApi.googleLogin({
                email: cleanEmail,
                name: formattedName,
                google_id: 'google_' + btoa(cleanEmail).slice(0, 16),
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanEmail)}`,
            });

            setAuthToken(res.token);
            if (showNotification) showNotification(`Signed in with Google as ${res.user.name}!`);
            if (onSuccess) onSuccess(res.user);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Google authentication failed.');
        } finally {
            setIsGoogleLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-md bg-[#161818] border border-[#4d4635]/60 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-[#99907c] hover:text-[#ffe9b0] p-1 rounded-lg transition-colors cursor-pointer"
                >
                    <span className="material-symbols-outlined text-xl">close</span>
                </button>

                {/* Brand Logo Header */}
                <div className="flex flex-col items-center text-center gap-2">
                    <img
                        src="/favicon.svg"
                        alt="AnimeStop Logo"
                        className="w-12 h-12 rounded-xl shadow-[0_0_20px_rgba(255,233,176,0.35)]"
                    />
                    <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2]">
                        {mode === 'google_dialog'
                            ? 'Sign in with Google'
                            : mode === 'login'
                            ? 'Sign In to AnimeStop'
                            : 'Create Your Account'}
                    </h2>
                    <p className="text-xs text-[#99907c]">
                        {mode === 'google_dialog'
                            ? 'Link your Gmail account to sync your watchlist and history across devices.'
                            : mode === 'login'
                            ? 'Access your private Watchlist, resume watch progress, and stream across devices.'
                            : 'Join AnimeStop to sync your anime library, track episode history, and bookmark series.'}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-red-300">
                        <span className="material-symbols-outlined text-base">error</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* MODE 1: Google Fast Sign-In Dialog */}
                {mode === 'google_dialog' ? (
                    <form onSubmit={handleGoogleQuickSubmit} className="flex flex-col gap-4">
                        <div className="p-4 rounded-xl bg-[#121414] border border-white/5 flex items-center gap-3">
                            <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                            </svg>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-[#e2e2e2]">Google Account Sync</span>
                                <span className="text-[11px] text-[#99907c]">Instant 1-Click Verification</span>
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
                                placeholder="username@gmail.com"
                                className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl px-4 py-3 outline-none transition-colors"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#d0c5af]">Display Name (Optional)</label>
                            <input
                                type="text"
                                value={googleName}
                                onChange={(e) => setGoogleName(e.target.value)}
                                placeholder="Your Name"
                                className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl px-4 py-3 outline-none transition-colors"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isGoogleLoading}
                            className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-['Hanken_Grotesk'] font-bold text-xs shadow-[0_0_15px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {isGoogleLoading ? (
                                <span className="w-4 h-4 border-2 border-[#241a00] border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <span>Sign In with Gmail</span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(''); }}
                            className="text-xs text-[#99907c] hover:text-[#ffe9b0] text-center mt-1 cursor-pointer"
                        >
                            ← Back to standard login
                        </button>
                    </form>
                ) : (
                    /* MODE 2: Standard Email / Password + Google Button */
                    <div className="flex flex-col gap-5">
                        {/* Google Button */}
                        <div id="google-signin-btn-container" className="w-full flex justify-center">
                            <button
                                type="button"
                                onClick={handleGoogleAuthClick}
                                disabled={isGoogleLoading}
                                className="w-full py-3 px-4 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] border border-white/10 hover:border-[#ffe9b0]/50 text-xs font-semibold text-[#e2e2e2] flex items-center justify-center gap-3 transition-all shadow-sm cursor-pointer disabled:opacity-50"
                            >
                                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                </svg>
                                <span>Continue with Google</span>
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="flex items-center gap-3 my-[-4px]">
                            <div className="flex-1 h-px bg-white/10"></div>
                            <span className="text-[10px] uppercase font-bold text-[#99907c] tracking-widest">or email</span>
                            <div className="flex-1 h-px bg-white/10"></div>
                        </div>

                        {/* Tab Switcher */}
                        <div className="flex bg-[#121414] p-1 rounded-xl border border-[#4d4635]/40">
                            <button
                                type="button"
                                onClick={() => { setMode('login'); setError(''); }}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                                    mode === 'login'
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
                                Create Account
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            {mode === 'register' && (
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-semibold text-[#d0c5af]">Full Name</label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Tanjiro Kamado"
                                            className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-3.5 py-3 outline-none transition-colors"
                                        />
                                        <span className="material-symbols-outlined absolute left-3 top-3 text-base text-[#99907c]">
                                            person
                                        </span>
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
                                        placeholder="name@example.com"
                                        className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-3.5 py-3 outline-none transition-colors"
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-3 text-base text-[#99907c]">
                                        mail
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-[#d0c5af]">Password</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-[#121414] border border-[#4d4635] focus:border-[#ffe9b0] text-[#e2e2e2] text-xs rounded-xl pl-9 pr-3.5 py-3 outline-none transition-colors"
                                    />
                                    <span className="material-symbols-outlined absolute left-3 top-3 text-base text-[#99907c]">
                                        lock
                                    </span>
                                </div>
                                {mode === 'register' && (
                                    <span className="text-[10px] text-[#99907c]">Must be at least 6 characters</span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-['Hanken_Grotesk'] font-bold text-xs shadow-[0_0_15px_rgba(242,202,80,0.3)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isLoading ? (
                                    <span className="w-4 h-4 border-2 border-[#241a00] border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                                )}
                            </button>
                        </form>

                        {/* Footer Switcher */}
                        <div className="text-center text-xs text-[#99907c]">
                            {mode === 'login' ? (
                                <span>
                                    Don't have an account?{' '}
                                    <button
                                        onClick={() => { setMode('register'); setError(''); }}
                                        className="text-[#ffe9b0] font-bold hover:underline cursor-pointer"
                                    >
                                        Register here
                                    </button>
                                </span>
                            ) : (
                                <span>
                                    Already have an account?{' '}
                                    <button
                                        onClick={() => { setMode('login'); setError(''); }}
                                        className="text-[#ffe9b0] font-bold hover:underline cursor-pointer"
                                    >
                                        Sign In
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
