// Pembaca METRIC untuk autoresearch.sh: total ukuran JS/CSS di dist/assets.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const dir = fileURLToPath(new URL('dist/assets/', import.meta.url));
const entries = readdirSync(dir);

let js = 0;
let jsGzip = 0;
let css = 0;
for (const name of entries) {
  if (!name.endsWith('.js') && !name.endsWith('.css')) continue;
  const path = join(dir, name);
  if (!statSync(path).isFile()) continue;
  const raw = readFileSync(path);
  if (name.endsWith('.js')) {
    js += raw.length;
    jsGzip += gzipSync(raw).length;
  } else {
    css += raw.length;
  }
}

if (js === 0) {
  console.error('dist/assets kosong — build gagal?');
  process.exit(1);
}

const kb = (n) => (n / 1024).toFixed(2);
console.log(`METRIC bundle_js_kb=${kb(js)}`);
console.log(`METRIC bundle_js_gzip_kb=${kb(jsGzip)}`);
console.log(`METRIC bundle_css_kb=${kb(css)}`);
