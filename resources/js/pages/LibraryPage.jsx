import React, { useState, useEffect } from 'react';
import { LibraryApi } from '../services/api';
import AnimeCard from '../components/AnimeCard';

export default function LibraryPage({ navigate, showNotification }) {
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
    }, []);

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
                        My Library
                    </h1>
                    <p className="text-sm text-[#99907c] mt-1">
                        Manage your continue watching queue, bookmarks, and viewing history.
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

            {/* Tab 1: Continue Watching */}
            {activeTab === 'continue' && (
                <div>
                    {continueWatching.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">movie</span>
                            <h3 className="font-['Bodoni_Moda'] text-xl text-[#e2e2e2]">No anime in progress</h3>
                            <p className="text-xs text-[#99907c] max-w-sm">
                                Start streaming any anime and your progress will automatically appear here!
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-2 px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50]"
                            >
                                Explore Trending Anime
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                            {continueWatching.map((item) => (
                                <div key={item.id} className="flex flex-col">
                                    <AnimeCard
                                        anime={{
                                            id: item.anime_id,
                                            title: item.anime_title,
                                            image_url: item.image_url,
                                            banner_url: item.banner_url,
                                        }}
                                        progress={item}
                                        navigate={navigate}
                                    />
                                    <button
                                        onClick={() => navigate(`/watch/${item.anime_id}/${item.episode_number}`)}
                                        className="mt-2 w-full py-2 bg-[#282a2a] hover:bg-[#ffe9b0] text-[#ffe9b0] hover:text-[#241a00] rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-base">play_arrow</span>
                                        Resume Ep {item.episode_number}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Watchlist */}
            {activeTab === 'watchlist' && (
                <div>
                    {watchlist.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">bookmark_border</span>
                            <h3 className="font-['Bodoni_Moda'] text-xl text-[#e2e2e2]">Your Watchlist is Empty</h3>
                            <p className="text-xs text-[#99907c] max-w-sm">
                                Save anime you want to watch later by clicking the bookmark button on any title.
                            </p>
                            <button
                                onClick={() => navigate('/')}
                                className="mt-2 px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50]"
                            >
                                Browse Anime
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
                            {watchlist.map((item) => (
                                <AnimeCard
                                    key={item.id}
                                    anime={{
                                        id: item.anime_id,
                                        title: item.title,
                                        image_url: item.image_url,
                                        banner_url: item.banner_url,
                                        genres: item.genres,
                                        score: item.score,
                                        format: item.format,
                                        episodes: item.episodes_count,
                                    }}
                                    navigate={navigate}
                                    onWatchlistToggle={handleWatchlistToggle}
                                    isBookmarked={true}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 3: History */}
            {activeTab === 'history' && (
                <div className="flex flex-col gap-4">
                    {history.length > 0 && (
                        <div className="flex justify-end">
                            <button
                                onClick={handleClearHistory}
                                className="text-xs text-[#ffb4ab] hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Clear All History
                            </button>
                        </div>
                    )}

                    {history.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center gap-3">
                            <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/40">history</span>
                            <h3 className="font-['Bodoni_Moda'] text-xl text-[#e2e2e2]">No Viewing History</h3>
                            <p className="text-xs text-[#99907c]">Your watched episodes will be tracked here.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#1E2020] border border-[#4d4635]/30 hover:border-[#ffe9b0]/40 transition-colors"
                                >
                                    <div
                                        onClick={() => navigate(`/watch/${item.anime_id}/${item.episode_number}`)}
                                        className="flex items-center gap-4 cursor-pointer flex-grow min-w-0"
                                    >
                                        <img
                                            src={item.image_url || item.banner_url}
                                            alt={item.anime_title}
                                            className="w-16 h-20 object-cover rounded-lg bg-[#121414] flex-shrink-0"
                                        />
                                        <div className="min-w-0">
                                            <h4 className="font-semibold text-sm text-[#e2e2e2] truncate hover:text-[#ffe9b0]">
                                                {item.anime_title}
                                            </h4>
                                            <p className="text-xs text-[#ffe9b0] font-medium mt-0.5">
                                                Episode {item.episode_number} {item.completed ? '• Completed' : ''}
                                            </p>
                                            <p className="text-[11px] text-[#99907c] mt-1">
                                                Watched on {new Date(item.last_watched_at || item.updated_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => navigate(`/watch/${item.anime_id}/${item.episode_number}`)}
                                            className="px-4 py-2 bg-[#ffe9b0] text-[#241a00] rounded-lg text-xs font-bold hover:bg-[#f2ca50] transition-colors"
                                        >
                                            Play
                                        </button>
                                        <button
                                            onClick={() => handleDeleteHistoryItem(item.id)}
                                            className="p-2 text-[#99907c] hover:text-[#ffb4ab] transition-colors"
                                            title="Remove from history"
                                        >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

