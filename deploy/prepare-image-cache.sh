#!/bin/sh
set -eu

volume=mangata_next_image_cache
docker volume inspect "$volume" >/dev/null 2>&1 || docker volume create "$volume" >/dev/null
# The production image runs as uid/gid 1001. Prepare the persistent optimizer
# cache without granting the storefront container root privileges.
docker run --rm --user 0 -v "$volume:/cache" node:24-alpine chown 1001:1001 /cache
