#!/bin/sh
set -eu
exec 9>/run/lock/mangata-reconcile.lock
flock -n 9 || exit 0
docker exec -i mangata-web-1 node --input-type=module - reconcile < /opt/mangata/current/deploy/commerce-ops.mjs
