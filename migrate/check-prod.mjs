// Check production deployment
const res = await fetch('https://dashboard-calendar-event.vercel.app');
const html = await res.text();

console.log('HTML length:', html.length);

// Check JS bundle hash
const jsMatch = html.match(/index-([^.]+)\.js/);
console.log('JS bundle hash:', jsMatch ? jsMatch[1] : 'not found');

// The latest local build hash
const fs = await import('fs');
const distHtml = fs.readFileSync('dist/index.html', 'utf-8');
const localMatch = distHtml.match(/index-([^.]+)\.js/);
console.log('Local build hash:', localMatch ? localMatch[1] : 'not found');
console.log('Hashes match:', jsMatch?.[1] === localMatch?.[1]);
