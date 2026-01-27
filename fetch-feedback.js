/**
 * fetch-feedback.js
 * Fetches AI chat feedback from the deployed GAS web app and saves locally
 * 
 * SETUP (one-time):
 * 1. Push code to Apps Script: npm run push:master
 * 2. In Apps Script editor, click Deploy > New deployment
 * 3. Select "Web app", Execute as "Me", Access "Anyone with link"
 * 4. Copy the web app URL and paste below
 * 5. Run: npm run export-feedback
 * 
 * USAGE:
 * npm run export-feedback
 * Then prompt Cursor: "Review @feedback.json and suggest improvements to the AI system instructions"
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// ============================================
// CONFIGURATION - Update this after deploying
// ============================================
const WEB_APP_URL = 'YOUR_WEB_APP_URL_HERE'; // e.g., https://script.google.com/macros/s/ABC123.../exec
const AUTH_KEY = 'intouch-feedback-export';
const OUTPUT_FILE = path.join(__dirname, 'feedback.json');

// ============================================
// MAIN FETCH LOGIC
// ============================================
function fetchFeedback() {
  if (WEB_APP_URL === 'YOUR_WEB_APP_URL_HERE') {
    console.error('\n❌ ERROR: Web app URL not configured!');
    console.log('\nSetup steps:');
    console.log('1. Run: npm run push:master');
    console.log('2. Open Apps Script editor');
    console.log('3. Deploy > New deployment > Web app');
    console.log('4. Copy the URL and paste in fetch-feedback.js (line 21)\n');
    process.exit(1);
  }

  const url = `${WEB_APP_URL}?key=${AUTH_KEY}`;
  
  console.log('📥 Fetching feedback from GAS web app...');
  
  // Handle Google's redirect
  const fetchWithRedirect = (targetUrl, redirectCount = 0) => {
    if (redirectCount > 5) {
      console.error('❌ Too many redirects');
      process.exit(1);
    }

    const protocol = targetUrl.startsWith('https') ? https : require('http');
    
    protocol.get(targetUrl, (res) => {
      // Handle redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log('↪️  Following redirect...');
        fetchWithRedirect(res.headers.location, redirectCount + 1);
        return;
      }

      if (res.statusCode !== 200) {
        console.error(`❌ HTTP Error: ${res.statusCode}`);
        process.exit(1);
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const feedback = JSON.parse(data);
          
          if (feedback.error) {
            console.error(`❌ API Error: ${feedback.error}`);
            process.exit(1);
          }
          
          // Write to local file
          fs.writeFileSync(OUTPUT_FILE, JSON.stringify(feedback, null, 2));
          
          const count = Array.isArray(feedback) ? feedback.length : 0;
          console.log(`✅ Saved ${count} feedback items to feedback.json`);
          
          if (count > 0) {
            console.log('\n💡 Next step:');
            console.log('   Prompt Cursor: "Review @feedback.json and suggest improvements to INTOUCH_SYSTEM_INSTRUCTION in @InTouchGuide.js"\n');
          } else {
            console.log('\nℹ️  No feedback requiring review. All good!\n');
          }
          
        } catch (e) {
          console.error('❌ Failed to parse response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          process.exit(1);
        }
      });
    }).on('error', (e) => {
      console.error('❌ Request failed:', e.message);
      process.exit(1);
    });
  };

  fetchWithRedirect(url);
}

// Run
fetchFeedback();
