# AnimeStop — Engineering Standards

This project follows the **Laravel Enterprise Skill Library** (Laravel 12 / PHP 8.4) and modern React/Tailwind frontend standards.

## Core Rules

1. **Routing & Standards**:
   - Refer to `.claude/skills/laravel-ai-coding-standards` before introducing new architecture.
   - API endpoints follow `.claude/skills/laravel-api-standards` (consistent JSON shapes, resource transformation, capped pagination, error structures).
   - Security standards follow `.claude/skills/laravel-security` (input validation, rate limiting, sanitization, strict CORS).
   - Accessibility & Responsiveness follow `.claude/skills/laravel-ui-accessibility` and `.claude/skills/laravel-responsive-design` (WCAG 2.2 AA, mobile-first responsive layout, touch targets >= 44x44px).

2. **Backend Architecture**:
   - Framework: Laravel 12 / PHP 8.4
   - Database: SQLite with Eloquent models (`Watchlist`, `WatchHistory`, `EpisodeProgress`)
   - Services: `AnimeService` for AniList GraphQL / metadata caching, `StreamingService` for multi-server stream resolving.
   - Controllers: Single-responsibility controllers returning consistent JSON envelopes: `{ "success": true, "data": ... }`.

3. **Frontend Architecture**:
   - Stack: React 18+, Tailwind CSS, Vite
   - Design System: Luxury Noir Dark Palette (`#121414`, `#1E2020`, `#282a2a`) with Golden Accents (`#ffe9b0`, `#f2ca50`, `#99907c`)
   - Typography: `Bodoni Moda` (Serif Display/Headline) and `Hanken Grotesk` (Sans UI/Body)
   - Icons: Google Material Symbols Outlined

