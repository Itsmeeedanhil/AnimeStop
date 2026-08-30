<!DOCTYPE html>
<html class="dark" lang="en">
<head>
    <meta charset="utf-8">
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="google-client-id" content="{{ config('services.google.client_id', '') }}">
    <title>AnimeStop — Premium Anime Streaming</title>
    
    <!-- Custom Logo & Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="alternate icon" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/favicon.svg">
    
    <!-- Google Fonts: Bodoni Moda (Headlines) & Hanken Grotesk (Body) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900&family=Hanken+Grotesk:ital,wght@0,100..900;1,100..900&display=swap" rel="stylesheet">
    
    <!-- Material Symbols Outlined -->
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
    
    <!-- Official Google Identity Services SDK -->
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    
    @php
        $manifestPath = public_path('build/manifest.json');
        $manifest = file_exists($manifestPath) ? json_decode(file_get_contents($manifestPath), true) : [];
        $cssFile = $manifest['resources/css/app.css']['file'] ?? null;
        $jsFile = $manifest['resources/js/app.jsx']['file'] ?? null;
    @endphp

    @if ($cssFile)
        <link rel="stylesheet" href="/build/{{ $cssFile }}">
    @endif
    @if ($jsFile)
        <script type="module" src="/build/{{ $jsFile }}"></script>
    @else
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @endif
</head>
<body class="bg-[#121414] text-[#e2e2e2] min-h-screen font-sans selection:bg-[#ffe9b0] selection:text-[#241a00] antialiased overflow-x-hidden">
    <div id="root">
        <!-- Initial luxury skeleton while React hydration mounts -->
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #121414; color: #ffe9b0; font-family: sans-serif;">
            <div style="text-align: center;">
                <img src="/logo.svg" alt="AnimeStop" style="height: 48px; margin: 0 auto 16px;" onerror="this.style.display='none'">
                <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">ANIMESTOP</div>
                <div style="font-size: 14px; color: #d0c5af; margin-top: 8px;">Loading premium anime experience...</div>
            </div>
        </div>
    </div>
</body>
</html>
