// Test script untuk cek error runtime di Letter Generator
// Run dengan: node test-runtime.mjs

import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

console.log('🔍 Testing Letter Generator runtime...\n');

// Test 1: Cek apakah LetterDocument bisa diimport
console.log('Test 1: Import LetterDocument...');
try {
  const { LetterDocument } = await import('./src/components/pdf/LetterDocument.tsx');
  console.log('✅ LetterDocument imported successfully');
} catch (err) {
  console.log('❌ Error importing LetterDocument:', err.message);
}

// Test 2: Cek apakah letterPdfExport bisa diimport
console.log('\nTest 2: Import letterPdfExport...');
try {
  const pdfExport = await import('./src/utils/letterPdfExport.tsx');
  console.log('✅ letterPdfExport imported successfully');
  console.log('   Available exports:', Object.keys(pdfExport));
} catch (err) {
  console.log('❌ Error importing letterPdfExport:', err.message);
}

// Test 3: Cek apakah Editable components bisa diimport
console.log('\nTest 3: Import Editable components...');
try {
  const editable = await import('./src/components/ui/Editable.tsx');
  console.log('✅ Editable imported successfully');
  console.log('   Available exports:', Object.keys(editable));
} catch (err) {
  console.log('❌ Error importing Editable:', err.message);
}

// Test 4: Cek apakah @react-pdf/renderer terinstall
console.log('\nTest 4: Check @react-pdf/renderer...');
try {
  const pkg = await import('@react-pdf/renderer/package.json', { with: { type: 'json' } });
  console.log('✅ @react-pdf/renderer version:', pkg.default.version);
} catch (err) {
  console.log('❌ Error checking @react-pdf/renderer:', err.message);
}

console.log('\n✅ All tests completed');
