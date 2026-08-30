import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import LayoutWrapper from '@/components/LayoutWrapper';
import AuthModal from '@/components/AuthModal';

export const metadata = {
  title: 'AnimeStop — Premium Anime Streaming',
  description: 'Ultra-HD anime streaming with multi-provider failover, curated seasonal archives, and real-time cloud synchronisation.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap"
          rel="stylesheet"
        />
        <script src="https://accounts.google.com/gsi/client" async defer></script>
      </head>
      <body className="bg-[#121414] text-[#e2e2e2] min-h-screen flex flex-col selection:bg-[#ffe9b0] selection:text-[#241a00] antialiased">
        <AuthProvider>
          <Navbar />
          <LayoutWrapper>{children}</LayoutWrapper>
          <AuthModal />
        </AuthProvider>
      </body>
    </html>
  );
}
