<?php

return [
    'enabled' => (bool) env('NIDENT_MODE', false),
    'database' => env('NIDENT_DATABASE', 'nident'),
    'frontend_url' => env('NIDENT_FRONTEND_URL', 'http://localhost:4321'),
    'allowed_origins' => array_filter(explode(',', env('NIDENT_ALLOWED_ORIGINS', 'http://localhost:4321,http://127.0.0.1:4321'))),
    'legacy_scheduler' => (bool) env('NIDENT_LEGACY_SCHEDULER', false),
];
