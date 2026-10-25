<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Services\Nident\RequestMailer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TrackingController extends Controller
{
    public function lookup(Request $request, RequestMailer $mailer)
    {
        $data = $request->validate(['reference' => ['required', 'string', 'max:30', 'regex:/^NID-[A-Fa-f0-9]{10,20}$/'], 'email' => 'required|email:rfc|max:180']);
        $reference = strtoupper($data['reference']);
        $email = strtolower(trim($data['email']));
        $result = null;
        $row = DB::table('nident_reservations')->where('code', $reference)->where('email', $email)->first();
        if ($row) {
            $result = ['type' => 'reservation', 'reference' => $reference, 'status' => $row->status, 'registered_at' => $row->created_at, 'date' => $row->preferred_date, 'time' => $row->preferred_time];
        }
        if (! $result) {
            $row = DB::table('web_contacto_mensaje')->where('nident_reference', $reference)->where('email', $email)->whereNotNull('nident_request_id')->first();
            if ($row) {
                $result = ['type' => 'contact', 'reference' => $reference, 'status' => $row->nident_read_at ? 'reviewed' : 'received', 'registered_at' => $row->created_at];
            }
        }
        if (! $result) {
            $row = DB::table('nident_claims')->where('reference', $reference)->where('email', $email)->first();
            if ($row) {
                $result = ['type' => 'claim', 'reference' => $reference, 'status' => $row->status, 'registered_at' => $row->created_at, 'answered_at' => $row->answered_at, 'reviewing_at' => $row->reviewing_at, 'updated_at' => $row->updated_at, 'number' => 'REC-'.str_pad((string) $row->id, 4, '0', STR_PAD_LEFT), 'claim_type' => $row->type, 'outcome' => $row->outcome];
                if ($row->status === 'answered') {
                    $result['response'] = $row->response;
                }
            }
        }
        abort_unless($result, 404, 'No encontramos una solicitud con esos datos. Revisa la referencia y el correo que registraste.');
        $result['notification'] = $mailer->status($reference);

        return response()->json(['result' => $result])->header('Cache-Control', 'private, no-store');
    }
}
