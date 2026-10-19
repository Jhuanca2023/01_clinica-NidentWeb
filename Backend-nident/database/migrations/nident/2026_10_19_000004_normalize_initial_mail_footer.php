<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $original = 'Nident · Odontología para toda la familia.\nEste correo corresponde a una comunicación solicitada.';
        foreach (DB::table('mail_templates')->whereNull('published')->get() as $template) {
            $document = json_decode($template->draft, true);
            if (($document['footer'] ?? '') !== $original) {
                continue;
            }
            $document['footer'] = str_replace('\\n', "\n", $original);
            DB::table('mail_templates')->where('id', $template->id)->update(['draft' => json_encode($document, JSON_UNESCAPED_UNICODE)]);
        }
    }

    public function down(): void
    { /* Content normalization is retained. */
    }
};
