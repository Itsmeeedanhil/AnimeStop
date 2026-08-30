<?php

// Enable error reporting for serverless debugging
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

// Prepare writable /tmp storage and cache paths for Vercel Serverless
$storagePath = '/tmp/storage';
$cachePath = '/tmp/bootstrap/cache';
$dirs = [
    $storagePath . '/framework/views',
    $storagePath . '/framework/cache',
    $storagePath . '/framework/sessions',
    $storagePath . '/logs',
    $cachePath,
];

foreach ($dirs as $dir) {
    if (! is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
}

// Copy pre-compiled bootstrap cache files to /tmp/bootstrap/cache if present
$sourceCache = __DIR__ . '/../bootstrap/cache';
if (file_exists($sourceCache . '/packages.php') && ! file_exists($cachePath . '/packages.php')) {
    @copy($sourceCache . '/packages.php', $cachePath . '/packages.php');
}
if (file_exists($sourceCache . '/services.php') && ! file_exists($cachePath . '/services.php')) {
    @copy($sourceCache . '/services.php', $cachePath . '/services.php');
}

putenv("APP_STORAGE_PATH={$storagePath}");
putenv("VIEW_COMPILED_PATH={$storagePath}/framework/views");
$_ENV['APP_STORAGE_PATH'] = $storagePath;
$_ENV['VIEW_COMPILED_PATH'] = "{$storagePath}/framework/views";
$_SERVER['APP_STORAGE_PATH'] = $storagePath;
$_SERVER['VIEW_COMPILED_PATH'] = "{$storagePath}/framework/views";

try {
    require __DIR__ . '/../public/index.php';
} catch (\Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/html; charset=utf-8');
    echo "<div style='font-family: sans-serif; padding: 30px; background: #121414; color: #ffe9b0;'>";
    echo "<h2>AnimeStop Serverless Error</h2>";
    echo "<p style='color: #ff6b6b;'><strong>" . htmlspecialchars($e->getMessage()) . "</strong></p>";
    echo "<p>File: " . htmlspecialchars($e->getFile()) . " (Line " . $e->getLine() . ")</p>";
    echo "<pre style='background: #1e2020; padding: 15px; border-radius: 8px; color: #d0c5af; overflow: auto;'>" . htmlspecialchars($e->getTraceAsString()) . "</pre>";
    echo "</div>";
}
