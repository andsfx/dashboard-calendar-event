#!/usr/bin/env bash
# autoresearch harness: ukur bundle produksi Vite secara deterministik.
# Workload: tsc && vite build (nama file hash mengikuti isi → ukuran deterministik).
# Hanya pakai bash builtin + npm/node agar jalan di shim bash minimal (tanpa coreutils).
# Primary metric: bundle_js_kb.
set -euo pipefail
case "$0" in */*) cd "${0%/*}" || exit 1 ;; esac

t0=$SECONDS
npm run build >/dev/null
echo "METRIC build_ms=$(( (SECONDS - t0) * 1000 ))"

node autoresearch.metrics.mjs
