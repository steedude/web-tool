#!/usr/bin/env bash
set -euo pipefail

archive="${1:?release archive is required}"
release_id="${2:?release id is required}"
release_dir="/srv/web-tool/releases/${release_id}"

install -d -o ubuntu -g ubuntu /srv/web-tool/releases
install -d -o ubuntu -g ubuntu "${release_dir}"
tar -xzf "${archive}" -C "${release_dir}"
chown -R ubuntu:ubuntu "${release_dir}"
ln -sfn "${release_dir}" /srv/web-tool/current

systemctl restart web-tool-realtime
rm -f "${archive}"
