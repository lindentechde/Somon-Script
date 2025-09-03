#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧪 Running Somoni-script Examples\n');

const examplesDir = path.join(__dirname, '..', 'examples');
const cliPath = path.join(__dirname, '..', 'dist', 'cli.js');

if (!fs.existsSync(examplesDir)) {
  console.log('❌ Examples directory not found');
  process.exit(1);
}

if (!fs.existsSync(cliPath)) {
  console.log('❌ CLI not built. Run "npm run build" first.');
  process.exit(1);
}

const examples = fs.readdirSync(examplesDir)
  .filter(file => file.endsWith('.som'))
  .sort();

if (examples.length === 0) {
  console.log('❌ No .som example files found');
  process.exit(1);
}

let successCount = 0;
let totalCount = examples.length;

examples.forEach(example => {
  const examplePath = path.join(examplesDir, example);
  const outputPath = path.join(examplesDir, example.replace('.som', '.js'));
  
  console.log(`📝 Testing ${example}:`);
  
  try {
    // Compile the example
    const command = `node "${cliPath}" compile "${examplePath}" --strict`;
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    
    // Check if output file was created
    if (fs.existsSync(outputPath)) {
      const jsContent = fs.readFileSync(outputPath, 'utf8');
      console.log(`   ✅ Compiled successfully (${jsContent.length} chars)`);
      
      // Show first few lines of output
      const lines = jsContent.split('\n').slice(0, 3);
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`   📄 ${line.trim()}`);
        }
      });
      
      successCount++;
    } else {
      console.log(`   ❌ Output file not created`);
    }
    
  } catch (error) {
    console.log(`   ❌ Compilation failed:`);
    console.log(`   📋 ${error.message.split('\n')[0]}`);
  }
  
  console.log('');
});

// Summary
console.log('📊 Summary:');
console.log(`   ✅ Successful: ${successCount}/${totalCount}`);
console.log(`   ❌ Failed: ${totalCount - successCount}/${totalCount}`);
console.log(`   📈 Success rate: ${(successCount / totalCount * 100).toFixed(1)}%`);

if (successCount === totalCount) {
  console.log('\n🎉 All examples compiled successfully!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some examples failed to compile');
  process.exit(1);
}