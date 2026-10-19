<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Services\Nident\MailOutbox;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    public function store(Request $request, MailOutbox $outbox)
    {
        $data = $request->validate([
            'request_id' => 'required|uuid', 'nombre' => 'required|string|min:3|max:100',
            'correo' => 'required|email:rfc|max:120', 'telefono' => 'nullable|string|max:20',
            'asunto' => 'required|string|max:150', 'sede' => 'nullable|string|max:60',
            'mensaje' => 'required|string|min:15|max:2000', 'acepto_privacidad' => 'accepted',
            'website' => 'nullable|string|max:0',
        ]);
        $canonical = [];
        foreach (['nombre', 'correo', 'telefono', 'asunto', 'sede', 'mensaje'] as $key) {
            $canonical[$key] = $data[$key] ?? '';
        }
        $hash = hash('sha256', json_encode($canonical, JSON_UNESCAPED_UNICODE));
        $existing = DB::table('web_contacto_mensaje')->where('nident_request_id', $data['request_id'])->first();
        if ($existing) {
            abort_unless(hash_equals($existing->nident_request_hash, $hash), 409, 'La solicitud ya se utilizó con otro contenido.');
        }
        try {
            DB::transaction(function () use ($data, $hash) {
                DB::table('web_contacto_mensaje')->insert([
                    'nombre' => $data['nombre'], 'apellido' => '', 'email' => $data['correo'],
                    'asunto' => $data['asunto'], 'producto_interes' => $data['sede'] ?? 'Orientación general',
                    'fecha_mensaje' => now()->toDateString(), 'telefono' => $data['telefono'] ?? '',
                    'mensaje' => $data['mensaje'], 'email_enviado' => 'N',
                    'nident_request_id' => $data['request_id'], 'nident_request_hash' => $hash,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            });
        } catch (UniqueConstraintViolationException $exception) {
            $existing = DB::table('web_contacto_mensaje')->where('nident_request_id', $data['request_id'])->first();
            abort_unless($existing && hash_equals($existing->nident_request_hash, $hash), 409, 'La solicitud ya se utilizó con otro contenido.');
        }
        // Contact persistence is independent of mail. A retry repairs any missing outbox entry.
        $settings = MailSetting::find(1);
        if ($settings?->enabled) {
            try {
                if (MailTemplate::where('key', 'contact_received')->whereNotNull('published')->exists()) {
                    $outbox->enqueue('contact_received', $data['correo'], ['nombre' => $data['nombre']], 'contact:'.$data['request_id'].':receipt');
                }
                if ($settings->contact_to && MailTemplate::where('key', 'contact_notification')->whereNotNull('published')->exists()) {
                    $outbox->enqueue('contact_notification', $settings->contact_to, ['nombre' => $data['nombre'], 'codigo' => $data['request_id']], 'contact:'.$data['request_id'].':staff');
                }
            } catch (\Throwable $exception) {
                Log::warning('Nident contact mail pending', ['request_id' => $data['request_id'], 'error_code' => class_basename($exception)]);
            }
        }

        return $this->receipt($data['request_id']);
    }

    private function receipt(string $id)
    {
        return response()->json(['success' => true, 'message' => 'Tu mensaje quedó registrado. El equipo de Nident podrá revisarlo desde el panel.', 'result' => ['reference' => 'NID-'.strtoupper(substr(str_replace('-', '', $id), 0, 10))]], 201);
    }

    public function index()
    {
        return response()->json(['success' => true, 'result' => DB::table('web_contacto_mensaje')->whereNotNull('nident_request_id')->latest('id')->paginate(20)]);
    }

    public function read(int $message)
    {
        $query = DB::table('web_contacto_mensaje')->where('id', $message)->whereNotNull('nident_request_id');
        abort_unless((clone $query)->exists(), 404);
        $query->update(['nident_read_at' => now(), 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }
}
