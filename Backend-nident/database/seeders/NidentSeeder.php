<?php

namespace Database\Seeders;

use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Models\SeguridadAuthProveedor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NidentSeeder extends Seeder
{
    public function run(): void
    {
        SeguridadAuthProveedor::firstOrCreate(['codigo' => 'local'], ['nombre' => 'Correo y contraseña', 'descripcion' => 'Acceso local a Nident', 'is_habilitado' => true, 'is_predeterminado' => true, 'orden' => 0]);
        $data = json_decode(file_get_contents(__DIR__.'/data/nident-site.json'), true, 512, JSON_THROW_ON_ERROR);
        DB::table('cms_site_settings')->insertOrIgnore(['id' => 1, 'content' => json_encode($data['content'], JSON_UNESCAPED_UNICODE), 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
        foreach ($data['pages'] as $page) {
            DB::table('cms_pages')->insertOrIgnore($page + ['created_at' => now(), 'updated_at' => now()]);
        }
        foreach (json_decode(file_get_contents(__DIR__.'/data/nident-canvas.json'), true) as $key => $module) {
            DB::table('cms_modules')->insertOrIgnore(['key' => $key, 'draft' => '{}', 'published' => '{}', 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
        }
        $this->call(NidentCollectionsSeeder::class);
        MailSetting::firstOrCreate(['id' => 1], ['enabled' => false, 'transport' => 'array', 'from_name' => 'Nident']);
        $templates = [
            'appointment_confirmed' => ['Confirmación de cita', 'Tu cita en Nident · {{codigo}}', 'Tu cita está confirmada', "Hola {{nombre}},\nTe esperamos el {{fecha}} a las {{hora}} para {{tratamiento}} en {{sede}}.", ['nombre', 'codigo', 'fecha', 'hora', 'tratamiento', 'sede']],
            'appointment_cancelled' => ['Cancelación de cita', 'Actualización de tu cita · {{codigo}}', 'Tu cita fue cancelada', 'Hola {{nombre}}, la cita del {{fecha}} a las {{hora}} fue cancelada. Puedes comunicarte con la clínica para coordinar una nueva fecha.', ['nombre', 'codigo', 'fecha', 'hora']],
            'contact_received' => ['Recepción de contacto', 'Recibimos tu mensaje · Nident', 'Gracias por escribirnos', 'Hola {{nombre}}, recibimos tu mensaje y lo revisaremos para responderte por el canal indicado.', ['nombre']],
            'contact_notification' => ['Aviso de contacto al equipo', 'Nueva consulta · Nident', 'Hay una consulta por revisar', '{{nombre}} envió un mensaje. Ingresa al panel Nident para revisarlo. Referencia: {{codigo}}. Por privacidad, el contenido del mensaje no se incluye en este correo.', ['nombre', 'codigo']],
            'claim_received' => ['Recepción de reclamación', 'Constancia de solicitud · {{codigo}}', 'Tu solicitud quedó registrada', 'Hola {{nombre}}, tu solicitud tiene el código {{codigo}}. Conserva esta comunicación para el seguimiento.', ['nombre', 'codigo']],
            'order_received' => ['Recepción de pedido', 'Tu pedido Nident · {{codigo}}', 'Recibimos tu pedido', 'Hola {{nombre}}, registramos el pedido {{codigo}} por {{total}}. Esta comunicación no confirma un pago ni una cita.', ['nombre', 'codigo', 'total']],
        ];
        foreach ($templates as $key => [$name, $subject, $heading, $text, $variables]) {
            $block = fn ($type, $content) => ['type' => $type, 'text' => $content, 'url' => '', 'alt' => ''];
            $document = ['subject' => $subject, 'preheader' => $heading, 'accent' => '#7258b6', 'footer' => "Nident · Odontología para toda la familia.\nEste correo corresponde a una comunicación solicitada.", 'blocks' => [$block('heading', $heading), $block('text', $text), $block('divider', ''), $block('text', 'Sonríe a tu manera. Te acompañamos.')]];
            MailTemplate::firstOrCreate(['key' => $key], ['name' => $name, 'variables' => $variables, 'draft' => $document]);
        }
        // Menus integrate with existing role tables; no new user or duplicate ACL system.
        foreach (['/admin/sitio' => 'Sitio web — Nident', '/admin/correos' => 'Correos — Nident', '/admin/mensajes' => 'Mensajes — Nident', '/admin/reservas' => 'Reservas — Nident'] as $url => $name) {
            if (! DB::table('sistema_menu')->where('url', $url)->exists()) {
                DB::table('sistema_menu')->insert(['nombre' => $name, 'url' => $url, 'Activo' => 'S', 'orden' => 1, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }
}
