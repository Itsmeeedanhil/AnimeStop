# AnimeStop 🎬✨

<p align="center">
  <strong>Luxury Anime Streaming & Discovery Platform built with Laravel 12 & React 19</strong>
</p>

---

## 🌟 Overview

**AnimeStop** is a modern, responsive anime streaming and discovery platform designed with a luxury dark & gold visual aesthetic. It leverages AniList's GraphQL API for metadata and real-time catalog discovery, paired with a clean, unified streaming player.

---

## ✨ Features

- 🎭 **Luxury Dark & Gold UI**: Cinematic hero spotlight carousel, glassmorphism header, and gold typography.
- ⚡ **AniList GraphQL Catalog**: Real-time monthly trending charts, seasonal top airing, character voice actors, and studios.
- 🎬 **Clean Direct Player**: Direct video streaming with 25-episode batch queues, instant search, and "Open in New Tab ↗" support.
- 📚 **Personal Library & History**: Watchlist manager with auto-saving watch progress.
- 📱 **Mobile-First Responsive Layout**: Smooth drawer navigation and adaptable multi-column grids across all screen sizes.
- 🛡️ **WCAG 2.2 AA Accessibility**: Full keyboard navigation, ARIA landmarks, and high-contrast gold accents.

---

## 🛠️ Tech Stack

- **Backend**: Laravel 12 (PHP 8.2+)
- **Frontend**: React 19, Tailwind CSS v4, Lucide & Material Symbols Icons
- **Bundler**: Vite 6
- **Database**: SQLite / MySQL / PostgreSQL
- **APIs**: AniList GraphQL API & MegaPlays Embed Engine

---

## 🚀 Quick Start

### 1. Clone & Setup
```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/AnimeStop.git
cd AnimeStop

# Install PHP dependencies
composer install

# Install JS dependencies
npm install
```

### 2. Environment Configuration
```bash
# Copy example environment
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate
```

### 3. Run Development Server
```bash
# Terminal 1: Vite Asset Dev Server
npm run dev

# Terminal 2: Laravel Application Server
php artisan serve
```

Visit `http://localhost:8000` to start exploring AnimeStop!

---

## 📜 License
This project is open-source software licensed under the [MIT license](LICENSE).
