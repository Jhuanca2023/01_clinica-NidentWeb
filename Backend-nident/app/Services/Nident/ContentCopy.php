<?php

namespace App\Services\Nident;

class ContentCopy
{
    public static function normalizePlans(array $document): array
    {
        foreach ($document['items'] as &$item) {
            foreach ($item['sections'] as &$section) {
                $section['body'] = str_replace(
                    'No. Este sitio permite probar una reserva local de ejemplo, sin cobros ni contratación. El importe mostrado no es una oferta vigente.',
                    'Puedes solicitar una cita; la clínica revisa y confirma la disponibilidad. No se realizan cobros desde este formulario. El importe ilustrativo debe ser validado por la clínica antes de ofrecerse.',
                    $section['body']
                );
            }
            unset($section);
        }
        unset($item);

        return $document;
    }
}
