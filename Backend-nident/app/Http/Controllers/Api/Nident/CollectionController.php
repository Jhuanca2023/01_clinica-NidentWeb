<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollectionController extends Controller
{
    private function document($row): array
    {
        return ['key' => $row->key, 'draft' => json_decode($row->draft, true), 'published' => json_decode($row->published, true), 'version' => $row->version];
    }

    public function show(string $collection)
    {
        abort_unless(in_array($collection, ['reviews', 'plans'], true), 404);
        $row = DB::table('cms_collections')->where('key', $collection)->first();
        abort_unless($row, 404);

        return response()->json(['result' => $this->document($row)]);
    }

    public function save(Request $request, string $collection)
    {
        abort_unless(in_array($collection, ['reviews', 'plans'], true), 404);
        $image = 'regex:~^/(?:assets/img/[a-zA-Z0-9/_-]+|media/[a-f0-9]{40})\.(?:webp|png|jpe?g)$~D';
        $keys = $collection === 'reviews' ? 'id,visible,author,service,quote,rating,image,alt,note' : 'id,visible,featured,title,slug,summary,image,alt,price,price_note,features,conditions,cta,sections';
        $rules = ['version' => 'required|integer|min:1', 'document' => 'required|array:items', 'document.items' => 'present|array|list|max:50', 'document.items.*' => 'required|array:'.$keys, 'document.items.*.id' => 'required|uuid|distinct:ignore_case', 'document.items.*.visible' => 'required|boolean', 'document.items.*.image' => ['nullable', 'string', 'max:500', $image], 'document.items.*.alt' => 'present|nullable|string|max:200'];
        if ($collection === 'reviews') {
            $rules += ['document.items.*.author' => 'required|string|max:100', 'document.items.*.service' => 'present|nullable|string|max:120', 'document.items.*.quote' => 'required|string|max:2000', 'document.items.*.rating' => 'required|integer|min:1|max:5', 'document.items.*.note' => 'present|nullable|string|max:200'];
        } else {
            $rules += ['document.items.*.featured' => 'required|boolean', 'document.items.*.title' => 'required|string|max:150', 'document.items.*.slug' => ['required', 'string', 'max:100', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', 'distinct:ignore_case'], 'document.items.*.summary' => 'required|string|max:1000', 'document.items.*.price' => 'present|nullable|string|max:80', 'document.items.*.price_note' => 'present|nullable|string|max:180', 'document.items.*.features' => 'present|array|list|max:30', 'document.items.*.features.*' => 'required|string|max:300', 'document.items.*.conditions' => 'present|nullable|string|max:3000', 'document.items.*.cta' => 'required|string|max:80', 'document.items.*.sections' => 'present|array|list|max:20', 'document.items.*.sections.*' => 'required|array:title,body', 'document.items.*.sections.*.title' => 'required|string|max:180', 'document.items.*.sections.*.body' => 'required|string|max:6000'];
        }
        $list = function ($attribute, $value, $fail) {
            if (is_array($value) && ! array_is_list($value)) {
                $fail('Usa una lista ordenada para '.$attribute.'.');
            }
        };
        foreach ($rules as &$rule) {
            if (is_string($rule) && str_contains($rule, '|list|')) {
                $rule = explode('|', str_replace('|list|', '|', $rule));
                $rule[] = $list;
            }
        }unset($rule);
        $data = $request->validate($rules);
        if ($collection === 'plans') {
            $row = DB::table('cms_collections')->where('key', $collection)->first();
            abort_unless($row, 404);
            $published = collect(json_decode($row->published, true)['items'])->keyBy('id');
            foreach ($data['document']['items'] as $item) {
                abort_if(mb_strlen($item['title']) > 120, 422, 'El nombre del plan admite hasta 120 caracteres.');
                if (isset($published[$item['id']])) {
                    abort_unless($published[$item['id']]['slug'] === $item['slug'], 422, 'La dirección de un plan publicado se conserva para no romper sus enlaces.');
                }
            }
        }
        foreach ($data['document']['items'] as &$item) {
            foreach ($item as &$value) {
                if ($value === null) {
                    $value = '';
                }
            }
        }unset($value,$item);
        $updated = DB::table('cms_collections')->where('key', $collection)->where('version', $data['version'])->update(['draft' => json_encode($data['document'], JSON_UNESCAPED_UNICODE), 'version' => $data['version'] + 1, 'updated_at' => now()]);
        abort_unless($updated, 409, 'La colección cambió en otra sesión. Recarga antes de guardar.');

        return $this->show($collection);
    }

    public function publish(Request $request, string $collection)
    {
        abort_unless(in_array($collection, ['reviews', 'plans'], true), 404);
        $data = $request->validate(['version' => 'required|integer|min:1']);

        return DB::transaction(function () use ($data, $collection, $request) {
            $row = DB::table('cms_collections')->where('key', $collection)->lockForUpdate()->first();
            abort_unless($row, 404);
            abort_unless($row->version === $data['version'], 409, 'La colección cambió. Recarga antes de publicar.');
            DB::table('cms_collection_revisions')->insert(['collection_key' => $collection, 'version' => $row->version, 'content' => $row->draft, 'user_id' => $request->user('api')->id, 'created_at' => now()]);
            DB::table('cms_collections')->where('key', $collection)->update(['published' => $row->draft, 'version' => $row->version + 1, 'updated_at' => now()]);

            return $this->show($collection);
        });
    }
}
