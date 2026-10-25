<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>{{ $subject }}</title>
<style>@media only screen and (max-width:620px){.mail-pad{padding-left:24px!important;padding-right:24px!important}.mail-heading{font-size:26px!important}.mail-outer{padding:16px 8px!important}}</style></head>
<body style="margin:0;padding:0;background:#f2eff6;color:#30283f;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">{{ $preheader }}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f2eff6"><tr><td align="center" class="mail-outer" style="padding:36px 12px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td class="mail-pad" style="padding:30px 40px 24px;border-top:5px solid {{ $accent }}">
@if($branding['logo'])<img src="{{ $branding['logo'] }}" alt="{{ $branding['logo_alt'] }}" width="180" style="display:block;border:0;width:180px;max-width:100%;height:auto">@else<strong style="font-size:27px;color:{{ $accent }}">{{ $branding['name'] }}</strong>@endif
@if($branding['tagline'])<p style="margin:16px 0 0;font-size:13px;line-height:1.65;color:#675775">{{ $branding['tagline'] }}</p>@endif
</td></tr>
@if($branding['banner'])<tr><td style="padding:0"><img src="{{ $branding['banner'] }}" alt="{{ $branding['banner_alt'] }}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr>@endif
<tr><td style="height:22px;font-size:1px;line-height:22px">&nbsp;</td></tr>
@foreach($blocks as $block)
<tr><td class="mail-pad" style="padding:{{ $block['type'] === 'divider' ? '14px' : '12px' }} 40px;overflow-wrap:anywhere">
@switch($block['type'])
@case('heading')<h1 class="mail-heading" style="margin:0;font-size:29px;line-height:1.28;font-weight:700;color:#30283f">{{ $block['text'] }}</h1>@break
@case('text')<p style="margin:0;font-size:15px;line-height:1.85;color:#51435e;white-space:pre-line">{{ $block['text'] }}</p>@break
@case('image')<img src="{{ $block['url'] }}" alt="{{ $block['alt'] }}" width="520" style="width:100%;max-width:520px;height:auto;display:block;border:0;border-radius:8px">@break
@case('button')<table role="presentation" cellspacing="0" cellpadding="0"><tr><td bgcolor="{{ $accent }}" style="border-radius:8px"><a href="{{ $block['url'] }}" style="display:inline-block;padding:15px 24px;color:#fff;text-decoration:none;font-size:16px;font-weight:bold">{{ $block['text'] }}</a></td></tr></table>@break
@case('divider')<hr style="border:0;border-top:1px solid #e9e2f0;margin:0">@break
@endswitch
</td></tr>
@endforeach
@if($footer)<tr><td class="mail-pad" style="padding:20px 40px 30px"><p style="margin:0;font-size:12px;line-height:1.8;color:#6b5b78;white-space:pre-line">{{ $footer }}</p></td></tr>@endif
<tr><td class="mail-pad" bgcolor="#302444" style="padding:30px 40px;color:#fff">
<p style="margin:0 0 12px;font-size:19px;line-height:1.4;font-weight:bold;color:#fff">{{ $branding['footer_title'] ?: $branding['name'] }}</p>
@if($branding['footer_text'])<p style="margin:0 0 20px;font-size:13px;line-height:1.8;color:#e3d9ee;white-space:pre-line">{{ $branding['footer_text'] }}</p>@endif
@if($branding['address'])<p style="margin:6px 0;font-size:13px;line-height:1.7;color:#e3d9ee">{{ $branding['address'] }}</p>@endif
@if($branding['phone'])<p style="margin:6px 0;font-size:13px;line-height:1.7;color:#fff">Teléfono: {{ $branding['phone'] }}</p>@endif
@if($branding['email'])<p style="margin:6px 0;font-size:13px;line-height:1.7"><a href="mailto:{{ $branding['email'] }}" style="color:#fff;text-decoration:underline">{{ $branding['email'] }}</a></p>@endif
@if($branding['website'])<p style="margin:18px 0;font-size:13px;line-height:1.7"><a href="{{ $branding['website'] }}" style="color:#fff;text-decoration:underline">Visita nuestra web</a></p>@endif
@if(count($branding['links']))<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:20px;border-top:1px solid #75638c"><tr><td style="padding-top:16px;font-size:12px;line-height:2.2">@foreach($branding['links'] as $link)<a href="{{ $link['url'] }}" style="display:inline-block;color:#eee5f7;text-decoration:underline;margin-right:14px">{{ $link['label'] }}</a> @endforeach</td></tr></table>@endif
<p style="margin:22px 0 0;font-size:11px;line-height:1.7;color:#d6c8e5">{{ $branding['name'] }} · Esta comunicación corresponde a una solicitud registrada.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
<p style="margin:18px 0 0;font-size:11px;line-height:1.7;color:#71617f">{{ $branding['name'] }} · Cuidamos cada detalle de tu atención.</p>
</td></tr></table></body></html>
