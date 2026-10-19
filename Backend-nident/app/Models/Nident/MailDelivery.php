<?php

namespace App\Models\Nident;

use Illuminate\Database\Eloquent\Model;

class MailDelivery extends Model
{
    protected $table = 'mail_deliveries';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected $hidden = ['recipient', 'html'];

    protected $casts = ['recipient' => 'encrypted', 'html' => 'encrypted', 'claimed_at' => 'datetime'];
}
