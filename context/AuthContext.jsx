'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthApi, LibraryApi, getAuthToken, setAuthToken } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signin');
  const [watchlistIds, setWatchlistIds] = useState(new Set());

  // Load user profile and initial library
  useEffect(() => {
    const initAuth = async () => {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await AuthApi.getMe();
          setUser(profile);
        } catch (err) {
          console.error('Failed to restore user session:', err);
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleAuthEvent = () => {
      initAuth();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('animestop_auth_updated', handleAuthEvent);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('animestop_auth_updated', handleAuthEvent);
      }
    };
  }, []);

  // Fetch watchlist to update bookmark state
  const refreshLibrary = async () => {
    try {
      const data = await LibraryApi.getLibrary();
      if (data?.watchlist && Array.isArray(data.watchlist)) {
        const ids = new Set(data.watchlist.map(item => Number(item.anime_id || item.id)));
        setWatchlistIds(ids);
      } else {
        setWatchlistIds(new Set());
      }
    } catch (err) {
      console.error('Failed to load library:', err);
    }
  };

  useEffect(() => {
    refreshLibrary();
  }, [user]);

  const login = (token, userData) => {
    setAuthToken(token);
    setUser(userData);
    setIsAuthModalOpen(false);
    refreshLibrary();
    if (typeof window !== 'undefined') {
      if (userData?.role !== 'admin' && userData?.email !== 'admin@animestop.com') {
        localStorage.removeItem('animestop_admin_key');
      }
      window.dispatchEvent(new Event('animestop_library_updated'));
    }
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch (e) {}
    setAuthToken(null);
    setUser(null);
    setWatchlistIds(new Set());
    if (typeof window !== 'undefined') {
      localStorage.removeItem('animestop_admin_key');
      window.dispatchEvent(new Event('animestop_library_updated'));
    }
    refreshLibrary();
  };

  const openAuthModal = (mode = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const isBookmarked = (animeId) => {
    if (!animeId) return false;
    return watchlistIds.has(Number(animeId));
  };

  const toggleBookmark = async (anime) => {
    const animeId = Number(anime.anime_id || anime.id);
    setWatchlistIds(prev => {
      const next = new Set(prev);
      if (next.has(animeId)) {
        next.delete(animeId);
      } else {
        next.add(animeId);
      }
      return next;
    });

    try {
      const res = await LibraryApi.toggleWatchlist(anime);
      await refreshLibrary();
      return res;
    } catch (err) {
      console.error('Toggle watchlist error:', err);
      await refreshLibrary();
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isBookmarked,
        toggleBookmark,
        refreshLibrary,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
