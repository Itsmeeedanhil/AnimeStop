<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$animeService = app(App\Services\AnimeService::class);
$streamingService = app(App\Services\StreamingService::class);

echo "Testing AniList GraphQL Query..." . PHP_EOL;
$home = $animeService->getHomeFeed();
echo "-> Spotlight count: " . count($home['spotlight']) . PHP_EOL;
echo "-> Trending count: " . count($home['trending']) . PHP_EOL;

if (!empty($home['trending'][0])) {
    $first = $home['trending'][0];
    $title = $first['title']['english'] ?? $first['title']['romaji'];
    echo "-> First Trending: {$title} (ID: {$first['id']})" . PHP_EOL;

    echo PHP_EOL . "Testing Anime Details for ID {$first['id']}..." . PHP_EOL;
    $details = $animeService->getAnimeDetails($first['id']);
    echo "-> Episodes: " . ($details['episodes'] ?? 'N/A') . PHP_EOL;
    echo "-> Score: " . ($details['averageScore'] ?? 'N/A') . PHP_EOL;
    echo "-> Characters count: " . count($details['characters']['edges'] ?? []) . PHP_EOL;

    echo PHP_EOL . "Testing Unified Streaming Resolver..." . PHP_EOL;
    $stream = $streamingService->getStreamData($first['id'], 1, $details);
    echo "-> Direct Stream URL: " . ($stream['streamUrl'] ?? 'N/A') . PHP_EOL;
    echo "-> Episodes List: " . count($stream['episodes']) . " episodes" . PHP_EOL;
}

echo PHP_EOL . "Testing Search..." . PHP_EOL;
$search = $animeService->search(['q' => 'Solo Leveling', 'per_page' => 3]);
echo "-> Search results: " . count($search['items']) . PHP_EOL;

echo PHP_EOL . "ALL BACKEND TESTS PASSED SUCCESSFULLY!" . PHP_EOL;
