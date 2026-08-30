import React, { useState } from 'react';
import { AuthApi, setAuthToken } from '../services/api';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login', showNotification }) {
    const [mode, setMode] = useState(initialMode); // 'login' or 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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
                        {mode === 'login' ? 'Sign In to AnimeStop' : 'Create Your Account'}
                    </h2>
                    <p className="text-xs text-[#99907c]">
                        {mode === 'login'
                            ? 'Access your private Watchlist, resume watch progress, and stream across devices.'
                            : 'Join AnimeStop to sync your anime library, track episode history, and bookmark series.'}
                    </p>
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

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2.5 text-xs text-red-300">
                        <span className="material-symbols-outlined text-base">error</span>
                        <span>{error}</span>
                    </div>
                )}

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
        </div>
    );
}
