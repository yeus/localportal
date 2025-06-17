#!/usr/bin/env bash
set -e

# 1. Generate static site
hugo

# 2. Encrypt every HTML file in public/
find public -name '*.html' -print0 | xargs -0 -n1 pagecrypt encrypt \
  --password 'YOUR_SECRET_PASSWORD' \
  --extension .html \
  --in-place

echo "Built & encrypted! → public/"
