<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Models\Nident\MailSetting;
use App\Models\Nident\MailTemplate;
use App\Services\Nident\MailOutbox;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReservationController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate(['request_id' => 'required|uuid', 'name' => 'required|string|min:3|max:120', 'email' => 'required|email:rfc|max:180', 'phone' => 'required|string|min:6|max:40', 'treatment' => 'required|string|max:120', 'branch' => 'required|string|max:120', 'preferred_date' => 'required|date_format:Y-m-d|after_or_equal:'.now('America/Lima')->toDateString().'|before_or_equal:'.now('America/Lima')->addMonths(6)->toDateString(), 'preferred_time' => 'required|date_format:H:i', 'privacy' => 'accepted', 'website' => 'nullable|string|max:0']);
        $values = collect($data)->except(['request_id', 'privacy', 'website'])->all();
        $hash = hash('sha256', json_encode($values, JSON_UNESCAPED_UNICODE));
        try {
            DB::table('nident_reservations')->insert($values + ['request_id' => $data['request_id'], 'request_hash' => $hash, 'code' => 'NID-'.strtoupper(bin2hex(random_bytes(6))), 'created_at' => now(), 'updated_at' => now()]);
        } catch (UniqueConstraintViolationException $exception) {
            $existing = DB::table('nident_reservations')->where('request_id', $data['request_id'])->first();
            abort_unless($existing && hash_equals($existing->request_hash, $hash), 409, 'La referencia ya se utilizó con otro contenido.');
        }
        $row = DB::table('nident_reservations')->where('request_id', $data['request_id'])->first();

        return response()->json(['result' => ['code' => $row->code], 'message' => 'Recibimos tu solicitud. La clínica confirmará la disponibilidad; todavía no es una cita confirmada.'], 201);
    }

    public function index(Request $request)
    {
        $data = $request->validate(['status' => 'nullable|in:pending,confirmed,cancelled,completed', 'date' => 'nullable|date_format:Y-m-d', 'search' => 'nullable|string|max:120']);
        $query = DB::table('nident_reservations');
        if (! empty($data['status'])) {
            $query->where('status', $data['status']);
        }
        if (! empty($data['date'])) {
            $query->where('preferred_date', $data['date']);
        }
        if (! empty($data['search'])) {
            $query->where(function ($q) use ($data) {
                $q->where('code', 'like', '%'.$data['search'].'%')->orWhere('name', 'like', '%'.$data['search'].'%');
            });
        }

        return response()->json(['result' => $query->orderByDesc('id')->paginate(20)]);
    }

    public function update(Request $request, int $reservation, MailOutbox $outbox)
    {
        $data = $request->validate(['version' => 'required|integer|min:1', 'status' => 'required|in:pending,confirmed,cancelled,completed', 'preferred_date' => 'required|date_format:Y-m-d', 'preferred_time' => 'required|date_format:H:i', 'internal_note' => 'present|nullable|string|max:2000']);

        return DB::transaction(function () use ($data, $reservation, $outbox, $request) {
            $row = DB::table('nident_reservations')->where('id', $reservation)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_unless($row->version === $data['version'], 409, 'La reserva cambió en otra sesión. Recarga para revisarla.');
            $allowed = ['pending' => ['pending', 'confirmed', 'cancelled'], 'confirmed' => ['confirmed', 'cancelled', 'completed'], 'cancelled' => ['cancelled'], 'completed' => ['completed']];
            abort_unless(in_array($data['status'], $allowed[$row->status], true), 422, 'Esta reserva ya está cerrada.');
            if ($data['status'] === 'confirmed') {
                abort_if(now('America/Lima')->format('Y-m-d H:i') > $data['preferred_date'].' '.$data['preferred_time'], 422, 'No puedes confirmar una fecha pasada.');
            }
            DB::table('nident_reservations')->where('id', $reservation)->update([...$data, 'version' => $row->version + 1, 'updated_at' => now()]);
            $changedSchedule = $data['preferred_date'] !== $row->preferred_date || $data['preferred_time'] !== $row->preferred_time;
            if (($data['status'] !== $row->status || ($changedSchedule && $data['status'] === 'confirmed')) && in_array($data['status'], ['confirmed', 'cancelled'], true) && MailSetting::find(1)?->enabled) {
                $key = 'appointment_'.$data['status'];
                if (MailTemplate::where('key', $key)->whereNotNull('published')->exists()) {
                    $outbox->enqueue($key, $row->email, ['nombre' => $row->name, 'codigo' => $row->code, 'fecha' => $data['preferred_date'], 'hora' => $data['preferred_time'], 'tratamiento' => $row->treatment, 'sede' => $row->branch], 'reservation:'.$row->id.':'.($row->version + 1), $request->user('api')->id);
                }
            }

            return response()->json(['result' => DB::table('nident_reservations')->where('id',$reservation)->first()]);
        });
    }
}
