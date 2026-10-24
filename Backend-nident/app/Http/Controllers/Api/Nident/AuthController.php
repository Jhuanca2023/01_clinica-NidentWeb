<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Http\Middleware\NidentPermission;
use App\Models\User;
use App\Services\Auth\AuthTwoFactorService;
use App\Services\Seguridad\UsuarioAuthConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate(['email' => 'required|email|max:180', 'password' => 'required|string|max:200']);
        $user = User::where('email', $data['email'])->where('Activo', 'S')->first();
        abort_unless($user && Hash::check($data['password'], $user->password), 422, 'El correo o la contraseña no son correctos.');
        try {
            app(UsuarioAuthConfigService::class)->assertMetodoPermitido($user, 'local');
        } catch (\RuntimeException $exception) {
            abort(403, 'El acceso con contraseña no está habilitado para esta cuenta.');
        }
        abort_unless($user->es_administrador_principal || collect(array_keys(NidentPermission::AREAS))->contains(fn ($area) => NidentPermission::allows($user, $area)), 403, 'Tu cuenta no tiene acceso al panel Nident.');

        return response()->json(app(AuthTwoFactorService::class)->respuestaLoginOChallenge($user, false, $request->ip()));
    }

    public function me(Request $request)
    {
        $user = $request->user('api');
        abort_unless($user && $user->Activo === 'S', 403);

        return response()->json(['success' => true, 'result' => [
            'id' => $user->id, 'name' => $user->name, 'email' => $user->email,
            'permissions' => collect(array_merge(array_keys(NidentPermission::AREAS), ['security']))->mapWithKeys(fn ($area) => [$area => NidentPermission::allows($user, $area)]),
        ]]);
    }
}
