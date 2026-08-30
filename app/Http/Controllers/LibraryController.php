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
     * Get library summary (Watchlist + Continue Watching History) strictly isolated per user or guest session
     */
    public function index(Request $request): JsonResponse
    {
        $user = AuthController::resolveUser($request);
        $sessionId = $this->getSessionId($request);

        if ($user) {
            $watchlist = Watchlist::where('user_id', $user->id)
                ->orderBy('created_at', 'desc')
                ->get();

            $history = WatchHistory::where('user_id', $user->id)
                ->orderBy('last_watched_at', 'desc')
                ->limit(30)
                ->get();
        } else {
            $watchlist = Watchlist::where('session_id', $sessionId)
                ->whereNull('user_id')
                ->orderBy('created_at', 'desc')
                ->get();

            $history = WatchHistory::where('session_id', $sessionId)
                ->whereNull('user_id')
                ->orderBy('last_watched_at', 'desc')
                ->limit(30)
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'watchlist' => $watchlist,
                'continueWatching' => $history->where('completed', false)->values(),
                'history' => $history,
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ] : null,
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

        $user = AuthController::resolveUser($request);
        $sessionId = $this->getSessionId($request);

        if ($user) {
            $existing = Watchlist::where('user_id', $user->id)
                ->where('anime_id', $validated['anime_id'])
                ->first();

            if ($existing) {
                $existing->delete();
                return response()->json([
                    'success' => true,
                    'isBookmarked' => false,
                    'message' => 'Removed from your personal Watchlist',
                ]);
            }

            $watchlist = Watchlist::create(array_merge($validated, [
                'user_id' => $user->id,
                'session_id' => $sessionId,
            ]));
        } else {
            $existing = Watchlist::where('session_id', $sessionId)
                ->whereNull('user_id')
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
                'user_id' => null,
            ]));
        }

        return response()->json([
            'success' => true,
            'isBookmarked' => true,
            'data' => $watchlist,
            'message' => 'Added to your Watchlist',
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

        $user = AuthController::resolveUser($request);
        $sessionId = $this->getSessionId($request);

        $payload = [
            'anime_title' => $validated['anime_title'],
            'image_url' => $validated['image_url'] ?? null,
            'banner_url' => $validated['banner_url'] ?? null,
            'episode_number' => $validated['episode_number'],
            'episode_title' => $validated['episode_title'] ?? "Episode {$validated['episode_number']}",
            'progress_seconds' => $validated['progress_seconds'],
            'duration_seconds' => $validated['duration_seconds'] ?? 1440,
            'completed' => $validated['completed'] ?? false,
            'last_watched_at' => now(),
        ];

        if ($user) {
            $history = WatchHistory::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'anime_id' => $validated['anime_id'],
                ],
                array_merge($payload, [
                    'session_id' => $sessionId,
                ])
            );
        } else {
            $history = WatchHistory::updateOrCreate(
                [
                    'session_id' => $sessionId,
                    'anime_id' => $validated['anime_id'],
                ],
                $payload
            );
        }

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
        $user = AuthController::resolveUser($request);
        $sessionId = $this->getSessionId($request);

        if ($user) {
            WatchHistory::where('user_id', $user->id)
                ->where('id', $id)
                ->delete();
        } else {
            WatchHistory::where('session_id', $sessionId)
                ->whereNull('user_id')
                ->where('id', $id)
                ->delete();
        }

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
        $user = AuthController::resolveUser($request);
        $sessionId = $this->getSessionId($request);

        if ($user) {
            WatchHistory::where('user_id', $user->id)->delete();
        } else {
            WatchHistory::where('session_id', $sessionId)->whereNull('user_id')->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Watch history cleared',
        ]);
    }
}
