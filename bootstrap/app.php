<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();

// Always use writable /tmp storage in serverless environments (Vercel, AWS Lambda)
if (PHP_SAPI !== 'cli' || isset($_SERVER['LAMBDA_TASK_ROOT']) || isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL']) || env('VERCEL') || env('APP_ENV') === 'production') {
    $storagePath = '/tmp/storage';
    if (! is_dir($storagePath . '/framework/views')) {
        @mkdir($storagePath . '/framework/views', 0777, true);
        @mkdir($storagePath . '/framework/cache', 0777, true);
        @mkdir($storagePath . '/framework/sessions', 0777, true);
        @mkdir($storagePath . '/logs', 0777, true);
    }
    $app->useStoragePath($storagePath);
}

return $app;
