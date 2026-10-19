<?php

namespace App\Models\Nident;

use Illuminate\Database\Eloquent\Model;

class MailTemplate extends Model
{
    protected $table = 'mail_templates';

    protected $guarded = [];

    protected $casts = ['variables' => 'array', 'draft' => 'array', 'published' => 'array', 'published_at' => 'datetime'];
}
