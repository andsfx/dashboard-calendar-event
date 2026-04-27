import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://xddqinydbuargyfseycw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkZHFpbnlkYnVhcmd5ZnNleWN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MTU0NjAsImV4cCI6MjA5MDA5MTQ2MH0.TNUxkAO9v20TCM-HuIdCbT5Wgs2FgZ4SpQcsU9vYuIU'
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'andotherstori@gmail.com',
  password: '1Dontlikeyou'
});

console.log('Data:', JSON.stringify(data, null, 2));
console.log('Error:', JSON.stringify(error, null, 2));
