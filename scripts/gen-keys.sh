#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=${1:-apps/issuer/src/keys}
mkdir -p "$OUT_DIR"

PRIVATE_KEY="$OUT_DIR/private.pem"
PUBLIC_KEY="$OUT_DIR/public.pem"

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out "$PRIVATE_KEY"
openssl rsa -pubout -in "$PRIVATE_KEY" -out "$PUBLIC_KEY"

KID="rsa-$(date +%Y-%m-%d)"

echo "Generated RSA key pair:"
echo "  Private: $PRIVATE_KEY"
echo "  Public : $PUBLIC_KEY"
echo "Suggested JWT_KID: $KID"
