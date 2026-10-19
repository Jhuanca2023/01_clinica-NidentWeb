<?php

use App\Http\Controllers\Api\Nident\AuthController;
use App\Http\Controllers\Api\Nident\CanvasController;
use App\Http\Controllers\Api\Nident\ContactController;
use App\Http\Controllers\Api\Nident\MailController;
use App\Http\Controllers\Api\Nident\ReservationController;
use App\Http\Controllers\Api\Nident\SiteController;
use App\Http\Controllers\Api\SeguridadAuth2faController;
use App\Http\Middleware\NidentPermission;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/health/live', fn () => response()->json(['status' => 'ok', 'service' => 'nident-api']));
Route::get('/health/ready', function () {
    try {
        DB::select('SELECT 1');

        return response()->json(['status' => 'ok']);
    } catch (Throwable $exception) {
        return response()->json(['status' => 'unavailable'], 503);
    }
});
Route::get('/public/site', [SiteController::class, 'publicSite']);
Route::get('/public/media/{name}', [CanvasController::class, 'media']);
Route::post('/public/reservations', [ReservationController::class, 'store'])->middleware('throttle:nident-contact');
Route::post('/public/contact', [ContactController::class, 'store'])->middleware('throttle:nident-contact');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:nident-login');
Route::post('/auth/2fa/verify', [SeguridadAuth2faController::class, 'verify'])->middleware('throttle:5,1');
Route::post('/auth/2fa/init', [SeguridadAuth2faController::class, 'mandatoryInit'])->middleware('throttle:5,1');
Route::post('/auth/2fa/confirm', [SeguridadAuth2faController::class, 'mandatoryConfirm'])->middleware('throttle:5,1');
Route::post('/auth/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);

Route::middleware('auth:api')->group(function () {
    Route::get('/admin/me', [AuthController::class, 'me']);
    Route::middleware(NidentPermission::class.':reservations')->group(function () {
        Route::get('/admin/reservations', [ReservationController::class, 'index']);
        Route::put('/admin/reservations/{reservation}', [ReservationController::class, 'update'])->whereNumber('reservation');
    });
    Route::middleware(NidentPermission::class.':attention')->group(function () {
        Route::get('/admin/messages', [ContactController::class, 'index']);
        Route::post('/admin/messages/{message}/read', [ContactController::class, 'read'])->whereNumber('message');
    });
    Route::middleware(NidentPermission::class.':mail')->prefix('admin/mail')->group(function () {
        Route::get('/templates', [MailController::class, 'index']);
        Route::put('/templates/{template}', [MailController::class, 'save']);
        Route::post('/templates/{template}/publish', [MailController::class, 'publish']);
        Route::post('/templates/{template}/preview', [MailController::class, 'preview']);
        Route::post('/templates/{template}/test', [MailController::class, 'test'])->middleware('throttle:3,1');
        Route::get('/settings', [MailController::class, 'settings']);
        Route::put('/settings', [MailController::class, 'saveSettings']);
        Route::get('/deliveries', [MailController::class, 'deliveries']);
    });
    Route::middleware(NidentPermission::class.':site')->prefix('admin/site')->group(function () {
        Route::get('/modules', [CanvasController::class, 'index']);
        Route::put('/modules/{module}', [CanvasController::class, 'save']);
        Route::post('/modules/{module}/publish', [CanvasController::class, 'publish']);
        Route::post('/media', [CanvasController::class, 'upload'])->middleware('throttle:20,1');
        Route::get('/settings', [SiteController::class, 'settings']);
        Route::put('/settings', [SiteController::class, 'save']);
        Route::get('/pages', [SiteController::class, 'pages']);
        Route::put('/pages/{page}', [SiteController::class, 'savePage'])->whereNumber('page');
    });
});
