/**
 * Script to run tests for the Chat Interface components
 * 
 * This script automatically runs all tests related to the Enhanced Chat Interface
 * components that we implemented in Phase 8.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔍 G.R.I.P. Chat Interface Tests Runner');
console.log('=======================================');
console.log('Running tests for Phase 8: Chat Interface Enhancement components');

try {
  // Define test patterns
  const testPatterns = [
    'src/tests/components/EnhancedChatInterface.test.tsx',
    'src/tests/components/ProjectContextDisplay.test.tsx',
    'src/tests/components/FilePreview.test.tsx',
    'src/tests/providers/EnhancedChatProvider.test.tsx',
    'src/tests/hooks/useEnhancedChat.test.tsx',
    'src/tests/integration/EnhancedChatSystem.test.tsx'
  ];

  // Verify test files exist
  const missingFiles = testPatterns.filter(pattern => !fs.existsSync(path.resolve(process.cwd(), pattern)));
  
  if (missingFiles.length > 0) {
    console.error('❌ Error: The following test files are missing:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }

  // Run component tests
  console.log('\n🧪 Running component tests...');
  testPatterns.slice(0, 3).forEach(pattern => {
    try {
      console.log(`\n📄 Running ${pattern}...`);
      execSync(`npx jest ${pattern} --colors`, { stdio: 'inherit' });
      console.log(`✅ ${pattern} passed!`);
    } catch (error) {
      console.error(`❌ ${pattern} failed!`);
      throw error;
    }
  });

  // Run provider and hook tests
  console.log('\n🧪 Running provider and hook tests...');
  testPatterns.slice(3, 5).forEach(pattern => {
    try {
      console.log(`\n📄 Running ${pattern}...`);
      execSync(`npx jest ${pattern} --colors`, { stdio: 'inherit' });
      console.log(`✅ ${pattern} passed!`);
    } catch (error) {
      console.error(`❌ ${pattern} failed!`);
      throw error;
    }
  });

  // Run integration tests
  console.log('\n🧪 Running integration tests...');
  try {
    console.log(`\n📄 Running ${testPatterns[5]}...`);
    execSync(`npx jest ${testPatterns[5]} --colors`, { stdio: 'inherit' });
    console.log(`✅ ${testPatterns[5]} passed!`);
  } catch (error) {
    console.error(`❌ ${testPatterns[5]} failed!`);
    throw error;
  }

  console.log('\n✅ All tests completed successfully!');
  console.log('\n📊 Test Summary:');
  console.log('  - Component Tests: 3 files');
  console.log('  - Provider & Hook Tests: 2 files');
  console.log('  - Integration Tests: 1 file');
  console.log('  - Total: 6 test files');

} catch (error) {
  console.error('\n❌ Some tests failed. Please check the output above for details.');
  process.exit(1);
} 