<?php

use App\Http\Controllers\AnimeController;
use App\Http\Controllers\LibraryController;
use Illuminate\Support\Facades\Route;

Route::prefix('anime')->group(function () {
    Route::get('/home', [AnimeController::class, 'home']);
    Route::get('/details/{id}', [AnimeController::class, 'details']);
    Route::get('/stream/{id}/{episode?}', [AnimeController::class, 'stream']);
    Route::get('/search', [AnimeController::class, 'search']);
    Route::get('/genres', [AnimeController::class, 'genres']);
});

Route::prefix('library')->group(function () {
    Route::get('/', [LibraryController::class, 'index']);
    Route::post('/watchlist/toggle', [LibraryController::class, 'toggleWatchlist']);
    Route::post('/progress', [LibraryController::class, 'saveProgress']);
    Route::delete('/history/{id}', [LibraryController::class, 'deleteHistory']);
    Route::post('/history/clear', [LibraryController::class, 'clearHistory']);
});

