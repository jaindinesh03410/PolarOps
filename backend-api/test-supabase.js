import { supabase } from './src/config/supabase.js';

console.log('Testing Supabase connection...');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? 'Present' : 'Missing');

try {
  // Test simple query
  const { data, error } = await supabase
    .from('stations')
    .select('id, name')
    .limit(1);

  if (error) {
    console.error('❌ Supabase Error:', error);
  } else {
    console.log('✅ Supabase Connected!');
    console.log('Data:', data);
  }
} catch (err) {
  console.error('❌ Connection Failed:', err.message);
}
