<?php

namespace App\Models\Nident;

use Illuminate\Database\Eloquent\Model;

class MailSetting extends Model
{
    protected $table = 'mail_settings';

    protected $guarded = [];

    protected $hidden = ['password'];

    protected $casts = ['password' => 'encrypted', 'enabled' => 'boolean', 'branding' => 'array'];
}
