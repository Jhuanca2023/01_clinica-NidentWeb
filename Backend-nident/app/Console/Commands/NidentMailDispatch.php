<?php

namespace App\Console\Commands;

use App\Services\Nident\MailOutbox;
use Illuminate\Console\Command;

class NidentMailDispatch extends Command
{
    protected $signature = 'nident:mail-dispatch';

    protected $description = 'Encola entregas pendientes desde la outbox Nident.';

    public function handle(MailOutbox $outbox): int
    {
        $this->info('Entregas encoladas: '.$outbox->dispatchPending());

        return self::SUCCESS;
    }
}
