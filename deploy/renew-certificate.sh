#!/bin/sh
set -eu

# Renew only MANGATA; the proxy and certificate store are shared with other sites.
exec 9>/run/lock/mangata-cert-renew.lock
flock -n 9 || exit 0

cert_store=/opt/eversys/arcometal/certbot/conf
cert_file="$cert_store/live/mangata.com.ar/fullchain.pem"
if [ ! -s "$cert_file" ]; then
    echo "MANGATA certificate is not issued yet; refusing to run renewal." >&2
    exit 1
fi

before=$(sha256sum "$cert_file")
docker run --rm \
    -v "$cert_store:/etc/letsencrypt" \
    -v /opt/eversys/arcometal/certbot/logs:/var/log/letsencrypt \
    -v /var/www/eversys/arcometal/public:/var/www/html/public \
    certbot/certbot renew --non-interactive --cert-name mangata.com.ar \
    --webroot -w /var/www/html/public "$@"

after=$(sha256sum "$cert_file")
if [ "$before" != "$after" ]; then
    docker exec arcometal_nginx nginx -t
    docker exec arcometal_nginx nginx -s reload
fi
