// Check if production bundle has Supabase URL embedded
const res = await fetch('https://dashboard-calendar-event.vercel.app/assets/index-DsEV83TG.js');
const text = await res.text();

console.log('Bundle size:', text.length, 'chars');
console.log('Has Supabase URL:', text.includes('xddqinydbuargyfseycw.supabase.co'));
console.log('Has Apps Script URL:', text.includes('script.google.com'));
console.log('Has "supabase" word:', text.includes('supabase'));
console.log('Has "sheetsApi" word:', text.includes('sheetsApi'));
console.log('Has empty string for URL:', text.includes('createClient(""'));

// Find any URL-like strings near createClient
const idx = text.indexOf('createClient');
if (idx >= 0) {
  console.log('\ncreateClient context:', text.slice(Math.max(0, idx - 50), idx + 200));
}
