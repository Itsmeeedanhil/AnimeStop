<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WatchHistory;
use App\Models\Watchlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Resolve authenticated user from Bearer token or session
     */
    public static function resolveUser(Request $request): ?User
    {
        $bearerToken = $request->bearerToken();
        if ($bearerToken) {
            $user = User::where('api_token', $bearerToken)->first();
            if ($user) {
                return $user;
            }
        }

        if (auth()->check()) {
            return auth()->user();
        }

        return null;
    }

    /**
     * Register a new user with Email & Password
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $apiToken = Str::random(64);

        $user = User::create([
            'name' => trim($validated['name']),
            'email' => strtolower(trim($validated['email'])),
            'password' => Hash::make($validated['password']),
            'api_token' => $apiToken,
            'avatar_url' => 'https://api.dicebear.com/7.x/bottts/svg?seed=' . urlencode($validated['name']),
        ]);

        // Merge guest library into this user's account if guest session exists
        $guestSessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
        if ($guestSessionId) {
            $this->mergeGuestLibrary($guestSessionId, $user->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully! Welcome to AnimeStop.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
            'token' => $apiToken,
        ], 201);
    }

    /**
     * Authenticate user with Email & Password
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', strtolower(trim($validated['email'])))->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Generate or refresh API Token
        $apiToken = Str::random(64);
        $user->api_token = $apiToken;
        $user->save();

        // Merge guest library items into this user account
        $guestSessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
        if ($guestSessionId) {
            $this->mergeGuestLibrary($guestSessionId, $user->id);
        }

        return response()->json([
            'success' => true,
            'message' => "Welcome back, {$user->name}!",
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
            'token' => $apiToken,
        ]);
    }

    /**
     * Get currently authenticated user
     */
    public function me(Request $request): JsonResponse
    {
        $user = self::resolveUser($request);

        if (! $user) {
            return response()->json([
                'success' => true,
                'user' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    /**
     * Log out current user
     */
    public function logout(Request $request): JsonResponse
    {
        $user = self::resolveUser($request);

        if ($user) {
            $user->api_token = null;
            $user->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Signed out successfully.',
        ]);
    }

    /**
     * Merge guest session items into the authenticated user account
     */
    protected function mergeGuestLibrary(string $sessionId, int $userId): void
    {
        // Migrate Watchlist items
        $guestWatchlists = Watchlist::where('session_id', $sessionId)
            ->whereNull('user_id')
            ->get();

        foreach ($guestWatchlists as $item) {
            $exists = Watchlist::where('user_id', $userId)
                ->where('anime_id', $item->anime_id)
                ->exists();

            if (! $exists) {
                $item->user_id = $userId;
                $item->save();
            } else {
                $item->delete();
            }
        }

        // Migrate Watch History items
        $guestHistories = WatchHistory::where('session_id', $sessionId)
            ->whereNull('user_id')
            ->get();

        foreach ($guestHistories as $history) {
            $existing = WatchHistory::where('user_id', $userId)
                ->where('anime_id', $history->anime_id)
                ->first();

            if (! $existing) {
                $history->user_id = $userId;
                $history->save();
            } else {
                if ($history->last_watched_at > $existing->last_watched_at) {
                    $existing->update([
                        'episode_number' => $history->episode_number,
                        'episode_title' => $history->episode_title,
                        'progress_seconds' => $history->progress_seconds,
                        'duration_seconds' => $history->duration_seconds,
                        'completed' => $history->completed,
                        'last_watched_at' => $history->last_watched_at,
                    ]);
                }
                $history->delete();
            }
        }
    }
}
