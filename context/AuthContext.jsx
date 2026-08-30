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
  }, []);

  // Fetch watchlist to update bookmark state
  const refreshLibrary = async () => {
    try {
      const data = await LibraryApi.getLibrary();
      if (data?.watchlist && Array.isArray(data.watchlist)) {
        const ids = new Set(data.watchlist.map(item => Number(item.anime_id || item.id)));
        setWatchlistIds(ids);
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
  };

  const logout = async () => {
    try {
      await AuthApi.logout();
    } catch (e) {}
    setAuthToken(null);
    setUser(null);
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
    const animeId = Number(anime.id || anime.anime_id);
    // Optimistically update UI
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
