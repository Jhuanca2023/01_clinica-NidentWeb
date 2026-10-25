<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Http\Requests\Nident\MailBrandingRequest;
use App\Http\Requests\Nident\TemplateDocumentRequest;
use App\Models\Nident\MailDelivery;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Services\Nident\MailBranding;
use App\Services\Nident\MailOutbox;
use App\Services\Nident\TemplateRenderer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MailController extends Controller
{
    public function branding()
    {
        return response()->json(['result' => ['version' => MailSetting::findOrFail(1)->branding_version, 'branding' => MailBranding::current()]]);
    }

    public function saveBranding(MailBrandingRequest $request)
    {
        $data = $request->validated();
        DB::transaction(function () use ($data) {
            $settings = MailSetting::lockForUpdate()->findOrFail(1);
            abort_unless($settings->branding_version === $data['version'], 409, 'La identidad cambió en otra sesión. Recarga para revisarla.');
            $settings->update(['branding' => $data['branding'], 'branding_version' => $settings->branding_version + 1]);
        });

        return $this->branding();
    }

    public function previewBranding(MailBrandingRequest $request, TemplateRenderer $renderer)
    {
        $data = $request->validated();
        $template = isset($data['template_id']) ? MailTemplate::findOrFail($data['template_id']) : MailTemplate::where('key', 'appointment_requested')->firstOrFail();

        return response()->json(['result' => $renderer->render($template->draft, $renderer->sample(), $data['branding'])]);
    }

    public function index()
    {
        return response()->json(['success' => true, 'result' => MailTemplate::orderBy('id')->get()]);
    }

    public function save(TemplateDocumentRequest $request, MailTemplate $template, TemplateRenderer $renderer)
    {
        $data = $request->validated();
        $renderer->validateDocument($data['document'], $template->variables);
        DB::transaction(function () use ($request, $template, $data) {
            $locked = MailTemplate::lockForUpdate()->findOrFail($template->id);
            abort_unless($locked->version === $data['version'], 409, 'La plantilla cambió en otra sesión. Recarga antes de guardar.');
            $locked->update(['draft' => $data['document'], 'version' => $locked->version + 1, 'updated_by' => $request->user('api')->id]);
            $this->revision($locked, 'draft', $request->user('api')->id);
        });

        return response()->json(['success' => true, 'result' => $template->fresh()]);
    }

    public function publish(Request $request, MailTemplate $template)
    {
        $data = $request->validate(['version' => 'required|integer|min:1']);
        DB::transaction(function () use ($request, $template, $data) {
            $locked = MailTemplate::lockForUpdate()->findOrFail($template->id);
            abort_unless($locked->version === $data['version'], 409, 'La versión cambió. Recarga antes de publicar.');
            $locked->update(['published' => $locked->draft, 'published_version' => $locked->version, 'published_at' => now(), 'updated_by' => $request->user('api')->id]);
            $this->revision($locked, 'published', $request->user('api')->id);
        });

        return response()->json(['success' => true, 'result' => $template->fresh()]);
    }

    public function preview(TemplateDocumentRequest $request, MailTemplate $template, TemplateRenderer $renderer)
    {
        $document = $request->validated()['document'];
        $renderer->validateDocument($document, $template->variables);

        return response()->json(['success' => true, 'result' => $renderer->render($document, $renderer->sample())]);
    }

    public function settings()
    {
        $settings = MailSetting::findOrFail(1);

        return response()->json(['success' => true, 'result' => array_merge($settings->toArray(), ['has_password' => filled($settings->password)])]);
    }

    public function saveSettings(Request $request)
    {
        $data = $request->validate([
            'version' => 'required|integer|min:1', 'enabled' => 'required|boolean',
            'transport' => ['required', Rule::in(['array', 'smtp'])],
            'from_name' => ['required', 'string', 'max:120', 'not_regex:/[\r\n]/'],
            'from_address' => 'nullable|email:rfc|max:180', 'reply_to' => 'nullable|email:rfc|max:180',
            'contact_to' => 'nullable|email:rfc|max:180',
            'host' => ['nullable', 'string', 'max:180', 'regex:/^[a-zA-Z0-9.-]+$/'],
            'port' => 'required|integer|min:1|max:65535',
            'encryption' => ['required', Rule::in(['tls', 'ssl'])],
            'username' => 'nullable|string|max:180', 'password' => 'nullable|string|max:1000',
        ]);
        if ($data['enabled']) {
            abort_unless(filled($data['from_address']), 422, 'Configura un remitente antes de activar los correos.');
            if ($data['transport'] === 'smtp') {
                abort_unless(filled($data['host']), 422, 'Configura el servidor SMTP.');
            }
        }
        DB::transaction(function () use ($data) {
            $settings = MailSetting::lockForUpdate()->findOrFail(1);
            abort_unless($settings->version === $data['version'], 409, 'La configuración cambió. Recarga antes de guardar.');
            if (empty($data['password'])) {
                unset($data['password']);
            }
            $data['version']++;
            $settings->fill($data)->save();
        });

        return $this->settings();
    }

    public function test(Request $request, MailTemplate $template, MailOutbox $outbox, TemplateRenderer $renderer)
    {
        $data = $request->validate(['recipient' => 'required|email:rfc|max:180', 'request_id' => 'required|uuid']);
        abort_unless($template->published, 422, 'Publica la plantilla antes de enviar una prueba.');
        $delivery = $outbox->enqueue($template->key, $data['recipient'], $renderer->sample(), 'test:'.$request->user('api')->id.':'.$data['request_id'], $request->user('api')->id);

        return response()->json(['success' => true, 'message' => 'Prueba registrada en la cola. No se considera enviada hasta que el worker la procese.', 'result' => ['id' => $delivery->id, 'status' => $delivery->status]], 202);
    }

    public function deliveries()
    {
        return response()->json(['success' => true, 'result' => MailDelivery::select('id', 'template_id', 'template_version', 'status', 'attempts', 'sent_at', 'error_code', 'created_at', 'is_sandbox', 'transport')->latest()->limit(30)->get()]);
    }

    public function health()
    {
        $settings = MailSetting::findOrFail(1);
        $sandbox = $settings->host === 'sandbox.smtp.mailtrap.io';
        $flows = ['appointment_requested' => 'Solicitud de reserva', 'appointment_confirmed' => 'Confirmación de cita', 'appointment_cancelled' => 'Cancelación de cita', 'contact_received' => 'Acuse de contacto', 'contact_notification' => 'Aviso de contacto al equipo', 'claim_received' => 'Constancia de reclamación', 'claim_updated' => 'Respuesta de reclamación'];
        $templates = MailTemplate::all()->keyBy('key');

        return response()->json(['result' => ['enabled' => $settings->enabled, 'transport' => $settings->transport, 'sandbox' => $sandbox, 'ready' => $settings->enabled && filled($settings->from_address) && ($settings->transport === 'array' || filled($settings->host) && filled($settings->username) && filled($settings->password)), 'queued' => MailDelivery::whereIn('status', ['pending', 'queued', 'sending'])->count(), 'failed' => MailDelivery::where('status', 'failed')->count(), 'last_processed_at' => MailDelivery::whereIn('status', ['sent', 'simulated', 'failed'])->max('updated_at'), 'flows' => collect($flows)->map(fn ($name, $key) => ['key' => $key, 'name' => $name, 'published' => (bool) ($templates[$key]->published ?? false)])->values()]]);
    }

    private function revision(MailTemplate $template, string $action, int $actor): void
    {
        DB::table('mail_template_revisions')->insert(['template_id' => $template->id, 'version' => $template->version, 'document' => json_encode($template->draft, JSON_UNESCAPED_UNICODE), 'action' => $action, 'actor_id' => $actor, 'created_at' => now()]);
    }
}
