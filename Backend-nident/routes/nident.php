<?php

use App\Http\Controllers\Api\Nident\AuthController;
use App\Http\Controllers\Api\Nident\BusinessController;
use App\Http\Controllers\Api\Nident\CanvasController;
use App\Http\Controllers\Api\Nident\ClaimController;
use App\Http\Controllers\Api\Nident\CollectionController;
use App\Http\Controllers\Api\Nident\ContactController;
use App\Http\Controllers\Api\Nident\DashboardController;
use App\Http\Controllers\Api\Nident\MailController;
use App\Http\Controllers\Api\Nident\ProductController;
use App\Http\Controllers\Api\Nident\ReservationController;
use App\Http\Controllers\Api\Nident\SecurityController;
use App\Http\Controllers\Api\Nident\SiteController;
use App\Http\Controllers\Api\Nident\TrackingController;
use App\Http\Controllers\Api\SeguridadAuth2faController;
use App\Http\Middleware\NidentPermission;
use App\Http\Middleware\NidentSessionVersion;
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
Route::get('/public/products', [ProductController::class, 'index']);
Route::get('/public/media/{name}', [CanvasController::class, 'media']);
Route::post('/public/reservations', [ReservationController::class, 'store'])->middleware('throttle:nident-contact');
Route::post('/public/contact', [ContactController::class, 'store'])->middleware('throttle:nident-contact');
Route::post('/public/claims', [ClaimController::class, 'store'])->middleware('throttle:nident-public-request');
Route::post('/public/requests/lookup', [TrackingController::class, 'lookup'])->middleware('throttle:nident-public-request');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:nident-login');
Route::post('/auth/2fa/verify', [SeguridadAuth2faController::class, 'verify'])->middleware('throttle:5,1');
Route::post('/auth/2fa/init', [SeguridadAuth2faController::class, 'mandatoryInit'])->middleware('throttle:5,1');
Route::post('/auth/2fa/confirm', [SeguridadAuth2faController::class, 'mandatoryConfirm'])->middleware('throttle:5,1');
Route::post('/auth/logout', [App\Http\Controllers\Api\AuthController::class, 'logout']);

Route::middleware(['auth:api', NidentSessionVersion::class])->group(function () {
    Route::post('/admin/media', [CanvasController::class, 'upload'])->middleware('throttle:20,1');
    Route::post('/admin/site/media', [CanvasController::class, 'upload'])->middleware('throttle:20,1');
    Route::get('/admin/me', [AuthController::class, 'me']);
    Route::get('/admin/dashboard', [DashboardController::class, 'show']);
    Route::middleware(NidentPermission::class.':catalog')->group(function () {
        Route::get('/admin/catalog', [CollectionController::class, 'show'])->defaults('collection', 'products');
        Route::put('/admin/catalog', [CollectionController::class, 'save'])->defaults('collection', 'products');
        Route::post('/admin/catalog/publish', [CollectionController::class, 'publish'])->defaults('collection', 'products');
    });
    Route::put('/admin/account/password', [SecurityController::class, 'password']);
    Route::middleware(NidentPermission::class.':security')->prefix('admin/security')->group(function () {
        Route::put('/business', [BusinessController::class, 'save']);
        Route::get('/', [SecurityController::class, 'index']);
        Route::post('/users', [SecurityController::class, 'saveUser']);
        Route::put('/users/{user}', [SecurityController::class, 'saveUser'])->whereNumber('user');
        Route::post('/profiles', [SecurityController::class, 'saveProfile']);
        Route::put('/profiles/{profile}', [SecurityController::class, 'saveProfile'])->whereNumber('profile');
        Route::post('/roles', [SecurityController::class, 'saveRole']);
        Route::put('/roles/{role}', [SecurityController::class, 'saveRole'])->whereNumber('role');
    });
    Route::middleware(NidentPermission::class.':claims')->group(function () {
        Route::get('/admin/claims/settings', [BusinessController::class, 'show']);
        Route::get('/admin/claims', [ClaimController::class, 'index']);
        Route::put('/admin/claims/{claim}', [ClaimController::class, 'update'])->whereNumber('claim');
        Route::get('/admin/claims/{claim}/attachments/{attachment}', [ClaimController::class, 'attachment'])->whereNumber('claim')->whereNumber('attachment');
    });
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
        Route::get('/branding', [MailController::class, 'branding']);
        Route::put('/branding', [MailController::class, 'saveBranding']);
        Route::post('/branding/preview', [MailController::class, 'previewBranding']);
        Route::put('/templates/{template}', [MailController::class, 'save']);
        Route::post('/templates/{template}/publish', [MailController::class, 'publish']);
        Route::post('/templates/{template}/preview', [MailController::class, 'preview']);
        Route::post('/templates/{template}/test', [MailController::class, 'test'])->middleware('throttle:3,1');
        Route::get('/settings', [MailController::class, 'settings']);
        Route::put('/settings', [MailController::class, 'saveSettings']);
        Route::get('/deliveries', [MailController::class, 'deliveries']);
        Route::get('/health', [MailController::class, 'health']);
    });
    Route::middleware(NidentPermission::class.':site')->prefix('admin/site')->group(function () {
        Route::get('/collections/{collection}', [CollectionController::class, 'show']);
        Route::put('/collections/{collection}', [CollectionController::class, 'save']);
        Route::post('/collections/{collection}/publish', [CollectionController::class, 'publish']);
        Route::get('/modules', [CanvasController::class, 'index']);
        Route::put('/modules/{module}', [CanvasController::class, 'save']);
        Route::post('/modules/{module}/publish', [CanvasController::class, 'publish']);

        Route::get('/settings', [SiteController::class, 'settings']);
        Route::put('/settings', [SiteController::class, 'save']);
        Route::get('/pages', [SiteController::class, 'pages']);
        Route::put('/pages/{page}', [SiteController::class, 'savePage'])->whereNumber('page');
    });
});
