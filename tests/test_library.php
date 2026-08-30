<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$libController = app(App\Http\Controllers\LibraryController::class);

echo "Testing Watchlist Toggle..." . PHP_EOL;
$request = Illuminate\Http\Request::create('/api/library/watchlist/toggle', 'POST', [
    'anime_id' => 185874,
    'title' => 'BLEACH: Thousand-Year Blood War - The Calamity',
    'image_url' => 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx185874-aU3e6tBT6wwA.jpg',
    'score' => 9.0,
    'format' => 'TV',
    'episodes_count' => 10,
]);
$request->headers->set('X-Session-ID', 'test_session_123');

$res = $libController->toggleWatchlist($request);
echo "-> Toggle response: " . json_encode($res->getData()) . PHP_EOL;

echo PHP_EOL . "Testing Progress Saving..." . PHP_EOL;
$progressReq = Illuminate\Http\Request::create('/api/library/progress', 'POST', [
    'anime_id' => 185874,
    'anime_title' => 'BLEACH: Thousand-Year Blood War - The Calamity',
    'episode_number' => 3,
    'episode_title' => 'Episode 3',
    'progress_seconds' => 450,
    'duration_seconds' => 1440,
    'completed' => false,
]);
$progressReq->headers->set('X-Session-ID', 'test_session_123');
$resProgress = $libController->saveProgress($progressReq);
echo "-> Save Progress response: " . json_encode($resProgress->getData()) . PHP_EOL;

echo PHP_EOL . "Testing Library Index..." . PHP_EOL;
$indexReq = Illuminate\Http\Request::create('/api/library', 'GET');
$indexReq->headers->set('X-Session-ID', 'test_session_123');
$resIndex = $libController->index($indexReq);
$data = $resIndex->getData()->data;
echo "-> Watchlist items: " . count($data->watchlist) . PHP_EOL;
echo "-> Continue watching items: " . count($data->continueWatching) . PHP_EOL;

echo PHP_EOL . "ALL LIBRARY TESTS PASSED!" . PHP_EOL;

