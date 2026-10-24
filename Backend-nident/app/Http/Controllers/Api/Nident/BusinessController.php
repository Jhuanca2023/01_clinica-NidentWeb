<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BusinessController extends Controller
{
    public function show()
    {
        return response()->json(['result' => DB::table('nident_business_settings')->find(1)]);
    }

    public function save(Request $request)
    {
        $data = $request->validate(['version' => 'required|integer|min:1', 'commercial_name' => 'required|string|max:120', 'legal_name' => 'required|string|max:180', 'tax_id' => 'required|digits:11', 'address' => 'required|string|max:300', 'email' => 'required|email:rfc|max:180']);
        $version = $data['version'];
        $data['version']++;
        abort_unless(DB::table('nident_business_settings')->where('id', 1)->where('version', $version)->update($data + ['updated_at' => now()]), 409, 'Los datos cambiaron. Recarga antes de guardar.');

        return $this->show();
    }
}
