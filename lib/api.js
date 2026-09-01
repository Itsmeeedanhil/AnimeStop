import axios from 'axios';

// Get or generate a persistent guest session ID
export const getSessionId = () => {
  if (typeof window === 'undefined') return 'server_session';
  let sessionId = localStorage.getItem('animestop_session_id');
  if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
    localStorage.setItem('animestop_session_id', sessionId);
  }
  return sessionId;
};

// Get auth token from localStorage
export const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('animestop_auth_token');
};

export const setAuthToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('animestop_auth_token', token);
  } else {
    localStorage.removeItem('animestop_auth_token');
    localStorage.removeItem('animestop_cached_user');
  }
};

// Determine active storage scope: "user_<id>" or "guest_<session_id>"
export const getStorageScope = () => {
  if (typeof window === 'undefined') return 'guest_server';
  const token = getAuthToken();
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload?.id || payload?.email) {
          return `user_${payload.id || payload.email}`;
        }
      }
    } catch (e) {}
  }
  return `guest_${getSessionId()}`;
};

// User-scoped Local storage backup helpers
export const getLocalLibrary = () => {
  if (typeof window === 'undefined') return { watchlist: [], continueWatching: [], history: [] };
  const scope = getStorageScope();
  try {
    const raw = localStorage.getItem(`animestop_lib_${scope}`);
    if (!raw) return { watchlist: [], continueWatching: [], history: [] };
    const parsed = JSON.parse(raw);
    return {
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
      continueWatching: Array.isArray(parsed.continueWatching) ? parsed.continueWatching : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (e) {
    return { watchlist: [], continueWatching: [], history: [] };
  }
};

export const getLastWatchedEpisode = (animeId) => {
  if (typeof window === 'undefined' || !animeId) return 1;
  const targetId = Number(animeId);
  try {
    const local = getLocalLibrary();
    // 1. Look in continueWatching first
    const active = local.continueWatching?.find(c => Number(c.anime_id) === targetId);
    if (active?.episode_number) return Number(active.episode_number);

    // 2. Look in history
    const hist = local.history?.find(h => Number(h.anime_id) === targetId);
    if (hist?.episode_number) return Number(hist.episode_number);
  } catch (e) {}
  return 1;
};

export const saveLocalLibrary = (data) => {
  if (typeof window === 'undefined') return;
  const scope = getStorageScope();
  try {
    localStorage.setItem(`animestop_lib_${scope}`, JSON.stringify({
      watchlist: Array.isArray(data.watchlist) ? data.watchlist : [],
      continueWatching: Array.isArray(data.continueWatching) ? data.continueWatching : [],
      history: Array.isArray(data.history) ? data.history : [],
    }));
  } catch (e) {}
};

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    const isDesktop = Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);
    const isTauriProtocol = window.location.protocol === 'tauri:' || window.location.protocol === 'asset:' || window.location.origin === 'http://tauri.localhost';
    if (isDesktop || isTauriProtocol) {
      return 'https://anime-stop.vercel.app/api';
    }
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach Session-ID and Bearer Token dynamically
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    config.headers['X-Session-ID'] = getSessionId();
    const token = getAuthToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

export const AuthApi = {
  register: (data) => api.post('/auth/register', data).then(res => res.data),
  login: (credentials) => api.post('/auth/login', credentials).then(res => res.data),
  googleLogin: (data) => api.post('/auth/google', data).then(res => res.data),
  logout: () => api.post('/auth/logout').then(res => res.data),
  getMe: () => api.get('/auth/me').then(res => res.data.user),
};

export const AnimeApi = {
  getHome: () => api.get('/anime/home').then(res => res.data.data),
  getDetails: (id) => api.get(`/anime/details/${id}`).then(res => res.data.data),
  getStream: (id, ep = 1) => api.get(`/anime/stream/${id}/${ep}`).then(res => res.data.data),
  search: (params) => api.get('/anime/search', { params }).then(res => res.data.data),
  getGenres: () => api.get('/anime/genres').then(res => res.data.data),
};

export const LibraryApi = {
  getLibrary: async () => {
    const local = getLocalLibrary();
    try {
      const res = await api.get('/library');
      const data = res.data?.data;
      if (data && Array.isArray(data.watchlist)) {
        const token = getAuthToken();
        // If user is logged in, use cloud database data as single source of truth
        if (token) {
          const cloudMerged = {
            watchlist: data.watchlist || [],
            continueWatching: data.continueWatching || [],
            history: data.history || [],
            user: data.user,
          };
          saveLocalLibrary(cloudMerged);
          return cloudMerged;
        }

        // Guest session merge
        const mergedWatchlist = [...data.watchlist];
        local.watchlist.forEach((lw) => {
          if (!mergedWatchlist.some((w) => Number(w.anime_id) === Number(lw.anime_id))) {
            mergedWatchlist.push(lw);
          }
        });

        const mergedHistory = [...(data.history || [])];
        local.history.forEach((lh) => {
          if (
            !mergedHistory.some(
              (h) =>
                Number(h.anime_id) === Number(lh.anime_id) &&
                Number(h.episode_number) === Number(lh.episode_number)
            )
          ) {
            mergedHistory.push(lh);
          }
        });

        const mergedContinue = mergedHistory.filter((h) => !h.completed);
        const merged = {
          watchlist: mergedWatchlist,
          continueWatching: mergedContinue,
          history: mergedHistory,
          user: data.user,
        };
        saveLocalLibrary(merged);
        return merged;
      }
      return local;
    } catch (err) {
      return local;
    }
  },

  toggleWatchlist: async (anime) => {
    const animeId = parseInt(anime.anime_id || anime.id, 10);
    const title = anime.title?.english || anime.title?.romaji || (typeof anime.title === 'string' ? anime.title : null) || anime.anime_title || 'Anime';
    const imageUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image_url || anime.anime_image;
    const bannerUrl = anime.bannerImage || anime.banner_url || anime.anime_banner;

    // 1. Immediately update scoped localStorage
    const local = getLocalLibrary();
    const existingIdx = local.watchlist.findIndex(w => Number(w.anime_id) === animeId);
    let isBookmarked = false;

    if (existingIdx >= 0) {
      local.watchlist.splice(existingIdx, 1);
      isBookmarked = false;
    } else {
      local.watchlist.unshift({
        id: Date.now(),
        anime_id: animeId,
        title,
        image_url: imageUrl,
        banner_url: bannerUrl,
        genres: anime.genres || [],
        format: anime.format || 'TV',
        episodes_count: anime.episodes || anime.episodes_count || 12,
        score: anime.averageScore ? anime.averageScore / 10 : (anime.score || 8.5),
        created_at: new Date().toISOString(),
      });
      isBookmarked = true;
    }
    saveLocalLibrary(local);

    // 2. Dispatch custom window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('animestop_library_updated'));
    }

    // 3. Sync with backend API
    try {
      const res = await api.post('/library/watchlist/toggle', {
        anime_id: animeId,
        title,
        image_url: imageUrl,
        banner_url: bannerUrl,
        genres: anime.genres || [],
        format: anime.format,
        episodes_count: anime.episodes || anime.episodes_count,
        score: anime.averageScore ? anime.averageScore / 10 : (anime.score || null),
      });
      return res.data;
    } catch (err) {
      return { success: true, isBookmarked, message: isBookmarked ? 'Saved to Watchlist' : 'Removed from Watchlist' };
    }
  },

  saveProgress: async (data) => {
    const animeId = parseInt(data.anime_id, 10);
    const epNumber = parseInt(data.episode_number || 1, 10);
    const local = getLocalLibrary();

    const existingIdx = local.history.findIndex(h => Number(h.anime_id) === animeId && Number(h.episode_number) === epNumber);
    const historyItem = {
      id: Date.now(),
      anime_id: animeId,
      anime_title: data.anime_title,
      anime_image: data.anime_image || data.image_url,
      anime_banner: data.anime_banner || data.banner_url,
      episode_number: epNumber,
      episode_title: data.episode_title || `Episode ${epNumber}`,
      progress_seconds: data.progress_seconds || 15,
      duration_seconds: data.duration_seconds || 1440,
      completed: Boolean(data.completed),
      last_watched_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      local.history[existingIdx] = historyItem;
    } else {
      local.history.unshift(historyItem);
    }

    local.continueWatching = local.history.filter(h => !h.completed);
    saveLocalLibrary(local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('animestop_library_updated'));
    }

    try {
      const res = await api.post('/library/progress', data);
      return res.data.data;
    } catch (err) {
      return historyItem;
    }
  },

  deleteHistory: async (id) => {
    const local = getLocalLibrary();
    local.history = local.history.filter(h => h.id !== id && h.anime_id !== id);
    local.continueWatching = local.history.filter(h => !h.completed);
    saveLocalLibrary(local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('animestop_library_updated'));
    }

    try {
      await api.delete(`/library/history/${id}`);
    } catch (e) {}
    return { success: true };
  },

  clearHistory: async () => {
    const local = getLocalLibrary();
    local.history = [];
    local.continueWatching = [];
    saveLocalLibrary(local);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('animestop_library_updated'));
    }

    try {
      await api.post('/library/history/clear');
    } catch (e) {}
    return { success: true };
  },
};

export default api;
