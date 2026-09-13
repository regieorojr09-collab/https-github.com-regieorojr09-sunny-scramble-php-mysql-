FROM php:8.2-apache

# Install system dependencies for PHP extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev \
    && docker-php-ext-install -j$(nproc) pdo pdo_mysql dom simplexml \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules required for SPA routing and security headers
RUN a2enmod rewrite headers

# Set working directory
WORKDIR /var/www/html

# Copy application source code
COPY . /var/www/html/

# Copy entrypoint script and ensure it is executable
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set directory permissions for web user
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Default port
EXPOSE 80

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["apache2-foreground"]
