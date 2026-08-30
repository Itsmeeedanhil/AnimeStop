import React from 'react';

export default function Sidebar({ navigate, currentRoute }) {
    const navItems = [
        {
            label: 'Home',
            route: '/',
            icon: 'home',
        },
        {
            label: 'Library',
            route: '/library',
            icon: 'video_library',
        },
        {
            label: 'Top Airing',
            route: '/search?sort=trending',
            icon: 'local_fire_department',
        },
        {
            label: 'Popular Series',
            route: '/search?sort=popular',
            icon: 'stars',
        },
        {
            label: 'Genres',
            route: '/genres',
            icon: 'category',
        },
        {
            label: 'Search & Filter',
            route: '/search',
            icon: 'tune',
        },
    ];

    const isActive = (itemRoute) => {
        if (itemRoute === '/' && currentRoute === '/') return true;
        if (itemRoute !== '/' && currentRoute.startsWith(itemRoute)) return true;
        return false;
    };

    return (
        <aside className="hidden md:flex flex-col gap-2 py-6 bg-[#1E2020] fixed left-0 top-[61px] h-[calc(100vh-61px)] w-60 border-r border-[#4d4635]/40 z-40 overflow-y-auto custom-scrollbar">
            <div className="px-4 mb-2">
                <span className="text-[11px] font-bold tracking-[0.15em] text-[#99907c] uppercase">
                    Menu
                </span>
            </div>

            <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                    const active = isActive(item.route);
                    return (
                        <button
                            key={item.label}
                            onClick={() => navigate(item.route)}
                            className={`flex items-center gap-3.5 px-4 py-2.5 text-left transition-all group ${
                                active
                                    ? 'text-[#ffe9b0] bg-[#f2ca50]/10 border-r-4 border-[#ffe9b0] font-semibold'
                                    : 'text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#282a2a]'
                            }`}
                        >
                            <span
                                className={`material-symbols-outlined text-xl transition-transform group-hover:scale-110 ${
                                    active ? 'text-[#ffe9b0]' : 'text-[#99907c] group-hover:text-[#ffe9b0]'
                                }`}
                                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                            >
                                {item.icon}
                            </span>
                            <span className="font-['Hanken_Grotesk'] text-sm tracking-wide">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Quick Genre Tags */}
            <div className="mt-8 px-4">
                <span className="text-[11px] font-bold tracking-[0.15em] text-[#99907c] uppercase block mb-3">
                    Popular Genres
                </span>
                <div className="flex flex-wrap gap-1.5">
                    {['Action', 'Fantasy', 'Romance', 'Sci-Fi', 'Comedy', 'Shonen'].map((genre) => (
                        <button
                            key={genre}
                            onClick={() => navigate(`/search?genre=${genre}`)}
                            className="px-2.5 py-1 text-[11px] rounded bg-[#121414] text-[#d0c5af] hover:text-[#ffe9b0] hover:bg-[#282a2a] border border-[#4d4635]/40 transition-colors"
                        >
                            {genre}
                        </button>
                    ))}
                </div>
            </div>

            {/* Bottom Brand Tag */}
            <div className="mt-auto px-4 pt-6 text-xs text-[#99907c]">
                <p className="font-['Bodoni_Moda'] text-sm text-[#ffe9b0]/80">AnimeStop Stream</p>
                <p className="text-[10px] text-[#99907c] mt-0.5">High-Speed HD Anime</p>
            </div>
        </aside>
    );
}

