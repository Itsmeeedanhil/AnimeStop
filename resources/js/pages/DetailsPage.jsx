import React, { useState, useEffect } from 'react';
import { AnimeApi, LibraryApi } from '../services/api';
import AnimeCard from '../components/AnimeCard';

export default function DetailsPage({ id, navigate, showNotification }) {
    const [anime, setAnime] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [isTrailerModalOpen, setIsTrailerModalOpen] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('detail'); // 'detail' or 'grid'

    useEffect(() => {
        const fetchAnime = async () => {
            setIsLoading(true);
            try {
                const data = await AnimeApi.getDetails(id);
                setAnime(data);

                // Check watchlist status
                const lib = await LibraryApi.getLibrary();
                const exists = (lib.watchlist || []).some(w => w.anime_id === Number(id));
                setIsBookmarked(exists);
            } catch (err) {
                console.error('Failed to load anime details', err);
            } finally {
                setIsLoading(false);
            }
        };

        if (id) fetchAnime();
    }, [id]);

    const handleWatchlistToggle = async () => {
        if (!anime) return;
        try {
            const res = await LibraryApi.toggleWatchlist(anime);
            setIsBookmarked(res.isBookmarked);
            if (showNotification) {
                showNotification(res.isBookmarked ? 'Added to your Watchlist' : 'Removed from Watchlist');
            }
        } catch (err) {
            console.error('Failed to toggle watchlist', err);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4 text-[#ffe9b0]">
                <span className="w-12 h-12 border-3 border-[#ffe9b0] border-t-transparent rounded-full animate-spin"></span>
                <p className="text-sm text-[#d0c5af]">Fetching anime details...</p>
            </div>
        );
    }

    if (!anime) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
                <span className="material-symbols-outlined text-5xl text-[#ffe9b0]/50">error</span>
                <h2 className="font-['Bodoni_Moda'] text-2xl text-[#e2e2e2]">Anime Not Found</h2>
                <p className="text-sm text-[#99907c]">The anime you are looking for does not exist or could not be loaded.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-6 py-2.5 rounded-lg bg-[#ffe9b0] text-[#241a00] font-semibold text-sm hover:bg-[#f2ca50]"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    const title = anime.title?.english || anime.title?.romaji;
    const banner = anime.bannerImage || anime.coverImage?.extraLarge;
    const score = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : '8.5';
    const totalEpisodes = anime.episodes || 0;
    const isUnreleased = anime.status === 'NOT_YET_RELEASED' || totalEpisodes === 0;
    const trailer = anime.trailer;

    // Episode list setup
    const batchSize = 25;
    const displayEpisodes = totalEpisodes > 0 ? totalEpisodes : (isUnreleased ? 0 : 24);
    const totalBatches = Math.max(1, Math.ceil(displayEpisodes / batchSize));

    // Full array of episode numbers
    const allEpisodes = Array.from({ length: displayEpisodes }, (_, i) => i + 1);

    // Filter by search or batch
    const episodesToDisplay = searchQuery.trim()
        ? allEpisodes.filter(ep => ep.toString().includes(searchQuery.trim()))
        : allEpisodes.slice(selectedBatch * batchSize, (selectedBatch + 1) * batchSize);

    return (
        <div className="w-full flex flex-col pb-20">
            {/* Hero Banner Section */}
            <section className="relative h-[70vh] min-h-[500px] max-h-[680px] w-full mt-14 md:mt-0">
                <div className="absolute inset-0 w-full h-full">
                    <div
                        className="w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${banner})` }}
                    ></div>
                    <div className="absolute inset-0 scrim-gradient"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#121414] via-[#121414]/70 to-transparent"></div>
                </div>

                {/* Content Overlay */}
                <div className="relative h-full px-6 md:px-16 flex flex-col justify-end pb-12 z-10 max-w-4xl">
                    {/* Badges & Meta */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {anime.genres?.slice(0, 3).map((g) => (
                            <span
                                key={g}
                                className="px-2.5 py-1 bg-[#1E2020]/70 backdrop-blur-md rounded border border-[#4d4635] text-[11px] font-bold text-[#ffe9b0] uppercase tracking-wider"
                            >
                                {g}
                            </span>
                        ))}
                        <span className="text-xs text-[#d0c5af] ml-2">
                            {anime.seasonYear || '2024'} • {anime.format || 'TV'} • {isUnreleased ? 'Upcoming / Unreleased' : anime.status} • ★ {score}
                        </span>
                    </div>

                    {/* Title */}
                    <h1 className="font-['Bodoni_Moda'] text-3xl md:text-5xl lg:text-6xl font-bold text-[#e2e2e2] mb-2 leading-tight">
                        {title}
                    </h1>
                    {anime.title?.romaji && anime.title?.romaji !== title && (
                        <p className="text-sm font-['Hanken_Grotesk'] text-[#99907c] italic mb-4">
                            {anime.title.romaji}
                        </p>
                    )}

                    {/* Synopsis */}
                    <p className="font-['Hanken_Grotesk'] text-sm md:text-base text-[#d0c5af] mb-6 max-w-2xl leading-relaxed line-clamp-3 md:line-clamp-4">
                        {anime.description || 'No description available.'}
                    </p>

                    {/* Buttons */}
                    <div className="flex flex-wrap gap-3 items-center">
                        {!isUnreleased ? (
                            <button
                                onClick={() => navigate(`/watch/${anime.id}/1`)}
                                className="px-8 py-3.5 bg-[#ffe9b0] text-[#241a00] font-['Hanken_Grotesk'] text-sm md:text-base font-bold rounded-xl hover:bg-[#f2ca50] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,233,176,0.4)] cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    play_arrow
                                </span>
                                Stream Episode 1
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate(`/watch/${anime.id}/1`)}
                                className="px-8 py-3.5 bg-[#ffe9b0] text-[#241a00] font-['Hanken_Grotesk'] text-sm md:text-base font-bold rounded-xl hover:bg-[#f2ca50] transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,233,176,0.4)] cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    smart_display
                                </span>
                                Watch Official PV Trailer
                            </button>
                        )}

                        <button
                            onClick={handleWatchlistToggle}
                            className={`px-6 py-3.5 border rounded-xl font-['Hanken_Grotesk'] text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                                isBookmarked
                                    ? 'bg-[#ffe9b0]/20 border-[#ffe9b0] text-[#ffe9b0]'
                                    : 'bg-[#1E2020]/70 border-white/20 text-[#e2e2e2] hover:bg-[#1E2020] hover:border-[#ffe9b0]/50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}>
                                {isBookmarked ? 'bookmark_added' : 'bookmark_add'}
                            </span>
                            {isBookmarked ? 'In Watchlist' : 'Add to List'}
                        </button>

                        {trailer?.id && (
                            <button
                                onClick={() => setIsTrailerModalOpen(true)}
                                className="px-5 py-3.5 border border-white/20 bg-[#121414]/60 text-[#e2e2e2] hover:text-[#ffe9b0] hover:bg-[#121414] font-['Hanken_Grotesk'] text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <span className="material-symbols-outlined text-xl">play_circle</span>
                                Trailer Preview
                            </button>
                        )}
                    </div>
                </div>
            </section>

            {/* Trailer Modal */}
            {isTrailerModalOpen && trailer?.id && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden border border-[#ffe9b0]/30 shadow-2xl">
                        <button
                            onClick={() => setIsTrailerModalOpen(false)}
                            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-[#121414]/80 text-white hover:text-[#ffe9b0] flex items-center justify-center cursor-pointer"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                        <iframe
                            src={`https://www.youtube.com/embed/${trailer.id}?autoplay=1`}
                            title="Anime Trailer"
                            allow="autoplay; encrypted-media; fullscreen"
                            className="w-full h-full"
                        />
                    </div>
                </div>
            )}

            {/* Main Details Grid: Episodes Column + Cast/Characters Column */}
            <div className="px-6 md:px-16 py-10 flex flex-col lg:flex-row gap-10">
                {/* Episodes Column (Left / Main) */}
                <div className="w-full lg:w-2/3 flex flex-col gap-6">
                    <div className="flex flex-wrap justify-between items-center border-b border-[#4d4635]/40 pb-3 gap-3">
                        <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2] flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#ffe9b0]">video_library</span>
                            Episodes ({isUnreleased ? 'Upcoming' : totalEpisodes})
                        </h2>

                        <div className="flex items-center gap-3">
                            {/* Search / Jump input */}
                            {!isUnreleased && totalEpisodes > 12 && (
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Jump to Ep #..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="bg-[#1E2020] border border-[#4d4635]/50 text-xs text-[#e2e2e2] rounded-lg pl-7 pr-2.5 py-1.5 focus:border-[#ffe9b0] outline-none w-32 sm:w-36"
                                    />
                                    <span className="material-symbols-outlined absolute left-2 top-1.5 text-sm text-[#99907c]">
                                        search
                                    </span>
                                </div>
                            )}

                            {/* View Mode Toggle */}
                            <div className="flex bg-[#1E2020] rounded-lg p-0.5 border border-[#4d4635]/50">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded text-xs transition-colors ${
                                        viewMode === 'grid' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                                    }`}
                                    title="Grid View"
                                >
                                    <span className="material-symbols-outlined text-base">grid_view</span>
                                </button>
                                <button
                                    onClick={() => setViewMode('detail')}
                                    className={`p-1.5 rounded text-xs transition-colors ${
                                        viewMode === 'detail' ? 'bg-[#ffe9b0] text-[#241a00]' : 'text-[#99907c] hover:text-[#ffe9b0]'
                                    }`}
                                    title="List View"
                                >
                                    <span className="material-symbols-outlined text-base">view_list</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Batch Range Selector (if > 25 episodes) */}
                    {!searchQuery && totalBatches > 1 && (
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
                            {Array.from({ length: totalBatches }).map((_, idx) => {
                                const from = idx * batchSize + 1;
                                const to = Math.min(displayEpisodes, (idx + 1) * batchSize);
                                const isCurrentBatch = selectedBatch === idx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setSelectedBatch(idx)}
                                        className={`px-3 py-1 text-xs rounded font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                            isCurrentBatch
                                                ? 'bg-[#ffe9b0] text-[#241a00] font-bold shadow'
                                                : 'bg-[#1E2020] text-[#d0c5af] hover:text-[#ffe9b0] border border-white/5'
                                        }`}
                                    >
                                        {from} - {to}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Unreleased Notice or Episode List */}
                    {isUnreleased ? (
                        <div className="p-8 rounded-2xl bg-[#1E2020] border border-[#f2ca50]/30 flex flex-col items-center justify-center text-center gap-3">
                            <span className="material-symbols-outlined text-4xl text-[#f2ca50]">schedule</span>
                            <h3 className="font-['Bodoni_Moda'] text-xl text-[#e2e2e2]">Upcoming Season</h3>
                            <p className="text-xs text-[#d0c5af] max-w-md">
                                Episodes for this anime have not aired yet. Add this title to your Watchlist to stay tuned when it releases!
                            </p>
                            <button
                                onClick={handleWatchlistToggle}
                                className="mt-2 px-6 py-2.5 rounded-xl bg-[#ffe9b0] text-[#241a00] font-bold text-xs hover:bg-[#f2ca50] cursor-pointer"
                            >
                                {isBookmarked ? '✓ In Your Watchlist' : '+ Add to Watchlist'}
                            </button>
                        </div>
                    ) : episodesToDisplay.length === 0 ? (
                        <div className="p-8 rounded-xl bg-[#1E2020] text-center text-[#99907c] text-xs">
                            No episodes found matching "{searchQuery}"
                        </div>
                    ) : viewMode === 'grid' ? (
                        /* Grid Number Mode */
                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
                            {episodesToDisplay.map((epNum) => (
                                <button
                                    key={epNum}
                                    onClick={() => navigate(`/watch/${anime.id}/${epNum}`)}
                                    className="h-12 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] text-[#e2e2e2] hover:text-[#ffe9b0] border border-[#4d4635]/40 hover:border-[#ffe9b0] font-['Hanken_Grotesk'] text-sm font-bold transition-all flex items-center justify-center cursor-pointer shadow hover:scale-105"
                                >
                                    {epNum}
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Detailed List Mode */
                        <div className="flex flex-col gap-3">
                            {episodesToDisplay.map((epNum) => (
                                <div
                                    key={epNum}
                                    onClick={() => navigate(`/watch/${anime.id}/${epNum}`)}
                                    className="group flex gap-4 p-3.5 rounded-xl bg-[#1E2020] hover:bg-[#282a2a] transition-all cursor-pointer border border-transparent hover:border-[#ffe9b0]/30 shadow"
                                >
                                    <div className="relative w-36 sm:w-44 aspect-video flex-shrink-0 rounded-lg overflow-hidden bg-[#121414]">
                                        <img
                                            src={banner}
                                            alt={`Episode ${epNum}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="material-symbols-outlined text-[#ffe9b0] text-3xl font-bold">
                                                play_circle
                                            </span>
                                        </div>
                                        <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white/90">
                                            24m
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center flex-grow">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className="font-['Hanken_Grotesk'] text-sm md:text-base font-semibold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors">
                                                Episode {epNum}
                                            </h3>
                                            <span className="text-xs text-[#ffe9b0] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Stream Now →
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#99907c] line-clamp-2 leading-relaxed">
                                            Episode {epNum} follows the narrative progression, encounters, and character development in this episode.
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Cast & Characters Column (Right) */}
                <div className="w-full lg:w-1/3 flex flex-col gap-6">
                    <h2 className="font-['Bodoni_Moda'] text-2xl font-bold text-[#e2e2e2] border-b border-[#4d4635]/40 pb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ffe9b0]">groups</span>
                        Characters & Cast
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        {anime.characters?.edges?.slice(0, 6).map((edge) => {
                            const char = edge.node;
                            const va = edge.voiceActors?.[0];
                            return (
                                <div key={char.id} className="flex flex-col items-center text-center p-3 rounded-xl bg-[#1E2020] border border-[#4d4635]/30 group hover:border-[#ffe9b0]/50 transition-colors">
                                    <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-2 border-transparent group-hover:border-[#ffe9b0] transition-colors bg-[#121414]">
                                        <img
                                            src={char.image?.large || char.image?.medium}
                                            alt={char.name?.full}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="font-['Hanken_Grotesk'] text-xs font-semibold text-[#e2e2e2] group-hover:text-[#ffe9b0] transition-colors truncate w-full">
                                        {char.name?.full}
                                    </p>
                                    {va && (
                                        <p className="text-[11px] text-[#99907c] truncate w-full mt-0.5">
                                            VA: {va.name?.full}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Anime Information Box */}
                    <div className="mt-4 p-4 rounded-xl bg-[#1E2020] border border-[#4d4635]/40 flex flex-col gap-2.5 text-xs text-[#d0c5af]">
                        <h3 className="font-['Bodoni_Moda'] text-base font-bold text-[#ffe9b0] mb-1">
                            Anime Details
                        </h3>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[#99907c]">Studio:</span>
                            <span className="text-[#e2e2e2] font-medium">{anime.studios?.nodes?.[0]?.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[#99907c]">Aired:</span>
                            <span className="text-[#e2e2e2] font-medium">{anime.startDate?.year || '2024'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[#99907c]">Status:</span>
                            <span className="text-[#e2e2e2] font-medium">{anime.status || 'Finished'}</span>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1.5">
                            <span className="text-[#99907c]">Duration:</span>
                            <span className="text-[#e2e2e2] font-medium">{anime.duration ? `${anime.duration} mins/ep` : '24 mins'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-[#99907c]">Favorites:</span>
                            <span className="text-[#ffe9b0] font-bold">{anime.favourites?.toLocaleString() || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recommendations Row */}
            {anime.recommendations?.nodes?.length > 0 && (
                <section className="px-6 md:px-16 pt-8">
                    <h2 className="font-['Bodoni_Moda'] text-2xl md:text-3xl font-bold text-[#e2e2e2] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#ffe9b0]">recommend</span>
                        You Might Also Like
                    </h2>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x scroll-smooth">
                        {anime.recommendations.nodes
                            .filter(n => n.mediaRecommendation)
                            .slice(0, 8)
                            .map((rec) => (
                                <div key={rec.mediaRecommendation.id} className="min-w-[160px] sm:min-w-[190px] md:min-w-[220px] snap-start">
                                    <AnimeCard
                                        anime={rec.mediaRecommendation}
                                        navigate={navigate}
                                    />
                                </div>
                            ))}
                    </div>
                </section>
            )}
        </div>
    );
}
