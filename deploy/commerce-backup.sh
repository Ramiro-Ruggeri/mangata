#!/bin/sh
set -eu
umask 077
dir=/opt/mangata/backups/commerce
mkdir -p "$dir"
file="$dir/mangata-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker exec mangata_db pg_dump -U mangata_bootstrap -d mangata -Fc > "$file.partial"
test -s "$file.partial"
docker exec -i mangata_db pg_restore --list < "$file.partial" > /dev/null
mv "$file.partial" "$file"
echo 'MANGATA database backup completed and archive validated.'
# Retention/off-site destination require an explicit operational policy. No auto-delete.
