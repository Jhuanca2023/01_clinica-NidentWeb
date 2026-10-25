<?php

namespace App\Http\Requests\Nident;

use App\Services\Nident\MailImages;
use Illuminate\Foundation\Http\FormRequest;

class MailBrandingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $branding = $this->input('branding');
        if (! is_array($branding)) {
            return;
        }
        foreach (['logo', 'banner', 'tagline', 'footer_title', 'footer_text', 'address', 'phone', 'email', 'website'] as $key) {
            if (array_key_exists($key, $branding) && $branding[$key] === null) {
                $branding[$key] = '';
            }
        }
        $this->merge(['branding' => $branding]);
    }

    public function rules(): array
    {
        $https = function ($attribute, $value, $fail) {
            if ($value && (! filter_var($value, FILTER_VALIDATE_URL) || strtolower(parse_url($value, PHP_URL_SCHEME) ?? '') !== 'https' || parse_url($value, PHP_URL_USER) || parse_url($value, PHP_URL_PASS))) {
                $fail('Usa un enlace HTTPS válido, sin credenciales.');
            }
        };
        $image = function ($attribute, $value, $fail) use ($https) {
            if (! $value) {
                return;
            }if (str_starts_with($value, '/')) {
                if (! MailImages::path($value)) {
                    $fail('La imagen no existe. Sube un archivo o elige la imagen de Nident.');
                }
            } else {
                $https($attribute, $value, $fail);
            }
        };

        return ['version' => 'required|integer|min:1', 'branding' => 'required|array:name,logo,logo_alt,banner,banner_alt,tagline,footer_title,footer_text,address,phone,email,website,links', 'branding.name' => 'required|string|max:120', 'branding.logo' => ['present', 'nullable', 'string', 'max:1000', $image], 'branding.logo_alt' => 'required|string|max:180', 'branding.banner' => ['present', 'nullable', 'string', 'max:1000', $image], 'branding.banner_alt' => 'required|string|max:180', 'branding.tagline' => 'present|nullable|string|max:180', 'branding.footer_title' => 'present|nullable|string|max:120', 'branding.footer_text' => 'present|nullable|string|max:600', 'branding.address' => 'present|nullable|string|max:300', 'branding.phone' => 'present|nullable|string|max:40', 'branding.email' => 'present|nullable|email:rfc|max:180', 'branding.website' => ['present', 'nullable', 'string', 'max:1000', $https], 'branding.links' => 'present|array|max:6', 'branding.links.*' => 'required|array:label,url', 'branding.links.*.label' => 'required|string|max:60', 'branding.links.*.url' => ['required', 'string', 'max:1000', $https], 'template_id' => 'nullable|integer|exists:mail_templates,id'];
    }
}
