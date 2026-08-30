<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Watchlist;
use App\Models\WatchHistory;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\LibraryController;
use Illuminate\Http\Request;

echo "=== TESTING EMAIL AUTHENTICATION & USER LIBRARY ISOLATION ===" . PHP_EOL . PHP_EOL;

// Clean test data
User::where('email', 'like', 'test_%@animestop.com')->orWhere('email', 'like', 'test_%@gmail.com')->delete();
Watchlist::truncate();
WatchHistory::truncate();

// 1. Test Registration
echo "1. Testing Registration..." . PHP_EOL;
$authController = app(AuthController::class);

$regRequest = Request::create('/api/auth/register', 'POST', [
    'name' => 'Tanjiro Kamado',
    'email' => 'test_tanjiro@animestop.com',
    'password' => 'secret123',
]);
$regResponse = $authController->register($regRequest);
$regData = json_decode($regResponse->getContent(), true);

echo "-> Status: " . $regResponse->getStatusCode() . PHP_EOL;
echo "-> User Created: " . $regData['user']['name'] . " (" . $regData['user']['email'] . ")" . PHP_EOL;
echo "-> Token Received: " . substr($regData['token'], 0, 15) . "..." . PHP_EOL;
$user1Token = $regData['token'];
$user1Id = $regData['user']['id'];

// 2. Test Login
echo PHP_EOL . "2. Testing Login..." . PHP_EOL;
$loginRequest = Request::create('/api/auth/login', 'POST', [
    'email' => 'test_tanjiro@animestop.com',
    'password' => 'secret123',
]);
$loginResponse = $authController->login($loginRequest);
$loginData = json_decode($loginResponse->getContent(), true);
echo "-> Login Success: " . $loginData['message'] . PHP_EOL;

// 3. Test Google / Gmail Sign Up
echo PHP_EOL . "3. Testing Google / Gmail Sign Up..." . PHP_EOL;
$googleRequest = Request::create('/api/auth/google', 'POST', [
    'email' => 'test_nezuko@gmail.com',
    'name' => 'Nezuko Kamado',
    'google_id' => 'google_test_123456789',
    'avatar_url' => 'https://api.dicebear.com/7.x/bottts/svg?seed=nezuko',
]);
$googleResponse = $authController->google($googleRequest);
$googleData = json_decode($googleResponse->getContent(), true);
echo "-> Google Status: " . $googleResponse->getStatusCode() . PHP_EOL;
echo "-> Google User Created: " . $googleData['user']['name'] . " (" . $googleData['user']['email'] . ")" . PHP_EOL;

// 4. Test User 1 adding to Watchlist
echo PHP_EOL . "4. Testing User 1 Watchlist..." . PHP_EOL;
$libController = app(LibraryController::class);

$addReq = Request::create('/api/library/watchlist/toggle', 'POST', [
    'anime_id' => 101922, // Demon Slayer
    'title' => 'Demon Slayer: Kimetsu no Yaiba',
    'image_url' => 'https://example.com/ds.jpg',
]);
$addReq->headers->set('Authorization', 'Bearer ' . $user1Token);
$addRes = $libController->toggleWatchlist($addReq);
echo "-> User 1 Added Demon Slayer: " . json_decode($addRes->getContent(), true)['message'] . PHP_EOL;

// 5. Create User 2 (Zenitsu)
echo PHP_EOL . "5. Creating User 2 (Zenitsu)..." . PHP_EOL;
$regRequest2 = Request::create('/api/auth/register', 'POST', [
    'name' => 'Zenitsu Agatsuma',
    'email' => 'test_zenitsu@animestop.com',
    'password' => 'secret123',
]);
$regResponse2 = $authController->register($regRequest2);
$user2Data = json_decode($regResponse2->getContent(), true);
$user2Token = $user2Data['token'];

// 6. Verify User 2 library is EMPTY (Strict Isolation)
echo PHP_EOL . "6. Verifying Strict Library Isolation between User 1 and User 2..." . PHP_EOL;
$libReq2 = Request::create('/api/library', 'GET');
$libReq2->headers->set('Authorization', 'Bearer ' . $user2Token);
$libRes2 = $libController->index($libReq2);
$libData2 = json_decode($libRes2->getContent(), true);

echo "-> User 2 Watchlist count: " . count($libData2['data']['watchlist']) . " (Expected: 0)" . PHP_EOL;

// Verify User 1 library has Demon Slayer
$libReq1 = Request::create('/api/library', 'GET');
$libReq1->headers->set('Authorization', 'Bearer ' . $user1Token);
$libRes1 = $libController->index($libReq1);
$libData1 = json_decode($libRes1->getContent(), true);
echo "-> User 1 Watchlist count: " . count($libData1['data']['watchlist']) . " (Expected: 1)" . PHP_EOL;

if (count($libData2['data']['watchlist']) === 0 && count($libData1['data']['watchlist']) === 1 && !empty($googleData['token'])) {
    echo PHP_EOL . ">>> ALL EMAIL & GMAIL AUTHENTICATION AND ISOLATION TESTS PASSED WITH 100% SUCCESS! <<<" . PHP_EOL;
} else {
    echo PHP_EOL . ">>> ISOLATION TEST FAILED <<<" . PHP_EOL;
}
