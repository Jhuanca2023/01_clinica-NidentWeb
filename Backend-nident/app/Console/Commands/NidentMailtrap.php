<?php

namespace App\Console\Commands;

use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Services\Nident\TemplateRenderer;
use Dotenv\Dotenv;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NidentMailtrap extends Command
{
    protected $signature = 'nident:mailtrap {--publish-defaults : Publica únicamente las plantillas iniciales sin ediciones}';

    protected $description = 'Configura Mailtrap Sandbox con las credenciales locales sin mostrarlas.';

    public function handle(): int
    {
        if (! config('nident.enabled') || DB::connection()->getDatabaseName() !== config('nident.database') || app()->environment('production')) {
            $this->error('Configuración detenida: se requiere la base Nident y un entorno de pruebas.');

            return self::FAILURE;
        }
        $env = Dotenv::createArrayBacked(base_path())->safeLoad();
        $specific = filled($env['MAILTRAP_USERNAME'] ?? null) && filled($env['MAILTRAP_PASSWORD'] ?? null);
        if (! $specific && ! str_contains($env['MAIL_HOST'] ?? '', 'mailtrap')) {
            $this->error('Configura MAILTRAP_USERNAME y MAILTRAP_PASSWORD del sandbox en el archivo .env.');

            return self::FAILURE;
        }$username = $specific ? $env['MAILTRAP_USERNAME'] : ($env['MAIL_USERNAME'] ?? '');
        $password = $specific ? $env['MAILTRAP_PASSWORD'] : ($env['MAIL_PASSWORD'] ?? '');
        if (! $username || ! $password) {
            $this->error('Faltan las credenciales SMTP del sandbox en .env.');

            return self::FAILURE;
        }
        $from = filter_var($env['MAIL_FROM_ADDRESS'] ?? '', FILTER_VALIDATE_EMAIL) ? $env['MAIL_FROM_ADDRESS'] : 'nident@example.test';
        DB::transaction(function () use ($username, $password, $from) {
            $settings = MailSetting::lockForUpdate()->findOrFail(1);
            $settings->fill(['enabled' => true, 'transport' => 'smtp', 'host' => 'sandbox.smtp.mailtrap.io', 'port' => 2525, 'encryption' => 'tls', 'username' => $username, 'password' => $password, 'from_name' => 'Nident', 'from_address' => $from, 'contact_to' => $settings->contact_to ?: 'equipo@example.test', 'version' => $settings->version + 1])->save();
            if ($this->option('publish-defaults')) {
                foreach (MailTemplate::whereNull('published')->where('version', 1)->get() as $template) {
                    app(TemplateRenderer::class)->validateDocument($template->draft, $template->variables);
                    $template->update(['published' => $template->draft, 'published_version' => 1, 'published_at' => now()]);
                    DB::table('mail_template_revisions')->insert(['template_id' => $template->id, 'version' => 1, 'action' => 'published', 'document' => json_encode($template->draft, JSON_UNESCAPED_UNICODE), 'created_at' => now()]);
                }
            }
        });
        $path = base_path('.env');
        $text = file_get_contents($path);
        foreach (['MAIL_MAILER' => 'smtp', 'MAIL_HOST' => 'sandbox.smtp.mailtrap.io', 'MAIL_PORT' => '2525', 'MAIL_ENCRYPTION' => 'tls', 'MAIL_FROM_NAME' => '"Nident"'] as $key => $value) {
            $line = $key.'='.$value;
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            $text = preg_match($pattern, $text) ? preg_replace_callback($pattern, fn () => $line, $text) : rtrim($text)."\n".$line."\n";
        }file_put_contents($path, $text);
        $this->info('Mailtrap Sandbox configurado. Los correos se capturan para pruebas; no se entregan a buzones reales.');

        return self::SUCCESS;
    }
}
