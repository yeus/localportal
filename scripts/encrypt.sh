#!/usr/bin/env bash
# Exit on error
set -e

# Require passphrase
: "${PAGECRYPT_PASSWORD:?Need to set PAGECRYPT_PASSWORD}"

# Encrypt every .html in public/
find public -type f -name '*.html' | while read -r page; do
  # in‑place encrypt: overwrite page with encrypted version
  pagecrypt "$page" "$page" "$PAGECRYPT_PASSWORD"  # :contentReference[oaicite:0]{index=0}
done
