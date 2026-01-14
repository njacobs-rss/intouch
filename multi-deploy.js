/**
 * multi-deploy.js
 * Pushes code to multiple Google Apps Script projects defined in targets.json
 */
const fs = require('fs');
const { execSync } = require('child_process');

// 1. Configuration
const TARGETS_FILE = './targets.json';
const CLASP_CONFIG = './.clasp.json';

// 2. Read targets
if (!fs.existsSync(TARGETS_FILE)) {
  console.error(`❌ Error: ${TARGETS_FILE} not found.`);
  process.exit(1);
}
const targets = JSON.parse(fs.readFileSync(TARGETS_FILE, 'utf8'));

// 3. Backup original .clasp.json (The "Pull" Source)
if (!fs.existsSync(CLASP_CONFIG)) {
  console.error(`❌ Error: ${CLASP_CONFIG} not found. Please login and create one first.`);
  process.exit(1);
}
const originalConfig = fs.readFileSync(CLASP_CONFIG, 'utf8');

console.log(`🚀 Starting Multi-Deploy to ${targets.length} projects...`);

try {
  // 4. Loop through each target
  targets.forEach((target) => {
    console.log(`\n------------------------------------------------`);
    console.log(`📡 Preparing to push to: [${target.label}]`);
    console.log(`🆔 ID: ${target.scriptId}`);

    // A. Create temporary config object
    const tempConfig = JSON.parse(originalConfig);
    tempConfig.scriptId = target.scriptId;

    // B. Write to .clasp.json
    fs.writeFileSync(CLASP_CONFIG, JSON.stringify(tempConfig, null, 2));

    // C. Execute clasp push
    try {
      // stdio: 'inherit' lets you see the clasp output in real-time
      execSync('clasp push --force', { stdio: 'inherit' }); 
      console.log(`✅ Success: [${target.label}] updated.`);
    } catch (err) {
      console.error(`❌ Failed to push to [${target.label}]. Continuing to next...`);
    }
  });

} catch (e) {
  console.error("🔥 Critical Error during deployment script:", e);
} finally {
  // 5. Cleanup: ALWAYS restore the original .clasp.json
  // This runs even if the script crashes or errors out.
  console.log(`\n------------------------------------------------`);
  console.log(`🔄 Restoring original .clasp.json (Source of Truth)...`);
  fs.writeFileSync(CLASP_CONFIG, originalConfig);
  console.log(`✨ Multi-Deploy Complete!`);
}