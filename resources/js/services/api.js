import axios from 'axios';

// Get or generate a persistent guest session ID
const getSessionId = () => {
    let sessionId = localStorage.getItem('animestop_session_id');
    if (!sessionId) {
        sessionId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
        localStorage.setItem('animestop_session_id', sessionId);
    }
    return sessionId;
};

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-ID': getSessionId(),
    },
});

export const AnimeApi = {
    getHome: () => api.get('/anime/home').then(res => res.data.data),
    getDetails: (id) => api.get(`/anime/details/${id}`).then(res => res.data.data),
    getStream: (id, ep = 1) => api.get(`/anime/stream/${id}/${ep}`).then(res => res.data.data),
    search: (params) => api.get('/anime/search', { params }).then(res => res.data.data),
    getGenres: () => api.get('/anime/genres').then(res => res.data.data),
};

export const LibraryApi = {
    getLibrary: () => api.get('/library').then(res => res.data.data),
    toggleWatchlist: (anime) => api.post('/library/watchlist/toggle', {
        anime_id: anime.id,
        title: anime.title?.english || anime.title?.romaji || anime.title,
        image_url: anime.coverImage?.extraLarge || anime.coverImage?.large || anime.image_url,
        banner_url: anime.bannerImage || anime.banner_url,
        genres: anime.genres || [],
        format: anime.format,
        episodes_count: anime.episodes || anime.episodes_count,
        score: anime.averageScore ? anime.averageScore / 10 : (anime.score || null),
    }).then(res => res.data),
    saveProgress: (data) => api.post('/library/progress', data).then(res => res.data.data),
    deleteHistory: (id) => api.delete(`/library/history/${id}`).then(res => res.data),
    clearHistory: () => api.post('/library/history/clear').then(res => res.data),
};

export default api;

