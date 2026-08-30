<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\WatchHistory;
use App\Models\Watchlist;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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
     * Standard Google OAuth 2.0 Flow: Redirect to Google
     */
    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $clientId = config('services.google.client_id') ?: env('GOOGLE_CLIENT_ID');
        $redirectUri = url('/auth/google/callback');

        // Store guest session ID in cookie so we can merge library on return
        $sessionId = $request->query('session_id') ?? $request->header('X-Session-ID') ?? $request->cookie('anime_session_id');
        if ($sessionId) {
            cookie()->queue('anime_session_id', $sessionId, 60 * 24 * 30);
        }

        if (empty($clientId)) {
            return redirect('/?auth_error=' . urlencode('Google Client ID is not configured yet in .env. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'));
        }

        $state = Str::random(40);
        session(['google_oauth_state' => $state]);

        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'state' => $state,
            'access_type' => 'online',
            'prompt' => 'select_account',
        ]);

        return redirect('https://accounts.google.com/o/oauth2/v2/auth?' . $query);
    }

    /**
     * Standard Google OAuth 2.0 Flow: Handle Callback from Google
     */
    public function handleGoogleCallback(Request $request): RedirectResponse
    {
        $code = $request->input('code');
        $error = $request->input('error');

        if ($error || empty($code)) {
            return redirect('/?auth_error=' . urlencode($error ?: 'Google authentication was cancelled.'));
        }

        $clientId = config('services.google.client_id') ?: env('GOOGLE_CLIENT_ID');
        $clientSecret = config('services.google.client_secret') ?: env('GOOGLE_CLIENT_SECRET');
        $redirectUri = url('/auth/google/callback');

        try {
            // Exchange code for Google Access Token
            $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'code' => $code,
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);

            if (! $tokenResponse->successful()) {
                Log::error('Google OAuth token exchange failed', $tokenResponse->json() ?? []);
                return redirect('/?auth_error=' . urlencode('Failed to authenticate with Google. Please check your Google OAuth credentials.'));
            }

            $accessToken = $tokenResponse->json('access_token');

            // Fetch user details from Google
            $userInfoResponse = Http::withToken($accessToken)->get('https://www.googleapis.com/oauth2/v3/userinfo');

            if (! $userInfoResponse->successful()) {
                return redirect('/?auth_error=' . urlencode('Failed to fetch user profile from Google.'));
            }

            $googleUser = $userInfoResponse->json();
            $googleId = $googleUser['sub'];
            $email = strtolower(trim($googleUser['email']));
            $name = $googleUser['name'] ?? explode('@', $email)[0];
            $avatarUrl = $googleUser['picture'] ?? null;

            $apiToken = Str::random(64);

            // Find or create user
            $user = User::where('google_id', $googleId)
                ->orWhere('email', $email)
                ->first();

            if ($user) {
                $user->google_id = $googleId;
                $user->api_token = $apiToken;
                if ($avatarUrl && empty($user->avatar_url)) {
                    $user->avatar_url = $avatarUrl;
                }
                $user->save();
            } else {
                $user = User::create([
                    'name' => $name,
                    'email' => $email,
                    'google_id' => $googleId,
                    'avatar_url' => $avatarUrl ?: 'https://api.dicebear.com/7.x/bottts/svg?seed=' . urlencode($email),
                    'password' => Hash::make(Str::random(32)),
                    'api_token' => $apiToken,
                ]);
            }

            // Merge guest session library
            $guestSessionId = $request->cookie('anime_session_id');
            if ($guestSessionId) {
                $this->mergeGuestLibrary($guestSessionId, $user->id);
            }

            return redirect('/?token=' . $apiToken . '&auth=google_success');
        } catch (\Throwable $e) {
            Log::error('Google OAuth Exception: ' . $e->getMessage());
            return redirect('/?auth_error=' . urlencode('An unexpected error occurred during Google sign in.'));
        }
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
     * Authenticate or Sign Up with Google / Gmail (API endpoint for popup / token flow)
     */
    public function google(Request $request): JsonResponse
    {
        $email = null;
        $name = null;
        $googleId = null;
        $avatarUrl = null;

        // Verify Google ID Token (Google Identity Services)
        if ($request->filled('credential')) {
            try {
                $response = Http::timeout(5)->get('https://oauth2.googleapis.com/tokeninfo', [
                    'id_token' => $request->input('credential'),
                ]);

                if ($response->successful()) {
                    $payload = $response->json();
                    $email = $payload['email'] ?? null;
                    $name = $payload['name'] ?? explode('@', $email)[0];
                    $googleId = $payload['sub'] ?? null;
                    $avatarUrl = $payload['picture'] ?? null;
                }
            } catch (\Throwable $e) {
                Log::error('Google ID Token verification failed: ' . $e->getMessage());
            }
        }

        if (! $email) {
            $email = $request->input('email');
            $name = $request->input('name') ?: (explode('@', $email ?? 'user@gmail.com')[0]);
            $googleId = $request->input('google_id') ?: ('google_' . md5($email));
            $avatarUrl = $request->input('avatar_url');
        }

        if (! $email) {
            return response()->json([
                'success' => false,
                'message' => 'Unable to authenticate with Google. Valid email required.',
            ], 422);
        }

        $email = strtolower(trim($email));
        $apiToken = Str::random(64);

        // Find existing user by google_id or email
        $user = User::where('google_id', $googleId)
            ->orWhere('email', $email)
            ->first();

        if ($user) {
            $user->google_id = $googleId;
            $user->api_token = $apiToken;
            if ($avatarUrl && empty($user->avatar_url)) {
                $user->avatar_url = $avatarUrl;
            }
            $user->save();
        } else {
            $user = User::create([
                'name' => $name ?: 'Anime Explorer',
                'email' => $email,
                'google_id' => $googleId,
                'avatar_url' => $avatarUrl ?: 'https://api.dicebear.com/7.x/bottts/svg?seed=' . urlencode($email),
                'password' => Hash::make(Str::random(32)),
                'api_token' => $apiToken,
            ]);
        }

        // Merge any guest session items into this Google user account
        $guestSessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
        if ($guestSessionId) {
            $this->mergeGuestLibrary($guestSessionId, $user->id);
        }

        return response()->json([
            'success' => true,
            'message' => "Welcome to AnimeStop, {$user->name}!",
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
