#!/bin/sh
set -e

# Support dynamic PORT environment variable (Render, Railway, Fly.io, etc.)
TARGET_PORT="${PORT:-80}"
sed -i "s/Listen 80/Listen ${TARGET_PORT}/g" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost \*:${TARGET_PORT}>/g" /etc/apache2/sites-available/000-default.conf

# Ensure uploads and data directories exist with proper write permissions
mkdir -p /var/www/html/uploads /var/www/html/data
chown -R www-data:www-data /var/www/html/uploads /var/www/html/data

exec "$@"
