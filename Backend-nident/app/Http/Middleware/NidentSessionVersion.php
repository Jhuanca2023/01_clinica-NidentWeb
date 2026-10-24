<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class NidentSessionVersion
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user('api');
        abort_unless($user && $user->Activo === 'S', 403, 'La cuenta está desactivada.');
        if ($request->bearerToken()) {
            $version = (int) auth('api')->payload()->get('nident_auth_version', 1);
            abort_unless($version === (int) ($user->nident_auth_version ?? 1), 401, 'Los accesos cambiaron. Inicia sesión nuevamente.');
        }

return $next($request);
    }
}
