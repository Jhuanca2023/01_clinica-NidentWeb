<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Services\Nident\MailOutbox;
use App\Services\Nident\RequestMailer;
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
                    'nident_reference' => 'NID-'.strtoupper(substr(str_replace('-', '', $data['request_id']), 0, 10)),
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
                if ($settings->contact_to && MailTemplate::where('key', 'contact_notification')->whereNotNull('published')->exists()) {
                    $outbox->enqueue('contact_notification', $settings->contact_to, ['nombre' => $data['nombre'], 'codigo' => 'NID-'.strtoupper(substr(str_replace('-', '', $data['request_id']), 0, 10))], 'contact:'.$data['request_id'].':staff');
                }
            } catch (\Throwable $exception) {
                Log::warning('Nident contact mail pending', ['request_id' => $data['request_id'], 'error_code' => class_basename($exception)]);
            }
        }

        return $this->receipt($data['request_id']);
    }

    private function receipt(string $id)
    {
        $row = DB::table('web_contacto_mensaje')->where('nident_request_id', $id)->first();
        $reference = $row->nident_reference;
        $notification = app(RequestMailer::class)->notify('contact_received', $row->email, ['nombre' => $row->nombre, 'codigo' => $reference], 'contact:'.$id.':receipt', $reference);

        return response()->json(['success' => true, 'message' => 'Tu mensaje quedó registrado. El equipo de Nident podrá revisarlo desde el panel.', 'result' => ['reference' => $reference, 'notification' => $notification, 'tracking_url' => '/consultar-solicitud?ref='.$reference]], 201);
    }

    public function index(Request $request)
    {
        $data = $request->validate(['search' => 'nullable|string|max:120', 'status' => 'nullable|in:unread,read', 'date_from' => 'nullable|date_format:Y-m-d', 'date_to' => 'nullable|date_format:Y-m-d', 'page' => 'nullable|integer|min:1|max:1000000', 'per_page' => 'nullable|integer|in:20,50,100']);
        abort_if(! empty($data['date_from']) && ! empty($data['date_to']) && $data['date_from'] > $data['date_to'], 422, 'La fecha final debe ser igual o posterior a la inicial.');
        $query = DB::table('web_contacto_mensaje')->whereNotNull('nident_request_id');
        if (($data['status'] ?? null) === 'unread') {
            $query->whereNull('nident_read_at');
        }
        if (($data['status'] ?? null) === 'read') {
            $query->whereNotNull('nident_read_at');
        }
        if (! empty($data['date_from'])) {
            $query->where('created_at', '>=', $data['date_from'].' 00:00:00');
        }
        if (! empty($data['date_to'])) {
            $query->where('created_at', '<=', $data['date_to'].' 23:59:59');
        }
        if (filled($data['search'] ?? null)) {
            $search = '%'.addcslashes(trim($data['search']), '%_\\').'%';
            $query->where(fn ($q) => $q->where('nombre', 'like', $search)->orWhere('email', 'like', $search)->orWhere('telefono', 'like', $search)->orWhere('asunto', 'like', $search)->orWhere('nident_reference', 'like', $search));
        }

        return response()->json(['success' => true, 'result' => $query->orderByDesc('created_at')->orderByDesc('id')->paginate($data['per_page'] ?? 20)])->header('Cache-Control', 'private, no-store');
    }

    public function read(int $message)
    {
        $query = DB::table('web_contacto_mensaje')->where('id', $message)->whereNotNull('nident_request_id');
        abort_unless((clone $query)->exists(), 404);
        $query->update(['nident_read_at' => now(), 'updated_at' => now()]);

        return response()->json(['success' => true]);
    }
}
