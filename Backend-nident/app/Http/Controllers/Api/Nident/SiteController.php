<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    public function publicSite()
    {
        $settings = DB::table('cms_site_settings')->find(1);
        abort_unless($settings, 503, 'La configuración del sitio todavía no está instalada.');

        return response()->json(['success' => true, 'result' => [
            'content' => json_decode($settings->content, true), 'version' => $settings->version, 'business' => DB::table('nident_business_settings')->find(1),
            'modules' => DB::table('cms_modules')->get(['key', 'published'])->mapWithKeys(fn ($module) => [$module->key => json_decode($module->published, true)]),
            'collections' => DB::table('cms_collections')->get(['key', 'published'])->mapWithKeys(fn ($collection) => [$collection->key => ['items' => array_values(array_filter(json_decode($collection->published, true)['items'], fn ($item) => $item['visible']))]]),
            'pages' => DB::table('cms_pages')->where('published', true)->get(['path', 'source', 'title', 'description']),
        ]])->header('Cache-Control', 'no-cache');
    }

    public function settings()
    {
        $settings = DB::table('cms_site_settings')->find(1);

        return response()->json(['success' => true, 'result' => ['content' => json_decode($settings->content, true), 'version' => $settings->version]]);
    }

    public function save(Request $request)
    {
        $link = 'regex:~^/(?!/)[a-z0-9/_-]*(?:\#[a-z0-9_-]+)?$~';
        $data = $request->validate([
            'version' => 'required|integer|min:1',
            'content' => 'required|array:brand,tagline,email,phone,logo,nav,hero',
            'content.brand' => 'required|string|max:80', 'content.tagline' => 'required|string|max:160',
            'content.email' => 'nullable|email:rfc|max:180', 'content.phone' => 'nullable|string|max:40',
            'content.logo' => ['required', 'regex:~^/assets/img/[a-zA-Z0-9/_-]+\.(webp|png|jpg|svg)$~'],
            'content.nav' => 'required|array|min:1|max:10', 'content.nav.*' => 'required|array:label,url',
            'content.nav.*.label' => 'required|string|max:70', 'content.nav.*.url' => ['required', $link],
            'content.hero' => 'required|array|min:1|max:10', 'content.hero.*' => 'required|array:title,line,description,image,alt,cta,url',
            'content.hero.*.title' => 'required|string|max:100', 'content.hero.*.line' => 'required|string|max:100',
            'content.hero.*.description' => 'required|string|max:250',
            'content.hero.*.image' => ['required', 'regex:~^/(?:assets/img/[a-zA-Z0-9/_-]+|media/[a-f0-9]{40})\.(webp|png|jpg)$~'],
            'content.hero.*.alt' => 'required|string|max:200', 'content.hero.*.cta' => 'required|string|max:100',
            'content.hero.*.url' => ['required', $link],
        ]);
        $updated = DB::table('cms_site_settings')->where('id', 1)->where('version', $data['version'])->update([
            'content' => json_encode($data['content'], JSON_UNESCAPED_UNICODE), 'version' => $data['version'] + 1, 'updated_at' => now(),
        ]);
        abort_unless($updated, 409, 'El sitio cambió en otra sesión. Recarga antes de guardar.');

        return $this->settings();
    }

    public function pages()
    {
        return response()->json(['success' => true, 'result' => DB::table('cms_pages')->orderBy('id')->get()]);
    }

    public function savePage(Request $request, int $page)
    {
        $data = $request->validate(['title' => 'required|string|max:180', 'description' => 'present|nullable|string|max:300', 'published' => 'required|boolean']);
        $data['description'] ??= '';
        abort_unless(DB::table('cms_pages')->where('id', $page)->exists(), 404);
        DB::table('cms_pages')->where('id', $page)->update($data + ['updated_at' => now()]);

        return response()->json(['success' => true]);
    }
}
