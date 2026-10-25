<?php

namespace App\Services\Nident;

use Illuminate\Support\Facades\Storage;

class MailImages
{
    public static function path(string $url): ?string
    {
        $defaults = ['/email-assets/nident-logo.png' => 'nident-logo.png', '/email-assets/nident-banner.jpg' => 'nident-banner.jpg'];
        if (isset($defaults[$url])) {
            $path = resource_path('email-assets/'.$defaults[$url]);
        } elseif (preg_match('~^/media/([a-f0-9]{40}\.(?:png|jpg|webp))$~D', $url, $m)) {
            $path = Storage::disk('local')->path('nident-media/'.$m[1]);
        } else {
            return null;
        }

        return is_file($path) ? $path : null;
    }

    // Only owned local assets are read. HTTPS images remain external; no server-side URL fetch.
    public function prepare(string $html): array
    {
        $images = [];
        $html = preg_replace_callback('~(<img\b[^>]*\bsrc=")(/(?:email-assets|media)/[^"<>]+)(")~i', function ($match) use (&$images) {
            $url = html_entity_decode($match[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $path = self::path($url);
            if (! $path || filesize($path) > 5242880) {
                throw new \RuntimeException('MAIL_IMAGE_UNAVAILABLE');
            }
            $name = 'nident-'.hash('sha256', $url).'.png';
            if (! isset($images[$name])) {
                $size = getimagesize($path);
                if (! $size || $size[0] > 8000 || $size[1] > 8000 || $size[0] * $size[1] > 16000000) {
                    throw new \RuntimeException('MAIL_IMAGE_INVALID');
                }
                $image = imagecreatefromstring(file_get_contents($path));
                if (! $image) {
                    throw new \RuntimeException('MAIL_IMAGE_INVALID');
                }
                $width = min(1200, imagesx($image));
                $height = max(1, (int) round(imagesy($image) * $width / imagesx($image)));
                $target = imagecreatetruecolor($width, $height);
                imagealphablending($target, false);
                imagesavealpha($target, true);
                imagecopyresampled($target, $image, 0, 0, 0, 0, $width, $height, imagesx($image), imagesy($image));
                ob_start();
                imagepng($target, null, 6);
                $data = ob_get_clean();
                imagedestroy($image);
                imagedestroy($target);
                $images[$name] = ['name' => $name, 'data' => $data, 'mime' => 'image/png'];
            }

            return $match[1].'cid:'.$name.$match[3];
        }, $html);

        return ['html' => $html, 'images' => array_values($images)];
    }
}
