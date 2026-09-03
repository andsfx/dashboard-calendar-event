#!/usr/bin/env bash
# autoresearch harness: ukur bundle produksi Vite secara deterministik.
# Workload: tsc && vite build (tanpa network setelah npm install; hash nama file
# bergantung isi, jadi ukuran deterministik). Primary metric: bundle_js_kb.
set -euo pipefail
cd "$(dirname "$0")"

t0=$(date +%s)
npm run build >/dev/null
t1=$(date +%s)

node autoresearch.metrics.mjs
echo "METRIC build_ms=$(( (t1 - t0) * 1000 ))"
