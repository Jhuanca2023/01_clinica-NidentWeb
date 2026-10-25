<?php
// CLI visual fixture: render supplied synthetic content; no database query or mail transport.
require dirname(__DIR__).'/vendor/autoload.php';
$app=require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$payload=json_decode(stream_get_contents(STDIN),true,512,JSON_THROW_ON_ERROR);
$renderer=app(App\Services\Nident\TemplateRenderer::class);
echo json_encode($renderer->render($payload['document'],$renderer->sample(),$payload['branding']??App\Services\Nident\MailBranding::defaults()),JSON_THROW_ON_ERROR);
