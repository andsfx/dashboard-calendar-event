const res = await fetch('https://dashboard-calendar-event.vercel.app/assets/index-DsEV83TG.js');
const code = await res.text();

// Find all occurrences of the Supabase URL
let idx = 0;
let count = 0;
while (true) {
  idx = code.indexOf('xddqinydbuargyfseycw', idx);
  if (idx < 0) break;
  count++;
  const context = code.slice(Math.max(0, idx - 80), idx + 120);
  console.log(`\nOccurrence ${count} at position ${idx}:`);
  console.log(context);
  console.log('---');
  idx += 20;
}
console.log(`\nTotal occurrences: ${count}`);

// Also check for the anon key
const keyIdx = code.indexOf('sb_publishable');
if (keyIdx >= 0) {
  console.log('\nAnon key found at position', keyIdx);
  console.log(code.slice(Math.max(0, keyIdx - 50), keyIdx + 100));
} else {
  console.log('\nAnon key NOT FOUND in bundle!');
  
  // Check for empty string near createClient
  const createIdx = code.indexOf('createClient');
  if (createIdx >= 0) {
    console.log('\ncreateClient at position', createIdx);
    console.log(code.slice(createIdx, createIdx + 200));
  }
}
