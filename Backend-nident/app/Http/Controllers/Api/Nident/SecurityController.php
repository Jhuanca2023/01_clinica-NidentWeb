<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Http\Middleware\NidentPermission;
use App\Models\User;
use App\Services\Seguridad\UsuarioAuthConfigService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class SecurityController extends Controller
{
    private function audit(Request $request, string $action, string $type, int $id): void
    {
        DB::table('nident_security_audit')->insert(['actor_id' => $request->user('api')->id, 'action' => $action, 'target_type' => $type, 'target_id' => $id, 'created_at' => now(), 'updated_at' => now()]);
    }

    public function index()
    {
        $profiles = DB::table('seguridad_perfil')->orderBy('nombre')->get()->map(fn ($p) => ['id' => $p->id_perfil, 'name' => $p->nombre, 'active' => $p->Activo === 'S', 'version' => $p->nident_version, 'role_ids' => DB::table('seguridad_roles_perfil')->where('id_perfil', $p->id_perfil)->pluck('id_roles')->map(fn ($id) => (int) $id)->unique()->values()]);
        $roles = DB::table('seguridad_roles')->orderBy('nombre')->get()->map(function ($r) {
            $paths = DB::table('seguridad_roles_menu as rm')->join('sistema_menu as m', 'm.id_menu', '=', 'rm.id_menu')->where('rm.id_roles', $r->id_roles)->pluck('m.url')->all();

            return ['id' => $r->id_roles, 'name' => $r->nombre, 'active' => $r->Activo === 'S', 'version' => $r->nident_version, 'require_2fa' => (bool) $r->requiere_2fa, 'permissions' => array_values(array_keys(array_filter(NidentPermission::PATHS, fn ($path) => in_array($path, $paths, true))))];
        });
        $users = User::orderBy('name')->get(['id', 'name', 'email', 'Activo', 'es_administrador_principal', 'nident_auth_version'])->map(fn ($u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email, 'active' => $u->Activo === 'S', 'principal' => (bool) $u->es_administrador_principal, 'version' => $u->nident_auth_version, 'profile_ids' => DB::table('seguridad_perfil_users')->where('id_usuario', $u->id)->pluck('id_perfil')->map(fn ($id) => (int) $id)->unique()->values()]);

        return response()->json(['result' => ['users' => $users, 'profiles' => $profiles, 'roles' => $roles, 'areas' => NidentPermission::AREAS]]);
    }

    public function saveUser(Request $request, ?int $user = null)
    {
        $data = $request->validate(['name' => 'required|string|max:120', 'email' => ['required', 'email:rfc', 'max:180', Rule::unique('users', 'email')->ignore($user)], 'active' => 'required|boolean', 'profile_ids' => 'present|array|max:30', 'profile_ids.*' => 'required|integer|distinct|exists:seguridad_perfil,id_perfil', 'password' => [$user ? 'nullable' : 'required', 'string', 'min:12', 'max:128', 'confirmed', 'regex:/^(?=.*[a-zA-Z])(?=.*[0-9]).+$/s'], 'version' => $user ? 'required|integer|min:1' : 'nullable|integer', 'current_password' => 'nullable|string|max:200']);

        return DB::transaction(function () use ($request, $data, $user) {
            $row = $user ? User::lockForUpdate()->findOrFail($user) : null;
            if ($row) {
                abort_unless($row->nident_auth_version === $data['version'], 409, 'La cuenta cambió. Recarga antes de guardar.');
                abort_if($row->es_administrador_principal && ! $data['active'], 422, 'El administrador principal debe permanecer activo.');
            }
            if ($row && (int) $row->id === (int) $request->user('api')->id && filled($data['password'] ?? null)) {
                abort_unless(Hash::check($data['current_password'] ?? '', $row->password), 422, 'Confirma tu contraseña actual antes de cambiarla.');
            }
            $values = ['name' => $data['name'], 'email' => strtolower($data['email']), 'Activo' => $data['active'] ? 'S' : 'N', 'updated_at' => now()];
            if (filled($data['password'] ?? null)) {
                $values['password'] = Hash::make($data['password']);
            }
            if ($row) {
                $id = $row->id;
                $values['nident_auth_version'] = $row->nident_auth_version + 1;
                DB::table('users')->where('id', $id)->update($values);
            } else {
                $id = DB::table('users')->insertGetId($values + ['created_at' => now(), 'es_administrador_principal' => false, 'nident_auth_version' => 1, 'id_owner' => $request->user('api')->id]);
                app(UsuarioAuthConfigService::class)->guardar($id, ['permitir_local' => true, 'permitir_google' => false, 'permitir_microsoft' => false, 'requiere_2fa' => false, 'permite_2fa_voluntario' => true, 'metodo_predeterminado' => 'local']);
            }
            DB::table('seguridad_perfil_users')->where('id_usuario', $id)->delete();
            foreach (array_unique($data['profile_ids']) as $profile) {
                DB::table('seguridad_perfil_users')->insert(['id_usuario' => $id, 'id_perfil' => $profile, 'created_at' => now()]);
            }
            $this->audit($request, $row ? 'user.updated' : 'user.created', 'user', $id);

            return response()->json(['result' => ['id' => $id, 'reauthenticate' => (int) $id === (int) $request->user('api')->id]], $row ? 200 : 201);
        });
    }

    public function saveProfile(Request $request, ?int $profile = null)
    {
        $data = $request->validate(['name' => 'required|string|max:120', 'active' => 'required|boolean', 'role_ids' => 'present|array|max:40', 'role_ids.*' => 'required|integer|distinct|exists:seguridad_roles,id_roles', 'version' => $profile ? 'required|integer|min:1' : 'nullable|integer']);

        return DB::transaction(function () use ($request, $data, $profile) {
            $row = $profile ? DB::table('seguridad_perfil')->where('id_perfil', $profile)->lockForUpdate()->first() : null;
            if ($profile) {
                abort_unless($row, 404);
            }if ($row) {
                abort_unless($row->nident_version === $data['version'], 409, 'El perfil cambió. Recarga antes de guardar.');
            }$values = ['nombre' => $data['name'], 'Activo' => $data['active'] ? 'S' : 'N', 'updated_at' => now(), 'nident_version' => ($row->nident_version ?? 0) + 1];
            if ($row) {
                $id = $profile;
                DB::table('seguridad_perfil')->where('id_perfil', $id)->update($values);
            } else {
                $id = DB::table('seguridad_perfil')->insertGetId($values + ['created_at' => now()]);
            }DB::table('seguridad_roles_perfil')->where('id_perfil', $id)->delete();
            foreach ($data['role_ids'] as $role) {
                DB::table('seguridad_roles_perfil')->insert(['id_perfil' => $id, 'id_roles' => $role, 'created_at' => now()]);
            }$this->audit($request, 'profile.saved', 'profile', $id);

            return response()->json(['result' => ['id' => $id]], $row ? 200 : 201);
        });
    }

    public function saveRole(Request $request, ?int $role = null)
    {
        $data = $request->validate(['name' => 'required|string|max:120', 'active' => 'required|boolean', 'require_2fa' => 'required|boolean', 'permissions' => 'present|array', 'permissions.*' => ['required', 'distinct', Rule::in(array_keys(NidentPermission::AREAS))], 'version' => $role ? 'required|integer|min:1' : 'nullable|integer']);

        return DB::transaction(function () use ($request, $data, $role) {
            $row = $role ? DB::table('seguridad_roles')->where('id_roles', $role)->lockForUpdate()->first() : null;
            if ($role) {
                abort_unless($row, 404);
            }if ($row) {
                abort_unless($row->nident_version === $data['version'], 409, 'El rol cambió. Recarga antes de guardar.');
            }$values = ['nombre' => $data['name'], 'Activo' => $data['active'] ? 'S' : 'N', 'requiere_2fa' => $data['require_2fa'], 'updated_at' => now(), 'nident_version' => ($row->nident_version ?? 0) + 1];
            if ($row) {
                $id = $role;
                DB::table('seguridad_roles')->where('id_roles', $id)->update($values);
            } else {
                $id = DB::table('seguridad_roles')->insertGetId($values + ['created_at' => now()]);
            }$menuIds = DB::table('sistema_menu')->whereIn('url', array_values(NidentPermission::PATHS))->pluck('id_menu');
            DB::table('seguridad_roles_menu')->where('id_roles', $id)->whereIn('id_menu', $menuIds)->delete();
            foreach ($data['permissions'] as $area) {
                $menu = DB::table('sistema_menu')->where('url', NidentPermission::PATHS[$area])->where('Activo', 'S')->value('id_menu');
                abort_unless($menu, 422, 'El módulo aún no está instalado.');
                DB::table('seguridad_roles_menu')->insert(['id_roles' => $id, 'id_menu' => $menu]);
            }$this->audit($request, 'role.saved', 'role', $id);

            return response()->json(['result' => ['id' => $id]], $row ? 200 : 201);
        });
    }

    public function password(Request $request)
    {
        $data = $request->validate(['current_password' => 'required|string', 'password' => 'required|string|min:12|max:128|confirmed']);
        $user = $request->user('api');
        abort_unless(Hash::check($data['current_password'], $user->password), 422, 'La contraseña actual no es correcta.');
        DB::table('users')->where('id', $user->id)->update(['password' => Hash::make($data['password']), 'nident_auth_version' => DB::raw('nident_auth_version+1'), 'updated_at' => now()]);
        $this->audit($request,'password.changed','user',$user->id);

        return response()->json(['result' => ['reauthenticate' => true]]);
    }
}
