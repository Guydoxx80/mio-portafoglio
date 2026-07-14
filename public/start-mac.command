#!/bin/sh
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  open "Apri App.html"
  exit 0
fi
node local-server.cjs 4173
