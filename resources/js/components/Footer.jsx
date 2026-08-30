import React from 'react';

export default function Footer({ navigate }) {
    return (
        <footer className="w-full bg-[#0d0f0f] border-t border-[#4d4635]/40 py-10 px-6 md:px-16 mt-auto">
            <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-3">
                    <img
                        src="/favicon.svg"
                        alt="AnimeStop Logo"
                        className="w-8 h-8 rounded-lg shadow-[0_0_12px_rgba(255,233,176,0.3)]"
                    />
                    <div className="flex flex-col items-start gap-0.5">
                        <span className="font-['Bodoni_Moda'] text-2xl font-bold text-[#ffe9b0]">
                            AnimeStop
                        </span>
                        <span className="text-xs text-[#99907c]">
                            The Ultimate High-Definition Anime Streaming Experience
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-6 text-xs text-[#d0c5af]">
                    <button onClick={() => navigate('/')} className="hover:text-[#ffe9b0] transition-colors cursor-pointer">
                        Home
                    </button>
                    <button onClick={() => navigate('/search?sort=trending')} className="hover:text-[#ffe9b0] transition-colors cursor-pointer">
                        Trending Anime
                    </button>
                    <button onClick={() => navigate('/genres')} className="hover:text-[#ffe9b0] transition-colors cursor-pointer">
                        Browse Genres
                    </button>
                    <button onClick={() => navigate('/library')} className="hover:text-[#ffe9b0] transition-colors cursor-pointer">
                        My Watchlist
                    </button>
                    <a href="https://anilist.co" target="_blank" rel="noreferrer" className="hover:text-[#ffe9b0] transition-colors">
                        Powered by AniList
                    </a>
                </div>

                <div className="text-xs text-[#99907c] text-center md:text-right">
                    <p>© {new Date().getFullYear()} AnimeStop. All Rights Reserved.</p>
                    <p className="text-[10px] text-[#99907c]/70 mt-0.5">Disclaimer: AnimeStop does not host any media files on its servers.</p>
                </div>
            </div>
        </footer>
    );
}
