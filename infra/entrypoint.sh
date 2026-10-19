#!/bin/sh
set -eu
php artisan package:discover --no-interaction >/dev/null
php artisan nident:doctor
exec "$@"
