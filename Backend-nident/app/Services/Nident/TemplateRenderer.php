<?php

namespace App\Services\Nident;

use Illuminate\Validation\ValidationException;

class TemplateRenderer
{
    public function validateDocument(array $document, array $allowed): void
    {
        $strings = [$document['subject'], $document['preheader'], $document['footer']];
        foreach ($document['blocks'] as $block) {
            $strings[] = $block['text'];
            $strings[] = $block['alt'];
            $strings[] = $block['url'];
            if ($block['type'] === 'image' && str_starts_with($block['url'], '/') && MailImages::path($block['url'])) {
                continue;
            }
            if (in_array($block['type'], ['image', 'button'], true)) {
                $url = $block['url'];
                if (! preg_match('/^https:\/\//i', $url) || ! filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PASS)) {
                    throw ValidationException::withMessages(['document' => 'Las imágenes y botones requieren una URL HTTPS válida, sin credenciales.']);
                }
            }
        }
        foreach ($strings as $string) {
            preg_match_all('/\{\{\s*([a-z_]+)\s*\}\}/', $string, $matches);
            if (array_diff($matches[1], $allowed)) {
                throw ValidationException::withMessages(['document' => 'La plantilla contiene variables no permitidas.']);
            }
        }
    }

    public function render(array $document, array $variables, ?array $branding = null): array
    {
        $replace = static function (string $value) use ($variables): string {
            return preg_replace_callback('/\{\{\s*([a-z_]+)\s*\}\}/', fn ($m) => (string) ($variables[$m[1]] ?? ''), $value);
        };
        $blocks = array_map(function ($block) use ($replace) {
            $block['text'] = $replace($block['text']);
            $block['alt'] = $replace($block['alt']);

            // URLs are configuration, never patient-supplied template variables.
            return $block;
        }, $document['blocks']);
        $subject = trim(preg_replace('/[\r\n]+/', ' ', $replace($document['subject'])));

        return [
            'subject' => $subject,
            'html' => view('email.nident.template', [
                'subject' => $subject, 'preheader' => $replace($document['preheader']),
                'accent' => $document['accent'], 'blocks' => $blocks,
                'footer' => $replace($document['footer']), 'branding' => $branding ?? MailBranding::current(),
            ])->render(),
        ];
    }

    public function sample(): array
    {
        return [
            'nombre' => 'María · ejemplo', 'codigo' => 'NID-DEMO-2026',
            'fecha' => '23 de octubre de 2026', 'hora' => '10:30',
            'tratamiento' => 'Evaluación odontológica', 'sede' => 'Sede de ejemplo',
            'mensaje' => 'Este mensaje es una vista previa con datos ilustrativos.',
            'total' => 'S/ 89.00', 'tipo' => 'Reclamo', 'detalle' => 'Descripción de ejemplo de la atención recibida.', 'pedido' => 'Solicito revisar mi caso.', 'respuesta' => 'Hemos revisado tu solicitud. El equipo se comunicará contigo.',
        ];
    }
}
