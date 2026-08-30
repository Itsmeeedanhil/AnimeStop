<?php

namespace App\Http\Controllers;

use App\Models\WatchHistory;
use App\Models\Watchlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LibraryController extends Controller
{
    /**
     * Get user or session identifier
     */
    protected function getSessionId(Request $request): string
    {
        return $request->header('X-Session-ID') ?? $request->cookie('anime_session_id') ?? 'guest_default_session';
    }

    /**
     * Get library summary (Watchlist + Continue Watching History)
     */
    public function index(Request $request): JsonResponse
    {
        $sessionId = $this->getSessionId($request);

        $watchlist = Watchlist::where('session_id', $sessionId)
            ->orderBy('created_at', 'desc')
            ->get();

        $history = WatchHistory::where('session_id', $sessionId)
            ->orderBy('last_watched_at', 'desc')
            ->limit(30)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'watchlist' => $watchlist,
                'continueWatching' => $history->where('completed', false)->values(),
                'history' => $history,
            ],
        ]);
    }

    /**
     * Toggle item in watchlist
     */
    public function toggleWatchlist(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'anime_id' => ['required', 'integer'],
            'title' => ['required', 'string', 'max:255'],
            'image_url' => ['nullable', 'string'],
            'banner_url' => ['nullable', 'string'],
            'genres' => ['nullable', 'array'],
            'format' => ['nullable', 'string'],
            'episodes_count' => ['nullable', 'integer'],
            'score' => ['nullable', 'numeric'],
        ]);

        $sessionId = $this->getSessionId($request);

        $existing = Watchlist::where('session_id', $sessionId)
            ->where('anime_id', $validated['anime_id'])
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json([
                'success' => true,
                'isBookmarked' => false,
                'message' => 'Removed from Watchlist',
            ]);
        }

        $watchlist = Watchlist::create(array_merge($validated, [
            'session_id' => $sessionId,
        ]));

        return response()->json([
            'success' => true,
            'isBookmarked' => true,
            'data' => $watchlist,
            'message' => 'Added to Watchlist',
        ]);
    }

    /**
     * Save/update watch progress
     */
    public function saveProgress(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'anime_id' => ['required', 'integer'],
            'anime_title' => ['required', 'string', 'max:255'],
            'image_url' => ['nullable', 'string'],
            'banner_url' => ['nullable', 'string'],
            'episode_number' => ['required', 'integer', 'min:1'],
            'episode_title' => ['nullable', 'string', 'max:255'],
            'progress_seconds' => ['required', 'integer', 'min:0'],
            'duration_seconds' => ['nullable', 'integer', 'min:0'],
            'completed' => ['nullable', 'boolean'],
        ]);

        $sessionId = $this->getSessionId($request);

        $history = WatchHistory::updateOrCreate(
            [
                'session_id' => $sessionId,
                'anime_id' => $validated['anime_id'],
            ],
            [
                'anime_title' => $validated['anime_title'],
                'image_url' => $validated['image_url'] ?? null,
                'banner_url' => $validated['banner_url'] ?? null,
                'episode_number' => $validated['episode_number'],
                'episode_title' => $validated['episode_title'] ?? "Episode {$validated['episode_number']}",
                'progress_seconds' => $validated['progress_seconds'],
                'duration_seconds' => $validated['duration_seconds'] ?? 1440,
                'completed' => $validated['completed'] ?? false,
                'last_watched_at' => now(),
            ]
        );

        return response()->json([
            'success' => true,
            'data' => $history,
        ]);
    }

    /**
     * Remove item from history
     */
    public function deleteHistory(Request $request, int $id): JsonResponse
    {
        $sessionId = $this->getSessionId($request);

        WatchHistory::where('session_id', $sessionId)
            ->where('id', $id)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => 'History item removed',
        ]);
    }

    /**
     * Clear all history
     */
    public function clearHistory(Request $request): JsonResponse
    {
        $sessionId = $this->getSessionId($request);

        WatchHistory::where('session_id', $sessionId)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Watch history cleared',
        ]);
    }
}

