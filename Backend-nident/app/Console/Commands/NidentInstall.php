<?php

namespace App\Console\Commands;

use Database\Seeders\NidentSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NidentInstall extends Command
{
    protected $signature = 'nident:install';

    protected $description = 'Aplica solo migraciones Nident y sus seeds idempotentes; conserva el motor heredado.';

    public function handle(): int
    {
        $actual = DB::selectOne('SELECT DATABASE() AS name')->name;
        if (! config('nident.enabled') || $actual !== config('nident.database')) {
            $this->error('Conexión no autorizada para Nident. Revisa NIDENT_MODE y NIDENT_DATABASE.');

            return self::FAILURE;
        }
        $result = $this->call('migrate', ['--path' => 'database/migrations/nident', '--force' => true]);
        if ($result !== self::SUCCESS) {
            return $result;
        }

        return $this->call('db:seed', ['--class' => NidentSeeder::class, '--force' => true]);
    }
}
