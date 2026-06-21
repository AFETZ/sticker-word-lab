#!/usr/bin/env bash
set -Eeuo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

mkdir -p backups
archive="backups/sticker-word-lab-data-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"

tar -czf "$archive" backend/data
echo "$archive"
