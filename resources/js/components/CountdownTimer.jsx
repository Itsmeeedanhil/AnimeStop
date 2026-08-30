import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ airingAt, timeUntilAiring, episode, className = '' }) {
    const calculateTimeLeft = () => {
        let diff = 0;
        if (airingAt) {
            diff = Math.max(0, Math.floor(airingAt - (Date.now() / 1000)));
        } else if (timeUntilAiring) {
            diff = Math.max(0, timeUntilAiring);
        }

        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const minutes = Math.floor((diff % 3600) / 60);
        const seconds = diff % 60;

        return { total: diff, days, hours, minutes, seconds };
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(interval);
    }, [airingAt, timeUntilAiring]);

    if (timeLeft.total <= 0) {
        return (
            <div className={`flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg ${className}`}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Episode {episode || ''} is now airing!</span>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap items-center gap-3 bg-[#1e2020]/90 border border-[#f2ca50]/30 px-4 py-2.5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)] ${className}`}>
            <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f2ca50] animate-pulse"></span>
                <span className="text-xs font-bold text-[#ffe9b0] uppercase tracking-wider">
                    {episode ? `Episode ${episode} Airing In:` : 'Next Episode In:'}
                </span>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#f2ca50]">
                {timeLeft.days > 0 && (
                    <div className="flex items-center gap-1 bg-[#121414] px-2 py-1 rounded border border-[#4d4635]/40">
                        <span className="text-[#ffe9b0]">{String(timeLeft.days).padStart(2, '0')}</span>
                        <span className="text-[10px] text-[#99907c]">d</span>
                    </div>
                )}
                <div className="flex items-center gap-1 bg-[#121414] px-2 py-1 rounded border border-[#4d4635]/40">
                    <span className="text-[#ffe9b0]">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="text-[10px] text-[#99907c]">h</span>
                </div>
                <span className="text-[#99907c]">:</span>
                <div className="flex items-center gap-1 bg-[#121414] px-2 py-1 rounded border border-[#4d4635]/40">
                    <span className="text-[#ffe9b0]">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="text-[10px] text-[#99907c]">m</span>
                </div>
                <span className="text-[#99907c]">:</span>
                <div className="flex items-center gap-1 bg-[#121414] px-2 py-1 rounded border border-[#4d4635]/40">
                    <span className="text-[#ffe9b0]">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="text-[10px] text-[#99907c]">s</span>
                </div>
            </div>
        </div>
    );
}
