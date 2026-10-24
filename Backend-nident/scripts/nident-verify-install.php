<?php

// Clean install: only source-controlled DDL and demo CMS defaults, no source records.
require dirname(__DIR__).'/vendor/autoload.php';
$env = Dotenv\Dotenv::createArrayBacked(dirname(__DIR__))->load();
$target = 'nident_install_check_'.gmdate('Ymd_His').'_'.bin2hex(random_bytes(2));
$pdo = new PDO('mysql:host='.$env['DB_HOST'].';port='.($env['DB_PORT'] ?? 3306), $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE `'.$target.'` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
if (in_array('--cloned-schema', $argv, true)) {
    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
    foreach (['users', 'sistema_menu', 'seguridad_perfil', 'seguridad_roles', 'seguridad_roles_perfil', 'seguridad_perfil_users', 'seguridad_roles_menu'] as $table) {
        $ddl = $pdo->query('SHOW CREATE TABLE `'.$env['DB_DATABASE'].'`.`'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
        $ddl = preg_replace('/^CREATE TABLE `'.preg_quote($table, '/').'`/', 'CREATE TABLE `'.$target.'`.`'.$table.'`', $ddl);
        $pdo->exec($ddl);
    }
    $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
}
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
$result['collections']=$db::table('cms_collections')->count();
$result['reviews']=count(json_decode($db::table('cms_collections')->where('key','reviews')->value('published'),true)['items']);
$result['plans']=count(json_decode($db::table('cms_collections')->where('key','plans')->value('published'),true)['items']);
echo json_encode($result, JSON_PRETTY_PRINT).PHP_EOL;
exit($result['pages'] === 28 && $result['templates'] === 8 && $result['users'] === 0 && $result['collections']===3 && $result['reviews']===6 && $result['plans']===6 ? 0 : 1);
