<?php

namespace App\Http\Controllers\Api\Nident;

use App\Http\Controllers\Controller;
use App\Http\Middleware\NidentPermission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function show(Request $request)
    {
        $data = $request->validate(['days' => 'nullable|integer|in:7,30,90']);
        $days = (int) ($data['days'] ?? 30);
        $start = now()->startOfDay()->subDays($days - 1);
        $end = now()->endOfDay();
        $user = $request->user('api');
        abort_unless($user && $user->Activo === 'S', 403);
        $result = ['days' => $days, 'timezone' => config('app.timezone'), 'generated_at' => now()->toIso8601String(), 'reservations' => null, 'messages' => null, 'mail' => null, 'content' => null];
        if (NidentPermission::allows($user, 'reservations')) {
            $query = DB::table('nident_reservations');
            $period = (clone $query)->whereBetween('created_at', [$start, $end]);
            $grouped = (clone $period)->selectRaw('DATE(created_at) as day, COUNT(*) as total')->groupByRaw('DATE(created_at)')->pluck('total', 'day');
            $series = [];
            for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
                $series[] = ['date' => $date->toDateString(), 'total' => (int) ($grouped[$date->toDateString()] ?? 0)];
            }
            $result['reservations'] = ['total' => $period->count(), 'pending' => (clone $query)->where('status', 'pending')->count(), 'today' => (clone $query)->whereDate('preferred_date', today())->where('status', 'confirmed')->count(), 'statuses' => (clone $period)->selectRaw('status,COUNT(*) as total')->groupBy('status')->pluck('total', 'status'), 'series' => $series, 'branches' => (clone $period)->selectRaw('branch,COUNT(*) as total')->groupBy('branch')->orderByDesc('total')->get(), 'upcoming' => (clone $query)->where('status', 'confirmed')->where('preferred_date', '>=', today())->orderBy('preferred_date')->orderBy('preferred_time')->limit(5)->get(['code', 'preferred_date', 'preferred_time', 'branch'])];
        }
        if (NidentPermission::allows($user, 'attention')) {
            $result['messages'] = ['total' => DB::table('web_contacto_mensaje')->whereNotNull('nident_request_id')->whereBetween('created_at', [$start, $end])->count(), 'unread' => DB::table('web_contacto_mensaje')->whereNotNull('nident_request_id')->whereNull('nident_read_at')->count()];
        }
        if (NidentPermission::allows($user, 'mail')) {
            $result['mail'] = DB::table('mail_deliveries')->whereBetween('created_at', [$start, $end])->selectRaw('status,COUNT(*) as total')->groupBy('status')->pluck('total', 'status');
        }
        if (NidentPermission::allows($user, 'site')) {
            $result['content'] = ['pages' => DB::table('cms_pages')->where('published', true)->count(), 'drafts' => DB::table('cms_modules')->whereColumn('draft', '<>', 'published')->count() + DB::table('cms_collections')->whereColumn('draft', '<>', 'published')->count(), 'collections' => DB::table('cms_collections')->get(['key', 'published'])->mapWithKeys(fn ($row) => [$row->key => count(array_filter(json_decode($row->published, true)['items'], fn ($item) => $item['visible']))])];
        }

        return response()->json(['result' => $result])->header('Cache-Control','private, no-store');
    }
}
