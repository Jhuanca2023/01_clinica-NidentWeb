<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Services\Nident\RequestMailer;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ClaimController extends Controller
{
    public function store(Request $request, RequestMailer $mailer)
    {
        $data = $request->validate(['service_kind' => 'nullable|in:producto,servicio', 'guardian_email' => 'nullable|required_if:minor,true|email:rfc|max:180', 'guardian_phone' => 'nullable|required_if:minor,true|string|max:40', 'guardian_address' => 'nullable|required_if:minor,true|string|max:300', 'request_id' => 'required|uuid', 'type' => 'required|in:reclamo,queja', 'name' => 'required|string|min:3|max:150', 'email' => 'required|email:rfc|max:180', 'phone' => 'required|string|max:40', 'document_type' => 'required|in:DNI,CE,PASAPORTE,RUC', 'document_number' => 'required|string|min:6|max:30', 'address' => 'required|string|max:300', 'minor' => 'required|boolean', 'guardian' => 'nullable|required_if:minor,true|string|max:180', 'service' => 'required|string|max:300', 'amount' => 'nullable|numeric|min:0|max:9999999999.99', 'detail' => 'required|string|min:15|max:6000', 'requested_solution' => 'required|string|min:5|max:6000', 'privacy' => 'accepted', 'website' => 'nullable|string|max:0', 'attachments' => 'nullable|array|max:3', 'attachments.*' => 'file|mimes:pdf,jpg,jpeg,png|max:5120']);
        $data['minor'] = (bool) $data['minor'];
        $data['service_kind'] = $data['service_kind'] ?? 'servicio';
        $values = collect($data)->except(['request_id', 'privacy', 'website', 'attachments'])->all();
        $fileHashes = array_map(fn ($file) => hash_file('sha256', $file->getRealPath()), $request->file('attachments', []));
        $hash = hash('sha256', json_encode([$values, $fileHashes], JSON_UNESCAPED_UNICODE));
        $existing = DB::table('nident_claims')->where('request_id', $data['request_id'])->first();
        $paths = [];
        if ($existing) {
            abort_unless(hash_equals($existing->request_hash, $hash), 409, 'La solicitud ya se utilizó con otro contenido.');
        }
        if (! $existing) {
            try {
                DB::transaction(function () use ($data, $values, $hash, $request, &$paths) {
                    $attachments = [];
                    foreach ($request->file('attachments', []) as $file) {
                        $extension = match ($file->getMimeType()) {
                            'application/pdf' => 'pdf','image/jpeg' => 'jpg','image/png' => 'png',default => abort(422, 'Formato de archivo no permitido.')
                        };
                        $path = $file->storeAs('nident-claims/'.$data['request_id'], bin2hex(random_bytes(16)).'.'.$extension, 'local');
                        $paths[] = $path;
                        $attachments[] = ['path' => $path, 'name' => mb_substr(basename($file->getClientOriginalName()), 0, 160), 'mime' => $file->getMimeType()];
                    }DB::table('nident_claims')->insert($values + ['request_id' => $data['request_id'], 'request_hash' => $hash, 'reference' => 'NID-'.strtoupper(bin2hex(random_bytes(8))), 'attachments' => json_encode($attachments), 'created_at' => now(), 'updated_at' => now()]);
                });
            } catch (\Throwable $exception) {
                if ($paths) {
                    Storage::disk('local')->delete($paths);
                }if (! $exception instanceof UniqueConstraintViolationException) {
                    throw $exception;
                }$existing = DB::table('nident_claims')->where('request_id', $data['request_id'])->first();
                abort_unless($existing && hash_equals($existing->request_hash, $hash), 409, 'La solicitud ya se utilizó con otro contenido.');
            }
        }
        $row = DB::table('nident_claims')->where('request_id', $data['request_id'])->first();
        $notification = $mailer->notify('claim_received', $row->email, ['nombre' => $row->name, 'codigo' => $row->reference, 'tipo' => $row->type, 'detalle' => $row->detail, 'pedido' => $row->requested_solution], 'claim:'.$row->request_id.':receipt', $row->reference);

        return response()->json(['result' => ['reference' => $row->reference, 'sheet_number' => str_pad((string) $row->id, 6, '0', STR_PAD_LEFT), 'registered_at' => $row->created_at, 'notification' => $notification, 'tracking_url' => '/consultar-solicitud?ref='.$row->reference], 'message' => 'Tu solicitud quedó registrada. Conserva tu constancia y la referencia para consultarla.'], 201);
    }

    public function index(Request $request)
    {
        $data = $request->validate(['status' => 'nullable|in:received,reviewing,answered', 'search' => 'nullable|string|max:120']);
        $query = DB::table('nident_claims');
        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }if (! empty($data['search'])) {
            $query->where(fn ($q) => $q->where('reference', 'like', '%'.$data['search'].'%')->orWhere('name', 'like', '%'.$data['search'].'%'));
        }

return response()->json(['result' => $query->latest('id')->paginate(20)->through(function ($row) {
            $row->attachments = array_map(fn ($file, $index) => ['index' => $index, 'name' => $file['name']], json_decode($row->attachments, true), array_keys(json_decode($row->attachments, true)));

            return $row;
        })]);
    }

    public function update(Request $request, int $claim, RequestMailer $mailer)
    {
        $data = $request->validate(['version' => 'required|integer|min:1', 'status' => 'required|in:received,reviewing,answered', 'response' => 'nullable|required_if:status,answered|string|min:5|max:6000']);

        return DB::transaction(function () use ($request, $claim, $data, $mailer) {
            $row = DB::table('nident_claims')->where('id', $claim)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_unless($row->version === $data['version'], 409, 'La reclamación cambió en otra sesión. Recarga antes de guardar.');
            abort_if($row->status === 'answered' && $data['status'] !== 'answered', 422, 'La solicitud ya tiene una respuesta registrada.');
            $values = $data + ['handled_by' => $request->user('api')->id, 'updated_at' => now()];
            $values['version'] = $row->version + 1;
            if ($data['status'] === 'answered') {
                $values['answered_at'] = now();
            }DB::table('nident_claims')->where('id', $claim)->update($values);
            if ($data['status'] === 'answered' && ($row->status !== 'answered' || $row->response !== $data['response'])) {
                $mailer->notify('claim_updated', $row->email, ['nombre' => $row->name, 'codigo' => $row->reference, 'respuesta' => $data['response']], 'claim:'.$row->request_id.':answer:'.$values['version'], $row->reference);
            }

return response()->json(['result' => ['version' => $values['version'], 'notification' => $mailer->status($row->reference)]]);
        });
    }

    public function attachment(int $claim, int $attachment)
    {
        $row = DB::table('nident_claims')->where('id', $claim)->first();
        abort_unless($row, 404);
        $file = json_decode($row->attachments, true)[$attachment] ?? null;
        abort_unless($file && Storage::disk('local')->exists($file['path']), 404);

        return response()->download(Storage::disk('local')->path($file['path']),preg_replace('/[^a-zA-Z0-9._-]/','_',$file['name']),['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}
