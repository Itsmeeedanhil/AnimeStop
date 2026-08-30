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

// Local storage backup helpers
const getLocalLibrary = () => {
  if (typeof window === 'undefined') return { watchlist: [], continueWatching: [], history: [] };
  try {
    const raw = localStorage.getItem('animestop_local_library');
    return raw ? JSON.parse(raw) : { watchlist: [], continueWatching: [], history: [] };
  } catch (e) {
    return { watchlist: [], continueWatching: [], history: [] };
  }
};

const saveLocalLibrary = (data) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('animestop_local_library', JSON.stringify(data));
  } catch (e) {}
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
  }
};

const api = axios.create({
  baseURL: '/api',
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
    try {
      const res = await api.get('/library');
      const data = res.data.data;
      if (data && Array.isArray(data.watchlist)) {
        saveLocalLibrary(data);
        return data;
      }
      return getLocalLibrary();
    } catch (err) {
      console.warn('Backend library offline, using local persistent vault:', err);
      return getLocalLibrary();
    }
  },

  toggleWatchlist: async (anime) => {
    const animeId = parseInt(anime.id || anime.anime_id, 10);
    const title = anime.title?.english || anime.title?.romaji || anime.title || anime.anime_title || 'Anime';
    const imageUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image_url || anime.anime_image;
    const bannerUrl = anime.bannerImage || anime.banner_url || anime.anime_banner;

    // Update local library cache immediately
    const local = getLocalLibrary();
    const existingIdx = local.watchlist.findIndex(w => w.anime_id === animeId);
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

    // Sync with backend API in background
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
    const local = getLocalLibrary();

    const existingIdx = local.history.findIndex(h => h.anime_id === animeId && h.episode_number === data.episode_number);
    const historyItem = {
      id: Date.now(),
      anime_id: animeId,
      anime_title: data.anime_title,
      anime_image: data.anime_image || data.image_url,
      anime_banner: data.anime_banner || data.banner_url,
      episode_number: data.episode_number,
      episode_title: data.episode_title || `Episode ${data.episode_number}`,
      progress_seconds: data.progress_seconds,
      duration_seconds: data.duration_seconds,
      completed: data.completed || false,
      last_watched_at: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      local.history[existingIdx] = historyItem;
    } else {
      local.history.unshift(historyItem);
    }

    local.continueWatching = local.history.filter(h => !h.completed);
    saveLocalLibrary(local);

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

    try {
      await api.post('/library/history/clear');
    } catch (e) {}
    return { success: true };
  },
};

export default api;
