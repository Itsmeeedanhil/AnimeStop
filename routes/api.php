<?php

use App\Http\Controllers\AnimeController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LibraryController;
use Illuminate\Support\Facades\Route;

// Authentication Endpoints
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/google', [AuthController::class, 'google']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});

// Anime Catalog & Streaming
Route::prefix('anime')->group(function () {
    Route::get('/home', [AnimeController::class, 'home']);
    Route::get('/details/{id}', [AnimeController::class, 'details']);
    Route::get('/stream/{id}/{episode?}', [AnimeController::class, 'stream']);
    Route::get('/search', [AnimeController::class, 'search']);
    Route::get('/genres', [AnimeController::class, 'genres']);
});

// Personalized Library & Watch History
Route::prefix('library')->group(function () {
    Route::get('/', [LibraryController::class, 'index']);
    Route::post('/watchlist/toggle', [LibraryController::class, 'toggleWatchlist']);
    Route::post('/progress', [LibraryController::class, 'saveProgress']);
    Route::delete('/history/{id}', [LibraryController::class, 'deleteHistory']);
    Route::post('/history/clear', [LibraryController::class, 'clearHistory']);
});
