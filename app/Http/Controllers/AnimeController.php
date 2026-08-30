<?php

namespace App\Http\Controllers;

use App\Services\AnimeService;
use App\Services\StreamingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnimeController extends Controller
{
    public function __construct(
        protected AnimeService $animeService,
        protected StreamingService $streamingService
    ) {}

    /**
     * Get home page feed
     */
    public function home(): JsonResponse
    {
        $feed = $this->animeService->getHomeFeed();

        return response()->json([
            'success' => true,
            'data' => $feed,
        ]);
    }

    /**
     * Get detailed anime metadata
     */
    public function details(int $id): JsonResponse
    {
        $details = $this->animeService->getAnimeDetails($id);

        if (! $details) {
            return response()->json([
                'success' => false,
                'message' => 'Anime not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $details,
        ]);
    }

    /**
     * Get streaming data for an episode
     */
    public function stream(int $id, int $episode = 1): JsonResponse
    {
        $details = $this->animeService->getAnimeDetails($id);
        $streamData = $this->streamingService->getStreamData($id, $episode, $details);

        return response()->json([
            'success' => true,
            'data' => [
                'anime' => $details,
                'stream' => $streamData,
            ],
        ]);
    }

    /**
     * Search and filter anime
     */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'genre' => ['nullable', 'string', 'max:50'],
            'format' => ['nullable', 'string', 'max:20'],
            'season' => ['nullable', 'string', 'max:20'],
            'year' => ['nullable', 'integer', 'min:1960', 'max:2030'],
            'sort' => ['nullable', 'string', 'in:trending,popular,score,newest,favorites'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $results = $this->animeService->search($validated);

        return response()->json([
            'success' => true,
            'data' => $results,
        ]);
    }

    /**
     * Get genres list
     */
    public function genres(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->animeService->getGenres(),
        ]);
    }
}

