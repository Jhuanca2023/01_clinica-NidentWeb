<?php

namespace Database\Seeders;

use App\Http\Middleware\NidentPermission;
use App\Models\Nident\MailTemplate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NidentOperationsSeeder extends Seeder
{
    public function run(): void
    {
        foreach (NidentPermission::PATHS as $area => $path) {
            if (! DB::table('sistema_menu')->where('url', $path)->exists()) {
                DB::table('sistema_menu')->insert(['url' => $path, 'nombre' => NidentPermission::AREAS[$area].' — Nident', 'Activo' => 'S', 'orden' => 1, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
        foreach (['Recepción Nident' => ['reservations', 'attention'], 'Contenido Nident' => ['site', 'catalog'], 'Atención de reclamos Nident' => ['claims']] as $name => $areas) {
            $role = DB::table('seguridad_roles')->where('nombre', $name)->first();
            if (! $role) {
                $id = DB::table('seguridad_roles')->insertGetId(['nombre' => $name, 'Activo' => 'S', 'requiere_2fa' => false, 'nident_version' => 1, 'created_at' => now(), 'updated_at' => now()]);
                foreach ($areas as $area) {
                    DB::table('seguridad_roles_menu')->insert(['id_roles' => $id, 'id_menu' => DB::table('sistema_menu')->where('url', NidentPermission::PATHS[$area])->value('id_menu')]);
                }
            } else {
                $id = $role->id_roles;
            }
            if (! DB::table('seguridad_perfil')->where('nombre', $name)->exists()) {
                $profile = DB::table('seguridad_perfil')->insertGetId(['nombre' => $name, 'Activo' => 'S', 'nident_version' => 1, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('seguridad_roles_perfil')->insert(['id_perfil' => $profile, 'id_roles' => $id, 'created_at' => now()]);
            }
        }
        $definitions = [
            'appointment_requested' => ['Solicitud de cita recibida', 'Recibimos tu solicitud · {{codigo}}', 'Estamos preparando tu próxima visita', 'Hola {{nombre}}, recibimos tu solicitud de {{tratamiento}} para el {{fecha}} a las {{hora}} en {{sede}}. Todavía no es una cita confirmada; el equipo revisará la disponibilidad. Tu referencia es {{codigo}}. Puedes consultar su estado en la sección Consultar solicitud de nuestra web.', ['nombre', 'codigo', 'fecha', 'hora', 'tratamiento', 'sede']],
            'claim_updated' => ['Respuesta de reclamación', 'Respuesta a tu solicitud · {{codigo}}', 'Tu solicitud tiene una respuesta', 'Hola {{nombre}}, esta es la respuesta a la solicitud {{codigo}}:\n\n{{respuesta}}', ['nombre', 'codigo', 'respuesta']],
        ];
        foreach ($definitions as $key => [$name,$subject,$heading,$text,$variables]) {
            MailTemplate::firstOrCreate(['key' => $key], ['name' => $name, 'variables' => $variables, 'draft' => ['subject' => $subject, 'preheader' => $heading, 'accent' => '#7258b6', 'footer' => "Nident · Atención al cliente.\nConserva esta comunicación para el seguimiento.", 'blocks' => [['type' => 'heading', 'text' => $heading, 'url' => '', 'alt' => ''], ['type' => 'text', 'text' => str_replace('\\n', "\n", $text), 'url' => '', 'alt' => ''], ['type' => 'divider', 'text' => '', 'url' => '', 'alt' => ''], ['type' => 'text', 'text' => 'Puedes consultar la referencia y el correo registrado desde Consultar solicitud en nuestra web.', 'url' => '', 'alt' => '']]]]);
        }
        foreach (['contact_received' => ['nombre', 'codigo'], 'claim_received' => ['nombre', 'codigo', 'tipo', 'detalle', 'pedido']] as $key => $variables) {
            $template = MailTemplate::where('key', $key)->first();
            if (! $template) {
                continue;
            }$template->variables = array_values(array_unique(array_merge($template->variables, $variables)));
            if ($template->version === 1 && ! $template->published) {
                $draft = $template->draft;
                if ($key === 'contact_received') {
                    $draft['blocks'][1]['text'] = 'Hola {{nombre}}, recibimos tu mensaje. Tu referencia es {{codigo}}. El equipo lo revisará para responderte por el canal indicado. Puedes consultar su estado con la referencia y tu correo en nuestra web.';
                } else {
                    $draft['blocks'][1]['text'] = "Hola {{nombre}}, registramos tu {{tipo}} con referencia {{codigo}}.\n\nDetalle:\n{{detalle}}\n\nSolicitud del consumidor:\n{{pedido}}\n\nConserva esta comunicación como copia de tu solicitud.";
                }$template->draft = $draft;
            }$template->save();
        }
        if (! DB::table('cms_collections')->where('key', 'products')->exists()) {
            $seed = json_decode(file_get_contents(__DIR__.'/data/nident-products.json'), true);
            $json = json_encode(['items' => $seed], JSON_UNESCAPED_UNICODE);
            DB::table('cms_collections')->insert(['key' => 'products', 'draft' => $json, 'published' => $json, 'version' => 1, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
