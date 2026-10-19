<?php

// Encrypted, local pre-migration snapshot. Never prints row data or credentials.
require dirname(__DIR__).'/vendor/autoload.php';
$env = Dotenv\Dotenv::createArrayBacked(dirname(__DIR__))->load();
if (($env['DB_DATABASE'] ?? '') !== ($env['NIDENT_DATABASE'] ?? 'nident')) {
    throw new RuntimeException('La conexión no corresponde a Nident.');
}
$pdo = new PDO('mysql:host='.$env['DB_HOST'].';port='.($env['DB_PORT'] ?? 3306).';dbname='.$env['DB_DATABASE'].';charset=utf8mb4', $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->exec('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
$pdo->beginTransaction();
$sql = "SET FOREIGN_KEY_CHECKS=0;\n";
$tables = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'")->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $table) {
    $name = '`'.str_replace('`', '``', $table).'`';
    $sql .= $pdo->query('SHOW CREATE TABLE '.$name)->fetch(PDO::FETCH_NUM)[1].";\n";
    $rows = $pdo->query('SELECT * FROM '.$name);
    while ($row = $rows->fetch(PDO::FETCH_ASSOC)) {
        $columns = implode(',', array_map(fn ($column) => '`'.str_replace('`', '``', $column).'`', array_keys($row)));
        $values = implode(',', array_map(fn ($value) => $value === null ? 'NULL' : $pdo->quote($value), array_values($row)));
        $sql .= 'INSERT INTO '.$name.' ('.$columns.') VALUES ('.$values.");\n";
    }
}
$routines = $pdo->query('SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.routines WHERE routine_schema=DATABASE()')->fetchAll(PDO::FETCH_ASSOC);
foreach ($routines as $routine) {
    $row = $pdo->query('SHOW CREATE '.$routine['ROUTINE_TYPE'].' `'.str_replace('`', '``', $routine['ROUTINE_NAME']).'`')->fetch(PDO::FETCH_ASSOC);
    $sql .= "DELIMITER ;;\n".$row['Create '.ucfirst(strtolower($routine['ROUTINE_TYPE']))].";;\nDELIMITER ;\n";
}
foreach ($pdo->query('SHOW TRIGGERS')->fetchAll(PDO::FETCH_ASSOC) as $trigger) {
    $sql .= "DELIMITER ;;\n".$pdo->query('SHOW CREATE TRIGGER `'.str_replace('`', '``', $trigger['Trigger']).'`')->fetch(PDO::FETCH_ASSOC)['SQL Original Statement'].";;\nDELIMITER ;\n";
}
$pdo->commit();
$sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
$key = hash('sha256', $env['APP_KEY'], true);
$iv = random_bytes(12);
$compressed = gzencode($sql, 9);
$ciphertext = openssl_encrypt($compressed, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
if ($ciphertext === false || gzdecode(openssl_decrypt($ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag)) !== $sql) {
    throw new RuntimeException('No se pudo verificar el cifrado del respaldo.');
}
$directory = dirname(__DIR__, 2).'/backups';
if (!is_dir($directory)) { mkdir($directory, 0700, true); }
$file = $directory.'/nident-'.gmdate('Ymd-His').'.sql.gz.enc';
file_put_contents($file, 'NIDENT1'.$iv.$tag.$ciphertext);
echo json_encode(['backup' => basename($file), 'tables' => count($tables), 'routines' => count($routines), 'encrypted' => true, 'verified_decryption' => true, 'sha256' => hash_file('sha256', $file)], JSON_PRETTY_PRINT).PHP_EOL;
