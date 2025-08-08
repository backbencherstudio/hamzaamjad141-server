#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const keyFilePath = path.join(__dirname, '../config/gcs-key.json');

console.log('🧹 GCS Key Cleanup Script');
console.log('========================');

// Check if the key file exists
if (fs.existsSync(keyFilePath)) {
  try {
    // Read and parse the key file to show some info
    const keyContent = JSON.parse(fs.readFileSync(keyFilePath, 'utf8'));
    
    console.log(`📁 Found key file: ${keyFilePath}`);
    console.log(`📧 Service account: ${keyContent.client_email || 'Unknown'}`);
    console.log(`🏗️  Project: ${keyContent.project_id || 'Unknown'}`);
    
    // Prompt for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('❓ Do you want to delete this key file? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          fs.unlinkSync(keyFilePath);
          console.log('✅ Key file deleted successfully!');
          console.log('💡 Make sure you have set up environment variables for GCS authentication.');
          console.log('📖 See docs/GCS_SETUP.md for configuration instructions.');
        } catch (error) {
          console.error('❌ Error deleting key file:', error.message);
        }
      } else {
        console.log('⏭️  Key file kept. No changes made.');
      }
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ Error reading key file:', error.message);
    console.log('🗑️  The file appears to be corrupted. You may want to delete it manually.');
  }
} else {
  console.log('✅ No key file found. Already cleaned up!');
}

console.log('\n📚 Resources:');
console.log('- Configuration guide: docs/GCS_SETUP.md');
console.log('- Environment template: env.example');
console.log('- Test GCS: GET /system/test-gcs (ADMIN only)');
