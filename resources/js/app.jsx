import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import HomePage from './pages/HomePage';
import DetailsPage from './pages/DetailsPage';
import PlayerPage from './pages/PlayerPage';
import LibraryPage from './pages/LibraryPage';
import SearchPage from './pages/SearchPage';
import GenresPage from './pages/GenresPage';
import { AuthApi, setAuthToken } from './services/api';

function App() {
    const [currentPath, setCurrentPath] = useState(window.location.pathname + window.location.search);
    const [notification, setNotification] = useState(null);
    const [user, setUser] = useState(null);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authInitialMode, setAuthInitialMode] = useState('login');

    // Synchronize browser history
    useEffect(() => {
        const handlePopState = () => {
            setCurrentPath(window.location.pathname + window.location.search);
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Load authenticated user on app mount
    useEffect(() => {
        AuthApi.getMe()
            .then((userData) => {
                if (userData) setUser(userData);
            })
            .catch(() => {
                setUser(null);
            });
    }, []);

    const navigate = (url) => {
        window.history.pushState({}, '', url);
        setCurrentPath(url);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const showNotification = (msg) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3500);
    };

    const openAuthModal = (mode = 'login') => {
        setAuthInitialMode(mode);
        setIsAuthModalOpen(true);
    };

    const handleAuthSuccess = (userData) => {
        setUser(userData);
    };

    const handleLogout = async () => {
        try {
            await AuthApi.logout();
        } catch (e) {
            // Ignore
        } finally {
            setAuthToken(null);
            setUser(null);
            showNotification('You have been signed out.');
        }
    };

    // Route matching
    const parseRoute = () => {
        const [path, search] = currentPath.split('?');
        const searchParams = new URLSearchParams(search || '');
        const params = Object.fromEntries(searchParams.entries());

        if (path.startsWith('/watch/')) {
            const parts = path.replace('/watch/', '').split('/');
            const id = parts[0];
            const ep = parts[1] || 1;
            return { name: 'player', id, episode: ep };
        }

        if (path.startsWith('/anime/')) {
            const id = path.replace('/anime/', '').split('/')[0];
            return { name: 'details', id };
        }

        if (path === '/library') {
            return { name: 'library' };
        }

        if (path === '/genres') {
            return { name: 'genres' };
        }

        if (path === '/search' || path === '/browse') {
            return { name: 'search', params };
        }

        return { name: 'home' };
    };

    const route = parseRoute();
    const isPlayerRoute = route.name === 'player';

    return (
        <div className="min-h-screen flex flex-col bg-[#121414] text-[#e2e2e2] font-['Hanken_Grotesk'] selection:bg-[#ffe9b0] selection:text-[#241a00]">
            {/* Global Notification Toast */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-50 bg-[#1E2020] border border-[#ffe9b0]/50 text-[#ffe9b0] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold animate-bounce">
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    <span>{notification}</span>
                </div>
            )}

            {/* Authentication Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                initialMode={authInitialMode}
                onClose={() => setIsAuthModalOpen(false)}
                onSuccess={handleAuthSuccess}
                showNotification={showNotification}
            />

            {/* Standard Top Navigation Bar with User Profile */}
            <Navbar
                navigate={navigate}
                currentRoute={currentPath}
                user={user}
                onOpenAuthModal={openAuthModal}
                onLogout={handleLogout}
            />

            {/* Main Body Shell */}
            <div className="flex flex-1 pt-[61px]">
                {/* Desktop Side Navigation Bar (Hidden in Focused Player Mode) */}
                {!isPlayerRoute && <Sidebar navigate={navigate} currentRoute={currentPath} />}

                {/* Main Viewport Container */}
                <main className={`flex-1 flex flex-col min-w-0 transition-all ${!isPlayerRoute ? 'md:pl-60' : ''}`}>
                    {route.name === 'home' && (
                        <HomePage
                            navigate={navigate}
                            showNotification={showNotification}
                            user={user}
                            onOpenAuthModal={openAuthModal}
                        />
                    )}

                    {route.name === 'details' && (
                        <DetailsPage
                            id={route.id}
                            navigate={navigate}
                            showNotification={showNotification}
                            user={user}
                            onOpenAuthModal={openAuthModal}
                        />
                    )}

                    {route.name === 'player' && (
                        <PlayerPage
                            id={route.id}
                            episode={route.episode}
                            navigate={navigate}
                            showNotification={showNotification}
                            user={user}
                            onOpenAuthModal={openAuthModal}
                        />
                    )}

                    {route.name === 'library' && (
                        <LibraryPage
                            navigate={navigate}
                            showNotification={showNotification}
                            user={user}
                            onOpenAuthModal={openAuthModal}
                        />
                    )}

                    {route.name === 'search' && (
                        <SearchPage
                            initialParams={route.params}
                            navigate={navigate}
                            showNotification={showNotification}
                            user={user}
                            onOpenAuthModal={openAuthModal}
                        />
                    )}

                    {route.name === 'genres' && (
                        <GenresPage navigate={navigate} />
                    )}

                    {/* Footer (Hidden in Video Player view for maximum immersion) */}
                    {!isPlayerRoute && <Footer navigate={navigate} />}
                </main>
            </div>
        </div>
    );
}

const rootElement = document.getElementById('root');
if (rootElement) {
    createRoot(rootElement).render(<App />);
}
