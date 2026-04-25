const res = await fetch('https://dashboard-calendar-event.vercel.app/assets/index-BlbdIGHq.js');
const code = await res.text();

// Check Supabase URL
const urlIdx = code.indexOf('xddqinydbuargyfseycw');
if (urlIdx >= 0) {
  console.log('Supabase URL context:');
  console.log(code.slice(Math.max(0, urlIdx - 30), urlIdx + 80));
}

// Check anon key
const keyIdx = code.indexOf('sb_publishable');
if (keyIdx >= 0) {
  console.log('\nAnon key found!');
  console.log(code.slice(Math.max(0, keyIdx - 30), keyIdx + 80));
} else {
  console.log('\nAnon key NOT found. Checking for other keys...');
  const jwtIdx = code.indexOf('eyJhbGciOiJIUzI1NiIs');
  if (jwtIdx >= 0) {
    console.log('JWT key found (service_role?) at:', jwtIdx);
    console.log(code.slice(Math.max(0, jwtIdx - 30), jwtIdx + 50));
  }
}

// Check URL doesn't have /events appended
const badUrl = code.includes('supabase.co/events');
console.log('\nHas bad URL (supabase.co/events):', badUrl);
const goodUrl = code.includes('supabase.co"') || code.includes("supabase.co'");
console.log('Has good URL (supabase.co):', goodUrl);
