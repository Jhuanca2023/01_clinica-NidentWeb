<?php

namespace App\Http\Requests\Nident;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TemplateDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $document = $this->input('document');
        if (! is_array($document)) {
            return;
        }
        foreach (['preheader', 'footer'] as $key) {
            if (array_key_exists($key, $document) && $document[$key] === null) {
                $document[$key] = '';
            }
        }
        if (isset($document['blocks']) && is_array($document['blocks'])) {
            foreach ($document['blocks'] as &$block) {
                if (! is_array($block)) {
                    continue;
                }
                foreach (['text', 'url', 'alt'] as $key) {
                    if (array_key_exists($key, $block) && $block[$key] === null) {
                        $block[$key] = '';
                    }
                }
            }
            unset($block);
        }
        $this->merge(['document' => $document]);
    }

    public function rules(): array
    {
        return [
            'version' => 'required|integer|min:1',
            'document' => 'required|array:subject,preheader,accent,blocks,footer',
            'document.subject' => ['required', 'string', 'max:180', 'not_regex:/[\r\n]/'],
            'document.preheader' => 'present|string|max:220',
            'document.accent' => ['required', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'document.footer' => 'present|string|max:600',
            'document.blocks' => 'required|array|min:1|max:40',
            'document.blocks.*' => 'required|array:type,text,url,alt',
            'document.blocks.*.type' => ['required', Rule::in(['heading', 'text', 'image', 'button', 'divider'])],
            'document.blocks.*.text' => 'present|string|max:4000',
            'document.blocks.*.url' => 'present|string|max:1000',
            'document.blocks.*.alt' => 'present|string|max:180',
        ];
    }
}
