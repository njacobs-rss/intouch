/**
 * =============================================================
 * FILE: Debug.js
 * PURPOSE: Inspect STATCORE structure and data to diagnose filter issues
 * =============================================================
 */

function debugStatcoreStructure() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('STATCORE');
  if (!sheet) {
    Logger.log('STATCORE sheet not found');
    return;
  }

  // 1. Read Headers (Row 2)
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
  
  Logger.log('--- STATCORE HEADERS (Row 2) ---');
  headers.forEach((h, i) => {
    const colLetter = columnToLetter_(i + 1);
    Logger.log(`${colLetter}: ${h}`);
  });

  // 2. Sample Data (Row 3)
  const sampleData = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
  Logger.log('\n--- SAMPLE ROW (Row 3) ---');
  headers.forEach((h, i) => {
    const colLetter = columnToLetter_(i + 1);
    Logger.log(`${colLetter} (${h}): ${sampleData[i]}`);
  });

  // 3. Check specific columns for "Wine Country" or "EXP"
  // Scan first 500 rows for "Wine Country" in any column to see where it lives
  const data = sheet.getRange(3, 1, 500, lastCol).getValues();
  let wineCountryFound = false;
  let expFound = false;

  Logger.log('\n--- SEARCH RESULTS (First 500 rows) ---');
  
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    
    // Check for Wine Country
    for (let c = 0; c < row.length; c++) {
      if (String(row[c]).toLowerCase().includes('wine country')) {
        Logger.log(`Found "Wine Country" in Row ${r+3}, Col ${columnToLetter_(c+1)} (${headers[c]}): ${row[c]}`);
        wineCountryFound = true;
      }
    }
    
    // Check for EXP in AG (Contract Alerts)
    // AG is index 32 (if A=0, but columnToLetter is 1-based, so index 32 is AG? No. 
    // A=1, Z=26, AA=27... AG=33. So index 32.)
    const agIndex = 32; 
    if (String(row[agIndex]).includes('EXP')) {
       Logger.log(`Found "EXP" in Row ${r+3}, Col AG (Contract Alerts): ${row[agIndex]}`);
       expFound = true;
    }
  }

  if (!wineCountryFound) Logger.log('WARNING: "Wine Country" not found in first 500 rows.');
  if (!expFound) Logger.log('WARNING: "EXP" not found in Col AG in first 500 rows.');
}

function columnToLetter_(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
