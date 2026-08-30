<?php

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

require __DIR__ . '/../public/index.php';
