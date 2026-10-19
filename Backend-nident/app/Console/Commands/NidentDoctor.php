<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class NidentDoctor extends Command
{
    protected $signature = 'nident:doctor';

    protected $description = 'Verifica límites de entorno antes de operar Nident.';

    public function handle(): int
    {
        $errors = [];
        if (! config('nident.enabled')) {
            $errors[] = 'Activa NIDENT_MODE para este despliegue.';
        }
        if (! config('app.key')) {
            $errors[] = 'Falta APP_KEY. No regeneres una clave existente sin un plan para sus datos cifrados.';
        }
        if (! config('jwt.secret')) {
            $errors[] = 'Falta JWT_SECRET.';
        }
        if (app()->environment('production')) {
            if (config('app.debug')) {
                $errors[] = 'APP_DEBUG debe estar desactivado en producción.';
            }
            if (version_compare(app()->version(), '12.0.0', '<')) {
                $errors[] = 'Actualiza Laravel a una rama con soporte antes de producción; la base heredada Laravel 10 no se habilita como producción.';
            }
        }
        foreach ($errors as $message) {
            $this->error($message);
        }
        if ($errors) {
            return self::FAILURE;
        }
        $this->info('Configuración Nident verificada para '.app()->environment().'.');

        return self::SUCCESS;
    }
}
