#!/usr/bin/env bash
# Start a new product from the template.
# Usage: scripts/new-product.sh <product-name> ["Display Name"]
# Example: scripts/new-product.sh podcasting-gg "Podcasting.gg"
set -euo pipefail

name="${1:-}"
display="${2:-$name}"
root="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! "$name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
  echo "Product name must be lowercase words joined by dashes, e.g. lead-tracker" >&2
  exit 1
fi

dest="$root/products/$name"
if [[ -e "$dest" ]]; then
  echo "products/$name already exists" >&2
  exit 1
fi

cp -R "$root/products/_template" "$dest"
sed -i.bak -e "s/Product name/$display/" -e "s#<product-name>#$name#" \
  "$dest/README.md" "$dest/PRODUCT.md"
rm -f "$dest"/*.bak

echo "Created products/$name"
echo "Next: fill in products/$name/PRODUCT.md and add a row to products/README.md"
