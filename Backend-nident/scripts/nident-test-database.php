<?php

require dirname(__DIR__).'/vendor/autoload.php';
$env = Dotenv\Dotenv::createArrayBacked(dirname(__DIR__))->load();
$source = $env['DB_DATABASE'];
$target = 'nident_testing';
if ($source !== 'nident' || $source === $target) { throw new RuntimeException('La base origen no está autorizada.'); }
$pdo = new PDO('mysql:host='.$env['DB_HOST'].';port='.($env['DB_PORT'] ?? 3306).';dbname='.$source, $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('CREATE DATABASE IF NOT EXISTS `nident_testing` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
$pdo->exec('SET FOREIGN_KEY_CHECKS=0');
foreach (['users', 'sistema_menu', 'seguridad_perfil', 'seguridad_roles', 'seguridad_roles_perfil', 'seguridad_perfil_users', 'seguridad_roles_menu'] as $table) {
    $ddl = $pdo->query('SHOW CREATE TABLE `'.$table.'`')->fetch(PDO::FETCH_NUM)[1];
    $ddl = preg_replace('/^CREATE TABLE `'.preg_quote($table, '/').'`/', 'CREATE TABLE IF NOT EXISTS `nident_testing`.`'.$table.'`', $ddl);
    $pdo->exec($ddl);
}
$pdo->exec('SET FOREIGN_KEY_CHECKS=1');
foreach (['DB_DATABASE' => $target, 'NIDENT_DATABASE' => $target, 'NIDENT_MODE' => 'true', 'APP_ENV' => 'testing', 'CACHE_DRIVER' => 'array', 'MAIL_MAILER' => 'array'] as $key => $value) {
    putenv($key.'='.$value); $_ENV[$key] = $value; $_SERVER[$key] = $value;
}
$app = require dirname(__DIR__).'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$status = $kernel->call('nident:install');
echo $kernel->output();
if ($status !== 0 || ! Illuminate\Support\Facades\Schema::hasTable('mail_templates') || Illuminate\Support\Facades\DB::table('mail_templates')->count() !== 8) {
    fwrite(STDERR, "La instalación aislada no se completó. No ejecutar PHPUnit sobre esta base.\n");
    exit(1);
}
echo "Base de pruebas aislada preparada, sin copiar usuarios ni datos operativos.\n";
exit($status);
