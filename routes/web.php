<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Standard Google OAuth 2.0 Web Flow
Route::get('/auth/google/redirect', [AuthController::class, 'redirectToGoogle'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback'])->name('auth.google.callback');

// Single Page Application View
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
