<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        if (config('nident.enabled')) {
            $schedule->command('nident:mail-dispatch')->everyMinute()->withoutOverlapping();
        }
        if (!config('nident.enabled') || config('nident.legacy_scheduler')) {
            $schedule->command('notificacion:evaluar')->everyMinute();
        }
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');

        require base_path('routes/console.php');
    }
}
