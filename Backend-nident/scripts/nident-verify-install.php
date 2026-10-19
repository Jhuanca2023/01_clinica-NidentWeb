<?php

// Clean install: only source-controlled DDL and demo CMS defaults, no source records.
require dirname(__DIR__).'/vendor/autoload.php';
$env = Dotenv\Dotenv::createArrayBacked(dirname(__DIR__))->load();
$target = 'nident_install_check_'.gmdate('Ymd_His').'_'.bin2hex(random_bytes(2));
$pdo = new PDO('mysql:host='.$env['DB_HOST'].';port='.($env['DB_PORT'] ?? 3306), $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
foreach (['DB_DATABASE' => $target, 'NIDENT_DATABASE' => $target, 'NIDENT_MODE' => 'true', 'APP_ENV' => 'testing', 'CACHE_DRIVER' => 'array', 'MAIL_MAILER' => 'array'] as $key => $value) {
    putenv($key.'='.$value); $_ENV[$key] = $value; $_SERVER[$key] = $value;
}
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$first = $kernel->call('nident:install');
if ($first !== 0) { echo $kernel->output(); exit($first); }
$second = $kernel->call('nident:install');
if ($second !== 0) { echo $kernel->output(); exit($second); }
$db = Illuminate\Support\Facades\DB::class;
$result = ['database' => $target, 'first_install' => $first, 'repeat_install' => $second, 'pages' => $db::table('cms_pages')->count(), 'templates' => $db::table('mail_templates')->count(), 'users' => $db::table('users')->count()];
echo json_encode($result, JSON_PRETTY_PRINT).PHP_EOL;
exit($result['pages'] === 28 && $result['templates'] === 6 && $result['users'] === 0 ? 0 : 1);
