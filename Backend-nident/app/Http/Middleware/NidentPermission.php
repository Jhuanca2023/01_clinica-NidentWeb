<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NidentPermission
{
    public const AREAS = ['reservations' => 'Reservas', 'attention' => 'Mensajes de contacto', 'claims' => 'Libro de Reclamaciones', 'site' => 'Contenido del sitio', 'catalog' => 'Productos de la tienda', 'mail' => 'Correos y plantillas'];

    public const PATHS = ['reservations' => '/admin/reservas', 'attention' => '/admin/mensajes', 'claims' => '/admin/reclamaciones', 'site' => '/admin/sitio', 'catalog' => '/admin/productos', 'mail' => '/admin/correos'];

    public static function allows($user, string $area): bool
    {
        if (! $user || $user->Activo !== 'S') {
            return false;
        }
        if ($user->es_administrador_principal) {
            return true;
        }
        $path = self::PATHS[$area] ?? null;
        if (! $path) {
            return false;
        }

        return DB::table('seguridad_perfil_users as pu')
            ->join('seguridad_perfil as p', 'p.id_perfil', '=', 'pu.id_perfil')
            ->join('seguridad_roles_perfil as rp', 'rp.id_perfil', '=', 'p.id_perfil')
            ->join('seguridad_roles as r', 'r.id_roles', '=', 'rp.id_roles')
            ->join('seguridad_roles_menu as rm', 'rm.id_roles', '=', 'r.id_roles')
            ->join('sistema_menu as m', 'm.id_menu', '=', 'rm.id_menu')
            ->where('pu.id_usuario', $user->id)->where('p.Activo', 'S')
            ->where('r.Activo', 'S')->where('m.Activo', 'S')->where('m.url', $path)->exists();
    }

    public function handle(Request $request, Closure $next, string $area)
    {
        abort_unless(self::allows($request->user('api'), $area), 403, 'No tienes permiso para administrar este módulo.');

        return $next($request);
    }
}
