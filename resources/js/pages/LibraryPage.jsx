import React, { useState, useEffect } from 'react';
import { LibraryApi } from '../services/api';
import AnimeCard from '../components/AnimeCard';

export default function LibraryPage({ navigate, showNotification, user, onOpenAuthModal }) {
    const [activeTab, setActiveTab] = useState('continue'); // 'continue', 'watchlist', 'history'
    const [libraryData, setLibraryData] = useState({ continueWatching: [], watchlist: [], history: [] });
    const [isLoading, setIsLoading] = useState(true);

    const fetchLibrary = async () => {
        setIsLoading(true);
        try {
            const data = await LibraryApi.getLibrary();
            setLibraryData(data);
        } catch (err) {
            console.error('Failed to load library', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLibrary();
    }, [user]);

    const handleWatchlistToggle = async (anime) => {
        try {
            await LibraryApi.toggleWatchlist(anime);
            fetchLibrary();
            if (showNotification) showNotification('Watchlist updated');
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear your watch history?')) return;
        try {
            await LibraryApi.clearHistory();
            fetchLibrary();
            if (showNotification) showNotification('Watch history cleared');
        } catch (err) {
            console.error('Failed to clear history', err);
        }
    };

    const handleDeleteHistoryItem = async (id) => {
        try {
            await LibraryApi.deleteHistory(id);
            fetchLibrary();
            if (showNotification) showNotification('Removed from history');
        } catch (err) {
            console.error('Failed to delete history item', err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
                <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm text-[#d0c5af]">Loading your anime library...</p>
            </div>
        );
    }

    const { continueWatching = [], watchlist = [], history = [] } = libraryData;

    return (
        <div className="w-full max-w-[1920px] mx-auto px-6 md:px-16 py-10 pb-20 flex flex-col gap-8">
            {/* Header Title */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-[#4d4635]/40 pb-6">
                <div>
                    <h1 className="font-['Bodoni_Moda'] text-3xl md:text-5xl font-bold text-[#e2e2e2] flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#ffe9b0] text-4xl">video_library</span>
                        {user ? `${user.name}'s Library` : 'My Library'}
                    </h1>
                    <p className="text-sm text-[#99907c] mt-1">
                        {user
                            ? `Personalized watchlist and watch history synced to ${user.email}.`
                            : 'Manage your continue watching queue, bookmarks, and viewing history.'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 bg-[#1E2020] p-1.5 rounded-xl border border-[#4d4635]/40">
                    <button
                        onClick={() => setActiveTab('continue')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'continue'
                                ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                                : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">play_circle</span>
                        <span>Continue Watching ({continueWatching.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('watchlist')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'watchlist'
                                ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                                : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">bookmark</span>
                        <span>Watchlist ({watchlist.length})</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            activeTab === 'history'
                                ? 'bg-[#ffe9b0] text-[#241a00] shadow'
                                : 'text-[#d0c5af] hover:text-[#ffe9b0]'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">history</span>
                        <span>History ({history.length})</span>
                    </button>
                </div>
            </div>

            {/* Guest Banner Notice */}
            {!user && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#282a2a] via-[#1E2020] to-[#161818] border border-[#ffe9b0]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
                    <div className="flex items-center gap-3.5">
                        <span className="w-10 h-10 rounded-xl bg-[#ffe9b0]/10 text-[#ffe9b0] flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-2xl">cloud_sync</span>
                        </span>
                        <div className="flex flex-col">
                            <h4 className="text-sm font-bold text-[#e2e2e2]">Sync Your Anime Library Everywhere</h4>
                            <p className="text-xs text-[#99907c] mt-0.5">
                                Sign in or register to keep your Watchlist and progress saved permanently across all your devices.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f2ca50] to-[#af8d11] text-[#241a00] font-bold text-xs shadow-[0_0_15px_rgba(242,202,80,0.3)] hover:brightness-110 transition-all flex-shrink-0 cursor-pointer"
                    >
                        Sign In / Register
                    </button>
                </div>
            )}

            {/* Tab 1: Continue Watching Queue */}
            {activeTab === 'continue' && (
                <div className="flex flex-col gap-6">
                    {continueWatching.length === 0 ? (
                        <div className="p-16 rounded-2xl bg-[#1E2020] border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">play_circle</span>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">No Active Anime In Progress</h3>
                                <p className="text-xs text-[#99907c] max-w-sm">
                                    When you start watching an anime series or episode, your progress will automatically appear here.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/')}
                                className="px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50] cursor-pointer"
                            >
                                Browse Trending Anime
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            {continueWatching.map((item) => {
                                const percent = Math.min(100, Math.round((item.progress_seconds / (item.duration_seconds || 1440)) * 100));
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(`/watch/${item.anime_id}/${item.episode_number}`)}
                                        className="group relative rounded-2xl bg-[#1E2020] border border-[#4d4635]/40 hover:border-[#ffe9b0] overflow-hidden transition-all duration-300 shadow-lg cursor-pointer flex flex-col"
                                    >
                                        <div className="relative aspect-video w-full overflow-hidden bg-[#121414]">
                                            <img
                                                src={item.banner_url || item.image_url}
                                                alt={item.anime_title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                            
                                            {/* Play Overlay */}
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="w-12 h-12 rounded-full bg-[#ffe9b0] text-[#241a00] flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined text-2xl font-bold">play_arrow</span>
                                                </span>
                                            </div>

                                            {/* Episode Badge */}
                                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-bold text-[#ffe9b0]">
                                                Ep {item.episode_number}
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#f2ca50] to-[#af8d11]"
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="p-4 flex flex-col gap-1">
                                            <h4 className="font-['Bodoni_Moda'] text-base font-bold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors truncate">
                                                {item.anime_title}
                                            </h4>
                                            <div className="flex justify-between items-center text-xs text-[#99907c]">
                                                <span>{item.episode_title || `Episode ${item.episode_number}`}</span>
                                                <span>{percent}% watched</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Watchlist */}
            {activeTab === 'watchlist' && (
                <div className="flex flex-col gap-6">
                    {watchlist.length === 0 ? (
                        <div className="p-16 rounded-2xl bg-[#1E2020] border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">bookmark_border</span>
                            <div className="flex flex-col gap-1">
                                <h3 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">Your Watchlist is Empty</h3>
                                <p className="text-xs text-[#99907c] max-w-sm">
                                    Bookmark series and movies while browsing so you can easily find and watch them later.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('/search')}
                                className="px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50] cursor-pointer"
                            >
                                Explore Anime Catalog
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                            {watchlist.map((item) => (
                                <AnimeCard
                                    key={item.id}
                                    anime={{
                                        id: item.anime_id,
                                        title: { english: item.title, romaji: item.title },
                                        coverImage: { large: item.image_url, extraLarge: item.image_url },
                                        bannerImage: item.banner_url,
                                        genres: item.genres,
                                        format: item.format,
                                        episodes: item.episodes_count,
                                        averageScore: item.score ? item.score * 10 : null,
                                    }}
                                    isBookmarked={true}
                                    onBookmarkToggle={() => handleWatchlistToggle({ id: item.anime_id, ...item })}
                                    onClick={() => navigate(`/anime/${item.anime_id}`)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: Detailed History */}
            {activeTab === 'history' && (
                <div className="flex flex-col gap-4">
                    {history.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleClearHistory}
                                className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-red-500/20"
                            >
                                <span className="material-symbols-outlined text-base">delete_sweep</span>
                                <span>Clear All History</span>
                            </button>
                        </div>
                    )}

                    {history.length === 0 ? (
                        <div className="p-16 rounded-2xl bg-[#1E2020] border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">history</span>
                            <h3 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">No Viewing History</h3>
                            <p className="text-xs text-[#99907c] max-w-sm">
                                Episodes you have completed or watched will be recorded here chronologically.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#1E2020] border border-white/5 hover:border-[#ffe9b0]/30 transition-all gap-4"
                                >
                                    <div
                                        onClick={() => navigate(`/watch/${item.anime_id}/${item.episode_number}`)}
                                        className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                                    >
                                        <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-[#121414] flex-shrink-0">
                                            <img
                                                src={item.banner_url || item.image_url}
                                                alt={item.anime_title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h4 className="text-sm font-bold text-[#e2e2e2] truncate hover:text-[#ffe9b0]">
                                                {item.anime_title}
                                            </h4>
                                            <span className="text-xs text-[#ffe9b0] mt-0.5">
                                                {item.episode_title || `Episode ${item.episode_number}`}
                                            </span>
                                            <span className="text-[10px] text-[#99907c] mt-0.5">
                                                Watched on {new Date(item.last_watched_at || item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDeleteHistoryItem(item.id)}
                                        className="p-2 rounded-lg text-[#99907c] hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                                        title="Remove from history"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
