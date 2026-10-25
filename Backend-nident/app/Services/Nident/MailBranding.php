<?php

namespace App\Services\Nident;

use App\Models\Nident\MailSetting;

class MailBranding
{
    public static function defaults(): array
    {
        return ['name' => 'Nident', 'logo' => '/email-assets/nident-logo.png', 'logo_alt' => 'Nident · Odontología', 'banner' => '/email-assets/nident-banner.jpg', 'banner_alt' => 'Un espacio para cuidar tu sonrisa', 'tagline' => 'Sonríe a tu manera. Te acompañamos.', 'footer_title' => 'Estamos para ayudarte.', 'footer_text' => 'Si tienes alguna consulta sobre esta comunicación, contacta al equipo de Nident.', 'address' => '', 'phone' => '', 'email' => '', 'website' => '', 'links' => []];
    }

    public static function current(): array
    {
        return array_replace(self::defaults(), MailSetting::find(1)?->branding ?? []);
    }
}
