#!/usr/bin/env bash
# Start a new product from the template.
# Usage: scripts/new-product.sh <product-name> ["Display Name"] [--standalone]
# Example: scripts/new-product.sh podcasting-gg "Podcasting.gg"
# Products are connected to the platform (GoHighLevel etc.) by default. Pass
# --standalone only for a product explicitly meant to stay separate.
set -euo pipefail

standalone=false
args=()
for a in "$@"; do
  if [[ "$a" == "--standalone" ]]; then standalone=true; else args+=("$a"); fi
done
name="${args[0]:-}"
display="${args[1]:-$name}"
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
if $standalone; then
  sed -i.bak -e "s/^\*\*Connection:\*\* .*/**Connection:** Standalone (does not connect to the platform)/" "$dest/README.md"
  sed -i.bak -e "s/^- Connected or standalone: Connected/- Connected or standalone: Standalone/" "$dest/PRODUCT.md"
fi
rm -f "$dest"/*.bak

echo "Created products/$name"
echo "Next: fill in products/$name/PRODUCT.md and add a row to products/README.md"
