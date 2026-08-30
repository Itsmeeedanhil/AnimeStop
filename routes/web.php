<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Standard Google OAuth 2.0 Web Flow
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');

// Single Page Application View with explicit HTML Content-Type header
Route::get('/{any?}', function () {
    return response()
        ->view('app')
        ->header('Content-Type', 'text/html; charset=UTF-8');
})->where('any', '.*');
