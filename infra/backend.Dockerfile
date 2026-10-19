FROM composer:2 AS composer
FROM php:8.3-fpm-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends libonig-dev libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev unzip git \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_mysql mbstring bcmath intl gd zip opcache pcntl \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www
COPY Backend-nident/composer.json Backend-nident/composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts --optimize-autoloader
COPY --chown=www-data:www-data Backend-nident/ ./
COPY infra/entrypoint.sh /usr/local/bin/nident-entrypoint
RUN chmod +x /usr/local/bin/nident-entrypoint \
    && mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
USER www-data
ENTRYPOINT ["nident-entrypoint"]
CMD ["php-fpm"]
