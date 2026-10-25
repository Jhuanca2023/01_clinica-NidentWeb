<?php

// Convert the existing Nident artwork to email-friendly PNG/JPEG; no new branding.
$root = dirname(__DIR__, 2);
$source = $root.'/Frontend-nident/public/assets/img';
$backend = dirname(__DIR__).'/resources/email-assets';
$frontend = $root.'/Frontend-nident/public/email-assets';
foreach ([$backend, $frontend] as $folder) {
    if (! is_dir($folder)) {
        mkdir($folder, 0755, true);
    }
}
$logo = imagecreatefromwebp($source.'/marca/logo1-trim.webp');
imagesavealpha($logo, true);
imagepng($logo, $backend.'/nident-logo.png');
imagedestroy($logo);
$sourceImage = imagecreatefromwebp($source.'/sliders/banner-clinica-nident.webp');
$banner = imagecreatetruecolor(1200, 450);
$cropHeight = (int) round(imagesx($sourceImage) * 450 / 1200);
imagecopyresampled($banner, $sourceImage, 0, 0, 0, 0, 1200, 450, imagesx($sourceImage), $cropHeight);
imagejpeg($banner, $backend.'/nident-banner.jpg', 88);
imagedestroy($sourceImage);
imagedestroy($banner);
foreach (['nident-logo.png', 'nident-banner.jpg'] as $name) {
    copy($backend.'/'.$name, $frontend.'/'.$name);
}
echo "Logo y banner de correo preparados desde los recursos Nident.\n";
