<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    // public const HOME = '/home';
    public const HOME = '/';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('nident-login', function (Request $request) {
            return [
                Limit::perMinute(5)->by('nident:login:'.hash('sha256', strtolower((string) $request->input('email')))),
                Limit::perMinute(60)->by('nident:login:ip:'.$request->ip()),
            ];
        });
        RateLimiter::for('nident-contact', function (Request $request) {
            return [
                Limit::perMinute(5)->by('nident:contact:'.hash('sha256', strtolower((string) $request->input('correo')))),
                Limit::perMinute(60)->by('nident:contact:ip:'.$request->ip()),
            ];
        });
        RateLimiter::for('api', function (Request $request) {
            if (config('nident.enabled')) {
                return Limit::perMinute(600)->by('nident:api:'.$request->ip());
            }
            if ($request->user()) {
                return Limit::perMinute(240)->by('user:'.$request->user()->getAuthIdentifier());
            }

            return Limit::perMinute(60)->by($request->ip());
        });

        $this->routes(function () {
            if (config('nident.enabled')) {
                Route::middleware('api')->prefix('api/v1')->group(base_path('routes/nident.php'));
                return;
            }

            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
