<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index()
    {
        $row = DB::table('cms_collections')->where('key', 'products')->first();
        $items = $row ? json_decode($row->published, true)['items'] : [];

        return response()->json(array_values(array_map(fn ($p) => ['id' => $p['id'], 'name' => $p['title'], 'slug' => $p['slug'], 'category' => $p['category'], 'price' => (float) $p['price'], 'image' => $p['image'], 'description' => $p['summary'], 'stock' => $p['stock']], array_filter($items, fn ($p) => $p['visible']))))->header('Cache-Control', 'no-cache');
    }
}
