#!/bin/bash
set -euo pipefail

# Finish this one authorised rollout after NIC publishes its delegation.
# Never replace a proxy configuration changed by another deployment.
ops=/opt/mangata/ops
proxy=/opt/eversys/arcometal/nginx/default.conf
cert_store=/opt/eversys/arcometal/certbot/conf
webroot=/var/www/eversys/arcometal/public
probe=mangata-acme-check-20260914
baseline=8ae6740885218ece5969b595f81f7fb08c81fc50db7683bf8b6cecdcfc146691
candidate=6b1b0eedcd3c73eecbb9b5209cc9c9ee7508a1fa4c01ee7d84c49525676bd266

exec 9>/run/lock/mangata-publish.lock
flock -n 9 || exit 0
if [ -f "$ops/publication-complete" ]; then exit 0; fi
test "$(sha256sum "$ops/nginx-ready-tls.conf" | cut -d' ' -f1)" = "$candidate"
current=$(sha256sum "$proxy" | cut -d' ' -f1)
if [ "$current" != "$baseline" ] && [ "$current" != "$candidate" ]; then
    echo "STOP: shared Nginx changed; review a fresh configuration before continuing." >&2
    exit 1
fi
test "$(docker inspect mangata-web-1 --format '{{.State.Health.Status}}')" = healthy

for resolver in 1.1.1.1 8.8.8.8; do
    for domain in mangata.com.ar www.mangata.com.ar; do
        if ! dig "@$resolver" "$domain" A +short +time=3 +tries=1 | grep -Fxq 187.77.63.73; then
            echo "WAIT: $resolver does not yet resolve $domain to the approved Hostinger origin."
            exit 0
        fi
    done
done

cert_valid() {
    test -s "$cert_store/live/mangata.com.ar/fullchain.pem" &&
    openssl x509 -in "$cert_store/live/mangata.com.ar/fullchain.pem" -noout -checkend 86400 &&
    openssl x509 -in "$cert_store/live/mangata.com.ar/fullchain.pem" -noout -checkhost mangata.com.ar | grep -Fq 'does match certificate' &&
    openssl x509 -in "$cert_store/live/mangata.com.ar/fullchain.pem" -noout -checkhost www.mangata.com.ar | grep -Fq 'does match certificate'
}

if ! cert_valid; then
    # A failed ACME validation must not consume repeated attempts every five minutes.
    if [ -f "$ops/last-certificate-attempt" ]; then
        last=$(stat -c %Y "$ops/last-certificate-attempt")
        if [ "$(($(date +%s) - last))" -lt 1800 ]; then
            echo "WAIT: certificate retry backoff."
            exit 0
        fi
    fi
    for domain in mangata.com.ar www.mangata.com.ar; do
        test "$(curl -fsS --max-time 15 "http://$domain/.well-known/acme-challenge/$probe")" = mangata-acme-route-ready-20260914
    done
    touch "$ops/last-certificate-attempt"
    # Reuse the existing account; never create an account or accept new terms here.
    docker run --rm \
        -v "$cert_store:/etc/letsencrypt" \
        -v /opt/eversys/arcometal/certbot/logs:/var/log/letsencrypt \
        -v "$webroot:/var/www/html/public" \
        certbot/certbot certonly --non-interactive --webroot -w /var/www/html/public \
        --account 1b9b22739944f6e2b83285068cb6ab64 \
        --cert-name mangata.com.ar -d mangata.com.ar -d www.mangata.com.ar
    cert_valid
fi

# ACME can take minutes. Re-check after issuance, immediately before any file copy.
current=$(sha256sum "$proxy" | cut -d' ' -f1)
if [ "$current" != "$baseline" ] && [ "$current" != "$candidate" ]; then
    echo "STOP: shared Nginx changed during issuance; leaving it untouched." >&2
    exit 1
fi
if [ "$current" = "$baseline" ]; then
    backup="/opt/mangata/backups/nginx-before-tls-$(date -u +%Y%m%dT%H%M%SZ).conf"
    cp -p "$proxy" "$backup"
    # Preserve the inode of the existing Docker bind mount.
    cp "$ops/nginx-ready-tls.conf" "$proxy"
    if ! docker exec arcometal_nginx nginx -t; then
        cp "$backup" "$proxy"
        echo "STOP: candidate failed nginx -t; original file restored." >&2
        exit 1
    fi
    if ! docker exec arcometal_nginx nginx -s reload; then
        cp "$backup" "$proxy"
        docker exec arcometal_nginx nginx -t && docker exec arcometal_nginx nginx -s reload
        exit 1
    fi
fi

# Real trust-chain checks: no --insecure and no borrowed certificate.
curl -fsS --retry 3 --retry-all-errors --retry-delay 1 --max-time 20 --resolve mangata.com.ar:443:127.0.0.1 https://mangata.com.ar/api/health
test "$(curl -sS --max-time 20 --resolve www.mangata.com.ar:443:127.0.0.1 -o /dev/null -w '%{http_code} %{redirect_url}' https://www.mangata.com.ar/)" = '301 https://mangata.com.ar/'
curl -fsS --max-time 25 https://mangata.com.ar/api/health

if [ ! -f "$ops/renewal-verified" ]; then
    if [ -f "$ops/last-renewal-test" ] && [ "$(($(date +%s) - $(stat -c %Y "$ops/last-renewal-test")))" -lt 1800 ]; then
        echo "WAIT: renewal test retry backoff; the website is already serving HTTPS."
        exit 0
    fi
    touch "$ops/last-renewal-test"
    /bin/sh "$ops/renew-certificate.sh" --dry-run
    touch "$ops/renewal-verified"
fi
install -m 0644 "$ops/mangata-cert-renew.service" /etc/systemd/system/mangata-cert-renew.service
install -m 0644 "$ops/mangata-cert-renew.timer" /etc/systemd/system/mangata-cert-renew.timer
systemctl daemon-reload
systemctl enable --now mangata-cert-renew.timer
systemctl is-enabled mangata-cert-renew.timer
date -u +%FT%TZ > "$ops/publication-complete"
echo "COMPLETE: https://mangata.com.ar on Hostinger; certificate renewal verified and scheduled."
systemctl disable --now mangata-publish.timer
