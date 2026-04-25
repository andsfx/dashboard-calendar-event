// Download and inspect the actual production JS bundle
const htmlRes = await fetch('https://dashboard-calendar-event.vercel.app');
const html = await htmlRes.text();

// Get all JS bundle URLs
const jsFiles = [...html.matchAll(/src="\/assets\/([^"]+\.js)"/g)].map(m => m[1]);
const preloads = [...html.matchAll(/href="\/assets\/([^"]+\.js)"/g)].map(m => m[1]);
const allJs = [...new Set([...jsFiles, ...preloads])];

console.log('JS bundles:', allJs);

// Check the main index bundle for Supabase URL
for (const file of allJs) {
  if (!file.startsWith('index-')) continue;
  
  const res = await fetch(`https://dashboard-calendar-event.vercel.app/assets/${file}`);
  const code = await res.text();
  
  // Find the Supabase URL in the bundle
  const urlMatch = code.match(/xddqinydbuargyfseycw\.supabase\.co/);
  console.log(`\n${file}:`);
  console.log('  Has Supabase URL:', !!urlMatch);
  
  // Find createClient call context
  const createIdx = code.indexOf('createClient');
  if (createIdx >= 0) {
    const context = code.slice(Math.max(0, createIdx - 100), createIdx + 300);
    console.log('  createClient context:', context.slice(0, 400));
  }
  
  // Check for error messages
  const errorMsg = code.includes('Gagal memuat data event');
  console.log('  Has error message:', errorMsg);
  
  // Check for sheetsApi references
  console.log('  Has sheetsApi:', code.includes('sheetsApi'));
  console.log('  Has supabaseApi:', code.includes('supabaseApi'));
  console.log('  Has apps-script:', code.includes('apps-script'));
  console.log('  Has /api/supabase-admin:', code.includes('/api/supabase-admin'));
  console.log('  Has /rest/v1/:', code.includes('/rest/v1/'));
  
  // Check for "from(" which is Supabase query pattern
  const fromEvents = code.includes('.from("events")') || code.includes(".from('events')");
  console.log('  Has .from("events"):', fromEvents);
}
