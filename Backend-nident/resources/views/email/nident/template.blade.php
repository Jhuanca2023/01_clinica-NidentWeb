<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ $subject }}</title></head>
<body style="margin:0;background:#f4f1f8;color:#30283f;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{{ $preheader }}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:36px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="padding:30px 36px;border-bottom:1px solid #eee8f4;font-size:30px;font-weight:bold;color:{{ $accent }}">nident<span style="color:#30283f">.</span></td></tr>
@foreach($blocks as $block)
<tr><td style="padding:{{ $block['type'] === 'divider' ? '12px' : '16px' }} 36px">
@switch($block['type'])
@case('heading')<h1 style="margin:0;font-size:28px;line-height:1.25;color:#30283f">{{ $block['text'] }}</h1>@break
@case('text')<p style="margin:0;font-size:16px;line-height:1.7;white-space:pre-line">{{ $block['text'] }}</p>@break
@case('image')<img src="{{ $block['url'] }}" alt="{{ $block['alt'] }}" width="528" style="width:100%;max-width:528px;height:auto;display:block;border-radius:12px">@break
@case('button')<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="{{ $accent }}" style="border-radius:8px"><a href="{{ $block['url'] }}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:16px;font-weight:bold">{{ $block['text'] }}</a></td></tr></table>@break
@case('divider')<hr style="border:0;border-top:1px solid #e9e2f0;margin:0">@break
@endswitch
</td></tr>
@endforeach
<tr><td style="padding:28px 36px;font-size:13px;line-height:1.6;color:#62566f;border-top:1px solid #eee8f4;white-space:pre-line">{{ $footer }}</td></tr>
</table><p style="font-size:12px;color:#62566f">Nident · Odontología para toda la familia</p>
</td></tr></table></body></html>
