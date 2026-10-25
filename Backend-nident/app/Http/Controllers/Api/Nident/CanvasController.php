<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Http\Middleware\NidentPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CanvasController extends Controller
{
    public function index()
    {
        return response()->json(['result' => DB::table('cms_modules')->get()->map(fn ($row) => $this->document($row))]);
    }

    private function document($row): array
    {
        return ['key' => $row->key, 'draft' => json_decode($row->draft, true), 'published' => json_decode($row->published, true), 'version' => $row->version];
    }

    public function save(Request $request, string $module)
    {
        $schema = json_decode(file_get_contents(database_path('seeders/data/nident-canvas.json')), true);
        abort_unless(isset($schema[$module]), 404);
        $data = $request->validate(['version' => 'required|integer|min:1', 'content' => 'present|array|max:1500', 'content.*' => 'present|nullable|string|max:6000']);
        $allowed = collect($schema[$module]['fields'])->keyBy('id');
        foreach ($data['content'] as $key => &$value) {
            abort_unless(isset($allowed[$key]), 422, 'El campo no pertenece al módulo.');
            $value ??= '';
            $type = $allowed[$key]['type'];
            if ($type === 'image') {
                abort_unless(preg_match('~^/(?:assets/img/[a-zA-Z0-9/_-]+|media/[a-f0-9]{40})\.(?:webp|png|jpe?g)$~D', $value), 422, 'Selecciona una imagen válida.');
            }
            if ($type === 'link') {
                abort_unless(preg_match('~^(?:/(?!/)[a-zA-Z0-9/_#?=&.%-]*|#[a-zA-Z0-9_-]+|https://[^\s<>"\x00-\x20]+|mailto:[a-zA-Z0-9@._+%-]+|tel:[+0-9 -]+)$~D', $value), 422, 'El enlace debe ser local, HTTPS, correo o teléfono.');
            }
        }
        unset($value);
        $updated = DB::table('cms_modules')->where('key', $module)->where('version', $data['version'])->update(['draft' => json_encode($data['content'], JSON_UNESCAPED_UNICODE), 'version' => $data['version'] + 1, 'updated_at' => now()]);
        abort_unless($updated, 409, 'Este módulo cambió en otra sesión. Recarga antes de guardar.');

        return response()->json(['result' => $this->document(DB::table('cms_modules')->where('key', $module)->first())]);
    }

    public function publish(Request $request, string $module)
    {
        $data = $request->validate(['version' => 'required|integer|min:1']);

        return DB::transaction(function () use ($request, $module, $data) {
            $row = DB::table('cms_modules')->where('key', $module)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_unless($row->version === $data['version'], 409, 'El módulo cambió. Recarga antes de publicar.');
            DB::table('cms_module_revisions')->insert(['module_key' => $module, 'version' => $row->version, 'content' => $row->draft, 'user_id' => $request->user('api')->id, 'created_at' => now()]);
            DB::table('cms_modules')->where('key', $module)->update(['published' => $row->draft, 'version' => $row->version + 1, 'updated_at' => now()]);

            return response()->json(['result' => $this->document(DB::table('cms_modules')->where('key', $module)->first())]);
        });
    }

    public function upload(Request $request)
    {
        abort_unless(NidentPermission::allows($request->user('api'), 'site') || NidentPermission::allows($request->user('api'), 'catalog') || NidentPermission::allows($request->user('api'), 'mail'), 403);
        $request->validate(['image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120|dimensions:max_width=8000,max_height=8000']);
        $file = $request->file('image');
        $extension = match ($file->getMimeType()) {
            'image/jpeg' => 'jpg','image/png' => 'png','image/webp' => 'webp',default => abort(422)
        };
        $name = bin2hex(random_bytes(20)).'.'.$extension;
        $file->storeAs('nident-media', $name, 'local');

        return response()->json(['result' => ['url' => '/media/'.$name]], 201);
    }

    public function media(string $name)
    {
        abort_unless(preg_match('/^[a-f0-9]{40}\.(jpg|png|webp)$/D', $name), 404);
        $path = Storage::disk('local')->path('nident-media/'.$name);
        abort_unless(is_file($path), 404);

        return response()->file($path, ['X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'public, max-age=31536000, immutable']);
    }
}
